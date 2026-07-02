import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import * as dbQueries from '../models/queries.js';
import { initiatePaystackPayment } from '../config/paystack.js';
import { calculatePricing, releaseEscrowToLandlord } from '../services/businessLogic.js';
import { createAuditLog } from '../services/audit.js';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/transactions/initiate
 * Initializes a new checkout. Creates transaction in "Held" state, locks listings status, and retrieves Paystack checkout URL.
 */
router.post('/initiate', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { property_id, inspection_waiver, move_in_date } = req.body;
    const student = req.user;

    if (!student) {
      res.status(401).json({ error: 'Session authentication required.' });
      return;
    }

    if (!property_id) {
      res.status(400).json({ error: 'Property ID is required.' });
      return;
    }

    const property = await dbQueries.findPropertyById(property_id);
    if (!property) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }

    if (property.availability !== 'Available') {
      res.status(400).json({ error: `This property is currently not available: status ${property.availability}` });
      return;
    }

    // Inspection fees is N3,000 if select (or waived)
    const inspectionFee = inspection_waiver ? 0.0 : 3000.0;
    const pricing = calculatePricing(Number(property.landlord_rent));

    const totalToPayInKobo = Math.round((pricing.totalListedPrice + inspectionFee) * 100);
    const reference = `LODGA_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Build self callback url pointing to dev server
    const callbackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/payment-callback?ref=${reference}`;

    const paystackResult = await initiatePaystackPayment(
      student.email || `${student.phone}@lodga.co`,
      totalToPayInKobo,
      reference,
      callbackUrl
    );

    // Persist temporary transaction in database
    const transaction = await dbQueries.createTransaction({
      property_id,
      student_id: student.user_id,
      landlord_rent: pricing.landlordRent,
      connection_fee: pricing.connectionFee,
      inspection_fee: inspectionFee,
      paystack_reference: reference,
      inspect_waiver: !!inspection_waiver,
      move_in_date: move_in_date || new Date().toISOString().split('T')[0]
    });

    // Record audit event
    await createAuditLog(student.user_id, 'PAYMENT_INITIATED', {
      property_id,
      transaction_id: transaction.transaction_id,
      landlord_rent: pricing.landlordRent,
      connection_fee: pricing.connectionFee,
      inspection_fee: inspectionFee,
      total_paid: pricing.totalListedPrice + inspectionFee,
      paystack_reference: reference,
      ip_address: req.ip || 'unknown'
    });

    res.status(200).json({
      message: 'Transaction initialized',
      transaction_id: transaction.transaction_id,
      authorization_url: paystackResult.authorization_url,
      reference: paystackResult.reference
    });
  } catch (error) {
    console.error('Initiate Transaction Error:', error);
    res.status(500).json({ error: 'Could not initialize gateway request.' });
  }
});

/**
 * GET /api/transactions/:id
 * Retrieve details for a specific transaction (Student only gets own, Admin/Caretaker gets assigned).
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const tx = await dbQueries.findTransactionById(req.params.id);

    if (!tx) {
      res.status(404).json({ error: 'Transaction record not found.' });
      return;
    }

    // Role gate
    if (user.user_type === 'student' && tx.student_id !== user.user_id) {
      res.status(403).json({ error: 'Unauthorized key query.' });
      return;
    }

    // Fetch contact detail for student if payment is Held/Released (unlocked!)
    let caretakerContact = null;
    if (tx.escrow_status === 'Held' || tx.escrow_status === 'Released') {
      const property = await dbQueries.findPropertyById(tx.property_id);
      if (property) {
        caretakerContact = await dbQueries.findContactById(property.caretaker_id);
      }
    }

    res.status(200).json({
      ...tx,
      caretaker_contact: caretakerContact
    });
  } catch (error) {
    console.error('Fetch Transaction error:', error);
    res.status(500).json({ error: 'Internal record query error' });
  }
});

/**
 * POST /api/transactions/:id/feedback
 * Submit ratings and reviews.
 */
