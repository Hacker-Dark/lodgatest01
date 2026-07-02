import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import * as dbQueries from '../models/queries.js';
import { enforceVerificationGate, releaseEscrowToLandlord, processRefundToStudent, isVerificationCheckPassed } from '../services/businessLogic.js';

const router = Router();

// Full administrator lockdown gate
router.use(authenticateToken, requireRole(['admin']));

/**
 * GET /api/admin/properties
 * Retrieve all properties, including sensitive rent values for audit inspection.
 */
router.get('/properties', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const properties = await dbQueries.getProperties({});
    // Fetch related verification checklist file status for all properties
    const verifiedProperties = await Promise.all(
      properties.map(async (p) => {
        const check = await dbQueries.getVerificationCheckForProperty(p.property_id);
        return {
          ...p,
          verification_check: check
        };
      })
    );
    res.status(200).json(verifiedProperties);
  } catch (error) {
    console.error('Admin Fetch Properties Error:', error);
    res.status(500).json({ error: 'Failed to retrieve listings ledger.' });
  }
});

/**
 * PUT /api/admin/properties/:id/verify
 * Update verification checklist scores for 7 distinct parameters.
 */
router.put('/properties/:id/verify', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      visit_date,
      item_1_physical_visit,
      item_2_photos,
      item_3_id_verified,
      item_4_ownership,
      item_5_pricing,
      item_6_amenities,
      item_7_feedback,
      item_8_location_pinned,
      notes
    } = req.body;

    const property = await dbQueries.findPropertyById(id);
    if (!property) {
      res.status(404).json({ error: 'Property record does not exist.' });
      return;
    }

    const checklist = {
      property_id: id,
      caretaker_id: property.caretaker_id,
      visit_date: visit_date || new Date().toISOString().split('T')[0],
      item_1_physical_visit: item_1_physical_visit || 'Pending',
      item_2_photos: item_2_photos || 'Pending',
      item_3_id_verified: item_3_id_verified || 'Pending',
      item_4_ownership: item_4_ownership || 'Pending',
      item_5_pricing: item_5_pricing || 'Pending',
      item_6_amenities: item_6_amenities || 'Pending',
      item_7_feedback: item_7_feedback || 'Pending',
      item_8_location_pinned: item_8_location_pinned || 'Pending',
      notes,
    };

    // Calculate overall status
    const passed = isVerificationCheckPassed(checklist);
    const overall_status = passed ? 'Passed' : 'Incomplete';

    const checkRecord = await dbQueries.createOrUpdateVerificationCheck({
      ...checklist,
      overall_status
    });

    res.status(200).json({
      message: passed ? 'Physical check PASSED. This property can now go LIVE.' : 'Checklist saved, but items are pending or failing.',
      verification_check: checkRecord
    });
  } catch (error) {
    console.error('Update verification checks error:', error);
    res.status(500).json({ error: 'Failed to record checklist update.' });
  }
});

/**
 * PUT /api/admin/properties/:id/availability
 * Sets properties status constraint gate checks. Returns 403 on unverified actions.
 */
router.put('/properties/:id/availability', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { availability } = req.body; // 'Available', 'Taken', 'Suspended'

    if (!availability || !['Available', 'Taken', 'Suspended', 'Under Verification'].includes(availability)) {
      res.status(400).json({ error: 'Invalid availability state.' });
      return;
    }

    const property = await dbQueries.findPropertyById(id);
    if (!property) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }

    // ENFORCE THE VERIFICATION SENSITIVE GATE
    if (availability === 'Available') {
      const gateResult = await enforceVerificationGate(id);
      if (!gateResult.success) {
        res.status(403).json({
          error: `Verification Check Gating Failure: ${gateResult.message}`
        });
        return;
      }
    }

    const updatedProperty = await dbQueries.updatePropertyAvailability(id, availability);
    res.status(200).json({
      message: `Property availability updated successfully to [${availability}].`,
      property: updatedProperty
    });
  } catch (error) {
    console.error('Verify Gate Availability Error:', error);
    res.status(500).json({ error: 'Failed to update properties availability status.' });
  }
});

/**
 * GET /api/admin/transactions
 * Retrieve the full transactions audit log.
 */
router.get('/transactions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const transactions = await dbQueries.getTransactions('admin', '');
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Admin transaction logs fetch error:', error);
    res.status(500).json({ error: 'Failed to query core ledger.' });
  }
});

/**
 * PUT /api/admin/transactions/:id/escrow
 * Manually override funds routing (e.g. Disburse, Release, Refund).
 */
router.put('/transactions/:id/escrow', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'release' or 'refund'

    if (action === 'release') {
      const disbursement = await releaseEscrowToLandlord(id);
      if (disbursement.success) {
        res.status(200).json({ message: disbursement.message });
      } else {
        res.status(400).json({ error: disbursement.message });
      }
    } else if (action === 'refund') {
      const chargeback = await processRefundToStudent(id);
      if (chargeback.success) {
        res.status(200).json({ message: chargeback.message });
      } else {
        res.status(400).json({ error: chargeback.message });
      }
    } else {
      res.status(400).json({ error: "Invalid action. Specify 'release' or 'refund'." });
    }
  } catch (error) {
    console.error('Manually override escrow endpoint error:', error);
    res.status(500).json({ error: 'Action failed.' });
  }
});

