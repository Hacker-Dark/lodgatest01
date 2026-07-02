import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import * as dbQueries from '../models/queries.js';
import { PropertyCreateSchema } from '../../../shared/validators/schemas.js';

const router = Router();

// Secure role access to caretakers, landlords, and administrators
router.use(authenticateToken, requireRole(['caretaker', 'landlord', 'admin']));

/**
 * GET /api/caretaker/properties
 * Retrieve all listings hosted by current caretaker.
 */
router.get('/properties', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const contact = await dbQueries.findContactByUserId(req.user!.user_id);
    if (!contact) {
      res.status(200).json([]);
      return;
    }

    const properties = await dbQueries.getPropertiesForCaretaker(contact.contact_id);
    res.status(200).json(properties);
  } catch (error) {
    console.error('Caretaker fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve caretaker listings.' });
  }
});

/**
 * POST /api/caretaker/properties
 * Creates a property in 'Under Verification' status. Requires minimum 8 files.
 */
router.post('/properties', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const contact = await dbQueries.findContactByUserId(req.user!.user_id);
    if (!contact) {
      res.status(403).json({ error: 'Caretaker contact profile has not been configured in the directory.' });
      return;
    }

    // Insert caretaker contact id if missing in client payload
    const payload = {
      ...req.body,
      caretaker_id: contact.contact_id
    };

    const parseResult = PropertyCreateSchema.safeParse(payload);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const newProperty = await dbQueries.createProperty(parseResult.data);
    res.status(201).json({
      message: 'Property uploaded successfully. It is now queued for physical inspection check.',
      property: newProperty
    });
  } catch (error) {
    console.error('Add Property Error:', error);
    res.status(500).json({ error: 'Failed to create listing record.' });
  }
});

/**
 * PUT /api/caretaker/properties/:id
 * Updates property details (coordinates, landmarks, bedroom metrics, photos).
 */
router.put('/properties/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const property = await dbQueries.findPropertyById(id);

    if (!property) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }

    const contact = await dbQueries.findContactByUserId(req.user!.user_id);
    if (!contact || property.caretaker_id !== contact.contact_id) {
      res.status(403).json({ error: 'Unauthorized edit action on another hosts listing.' });
      return;
    }

    // Merge previous and new fields
    const updated = await dbQueries.createOrUpdateVerificationCheck({
      ...req.body,
      property_id: id
    } as any);

    res.status(200).json({ message: 'Listing has been edited successfully.', property: updated });
  } catch (error) {
    console.error('Update Property Error:', error);
    res.status(500).json({ error: 'Failed to update property details.' });
  }
});

/**
 * GET /api/caretaker/transactions
 * Retrieve transactions / placement files relating to this host.
 */
router.get('/transactions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const transactions = await dbQueries.getTransactions('caretaker', req.user!.user_id);
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Caretaker transactions fetch error:', error);
    res.status(500).json({ error: 'Failed to query student placements.' });
  }
});

/**
 * POST /api/caretaker/renewal/:ping_id
 * Respond to lease expiration caretaker alerts.
 */
router.post('/renewal/:ping_id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ping_id } = req.params;
    const { response } = req.body; // 'Available' or 'Not Available'

    if (!response || !['Available', 'Not Available'].includes(response)) {
      res.status(400).json({ error: "Invalid reaction body. Must specify 'Available' or 'Not Available'." });
      return;
    }

    const updatedPing = await dbQueries.respondRenewalPing(ping_id, response);
    if (!updatedPing) {
      res.status(404).json({ error: 'Renewal request file not found.' });
      return;
    }

    // If caretaker confirms Available, Listing re-enters Verification queue
    if (response === 'Available') {
      await dbQueries.updatePropertyAvailability(updatedPing.property_id, 'Under Verification');
    }

    res.status(200).json({
      message: `Thank you for your response! Feedback recorded as [${response}].`,
      ping: updatedPing
    });
  } catch (error) {
    console.error('Caretaker renewal reaction error:', error);
    res.status(500).json({ error: 'Failed to process renewal feedback.' });
  }
});

export default router;