router.post('/:id/feedback', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rating, feedback_text } = req.body;
    const tx = await dbQueries.findTransactionById(req.params.id);

    if (!tx) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    if (tx.student_id !== req.user!.user_id) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    // 1. Log feedback in the transaction
    const updatedTx = await dbQueries.updateTransactionFeedback(req.params.id, Number(rating), feedback_text || '');
    
    // 2. Automatically release the escrow to the landlord
    await releaseEscrowToLandlord(req.params.id);

    // 3. Automatically submit as a public property review
    try {
      await dbQueries.createPropertyReview(
        tx.property_id,
        req.user!.user_id,
        req.user!.full_name || 'Anonymous Student',
        Number(rating),
        feedback_text || 'Completed physical move-in audit successfully.'
      );
    } catch (err) {
      console.error('Failed to auto-create property review:', err);
    }

    res.status(200).json({ 
      message: 'Feedback logged, escrow released, and public community review published!', 
      transaction: { ...updatedTx, escrow_status: 'Released' } 
    });
  } catch (error) {
    console.error('Feedback Error:', error);
    res.status(500).json({ error: 'Could not log student review.' });
  }
});

/**
 * POST /api/transactions/:id/dispute
 * Raise escrow disputes within the 48hr window, locking payments.
 */
router.post('/:id/dispute', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    const tx = await dbQueries.findTransactionById(req.params.id);

    if (!tx) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    if (tx.student_id !== req.user!.user_id) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }

    // Check if within 48h limit of move_in_date
    const moveInDateObj = new Date(tx.move_in_date);
    const disputeDeadline = new Date(moveInDateObj.getTime() + 48 * 60 * 60 * 1000);
    if (new Date() > disputeDeadline) {
      res.status(400).json({ error: 'Dispute window expired. Disputes must be filed within 48 hours of your move-in date.' });
      return;
    }

    const updatedTx = await dbQueries.updateTransactionDispute(req.params.id, 'Yes — Pending');

    // Record audit event
    await createAuditLog(req.user!.user_id, 'DISPUTE_RAISED', {
      transaction_id: tx.transaction_id,
      property_id: tx.property_id,
      dispute_reason: reason || 'Not specified',
      ip_address: req.ip || 'unknown'
    });

    res.status(200).json({
      message: 'Your dispute has been logged successfully. Lodga support will contact you within 24 hours. Escrow locked.',
      transaction: updatedTx
    });
  } catch (error) {
    console.error('Dispute filing error:', error);
    res.status(500).json({ error: 'Failed to file escrow dispute.' });
  }
});

/**
 * POST /api/transactions/webhook
 * Paystack payment verification signature webhook.
 */
router.post('/webhook', async (req, res): Promise<void> => {
  try {
    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || 'lodga-local-webhook-secret';
    const paystackSignature = req.headers['x-paystack-signature'];

    // Verify cryptographic signature (only if non-mock mode)
    if (paystackSignature && webhookSecret && webhookSecret !== 'lodga-local-webhook-secret') {
      const hash = crypto
        .createHmac('sha512', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== paystackSignature) {
        res.status(400).json({ error: 'Invalid cryptographic signature check failed.' });
        return;
      }
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const tx = await dbQueries.findTransactionByReference(reference);

      if (tx) {
        // Complete transaction, update property status to Taken
        await dbQueries.updateTransactionEscrow(tx.transaction_id, 'Held');
        await dbQueries.updatePropertyAvailability(tx.property_id, 'Taken');
        
        // Record audit event
        await createAuditLog(tx.student_id, 'PAYMENT_COMPLETED', {
          property_id: tx.property_id,
          transaction_id: tx.transaction_id,
          paystack_reference: reference,
          landlord_rent: tx.landlord_rent,
          connection_fee: tx.connection_fee,
          inspection_fee: tx.inspection_fee,
          total_paid: Number(tx.landlord_rent) + Number(tx.connection_fee) + Number(tx.inspection_fee)
        });

        console.log(`[Paystack Webhook] Reference ${reference} paid successfully. Property ${tx.property_id} marked as Taken.`);
      }
    }

    res.status(200).send('Webhook Received');
  } catch (error) {
    console.error('Paystack Webhook Handling Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