/**
 * GET /api/admin/contacts
 * Query contacts database.
 */
router.get('/contacts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const contacts = await dbQueries.getContacts();
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Admin contacts fetch error:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

/**
 * POST /api/admin/contacts
 * Manually insert landlord or caretaker contacts.
 */
router.post('/contacts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { full_name, phone, whatsapp, zone, contact_type, referred_by, notes } = req.body;

    if (!full_name || !phone || !zone || !contact_type) {
      res.status(400).json({ error: 'Missing full_name, phone, zone or contact_type parameters.' });
      return;
    }

    const contact = await dbQueries.createContact({
      full_name,
      phone,
      whatsapp,
      zone,
      contact_type,
      referred_by,
      notes,
    });

    res.status(201).json({ message: 'Contact registered successfully.', contact });
  } catch (error) {
    console.error('Register Contact Error:', error);
    res.status(500).json({ error: 'Failed to register supply-side contact profile.' });
  }
});

/**
 * POST /api/admin/properties
 * Creates a property in 'Under Verification' status by admin.
 */
router.post('/properties', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      zone,
      street_landmark,
      property_type,
      caretaker_id,
      bedrooms,
      bathroom_type,
      has_kitchen,
      water_source,
      distance_to_campus,
      landlord_rent,
      photos,
      lease_expiry_estimate,
      map_location,
      accepts_half_session
    } = req.body;

    if (!zone || !street_landmark || !property_type || !caretaker_id || !bedrooms || !bathroom_type || !water_source || !distance_to_campus || !landlord_rent) {
      res.status(400).json({ error: 'Missing required property parameters.' });
      return;
    }

    const newProperty = await dbQueries.createProperty({
      zone,
      street_landmark,
      property_type,
      caretaker_id,
      bedrooms: Number(bedrooms),
      bathroom_type,
      has_kitchen: !!has_kitchen,
      water_source,
      distance_to_campus,
      landlord_rent: Number(landlord_rent),
      photos: photos || [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600'
      ],
      lease_expiry_estimate,
      map_location,
      accepts_half_session: !!accepts_half_session
    });

    res.status(201).json({
      message: 'Property created successfully under status Under Verification.',
      property: newProperty
    });
  } catch (error) {
    console.error('Admin Create Property Error:', error);
    res.status(500).json({ error: 'Failed to create property listing.' });
  }
});

/**
 * PUT /api/admin/properties/:id/pin-location
 * Pins coordinates and place ID for a property.
 */
router.put('/properties/:id/pin-location', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { latitude, longitude, google_maps_place_id } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Latitude and longitude are required.' });
      return;
    }

    const property = await dbQueries.findPropertyById(id);
    if (!property) {
      res.status(404).json({ error: 'Property not found.' });
      return;
    }

    const updatedProperty = await dbQueries.updatePropertyLocation(
      id,
      latitude !== null ? Number(latitude) : null,
      longitude !== null ? Number(longitude) : null,
      google_maps_place_id || null,
      req.user!.user_id
    );

    res.status(200).json({
      message: 'Location pinned successfully.',
      property: updatedProperty
    });
  } catch (error) {
    console.error('Admin Pin Location Error:', error);
    res.status(500).json({ error: 'Failed to pin property location.' });
  }
});

/**
 * GET /api/admin/reports
 * Retrieve all reports in the ledger, enriched with reporter and subject details (Admin only).
 */
router.get('/reports', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reports = await dbQueries.getAllReports();
    
    // Enrich each report with reporter and subject details
    const enriched = await Promise.all(
      reports.map(async (r) => {
        let reporter = null;
        if (r.reporter_id) {
          reporter = await dbQueries.findUserById(r.reporter_id);
          if (reporter) {
            delete reporter.password_hash;
          }
        }

        let subjectProperty = null;
        if (r.subject_property_id) {
          subjectProperty = await dbQueries.findPropertyById(r.subject_property_id);
        }

        let subjectContact = null;
        if (r.subject_contact_id) {
          subjectContact = await dbQueries.findContactById(r.subject_contact_id);
        }

        let subjectUser = null;
        if (r.subject_user_id) {
          subjectUser = await dbQueries.findUserById(r.subject_user_id);
          if (subjectUser) {
            delete subjectUser.password_hash;
          }
        }

        return {
          ...r,
          reporter,
          subjectProperty,
          subjectContact,
          subjectUser
        };
      })
    );

    res.status(200).json(enriched);
  } catch (error) {
    console.error('Admin Fetch Reports Error:', error);
    res.status(500).json({ error: 'Failed to retrieve reports log.' });
  }
});

/**
 * PUT /api/admin/reports/:id
 * Update status and admin notes for a report (Admin only).
 */
router.put('/reports/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const validStatuses = ['Pending', 'Under Review', 'Resolved', 'Dismissed'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid or missing status parameter.' });
      return;
    }

    const report = await dbQueries.getReportById(id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    const updated = await dbQueries.updateReportStatus(id, status, admin_notes || null);
    res.status(200).json(updated);
  } catch (error) {
    console.error('Admin Update Report Error:', error);
    res.status(500).json({ error: 'Failed to update report ledger.' });
  }
});

export default router;
