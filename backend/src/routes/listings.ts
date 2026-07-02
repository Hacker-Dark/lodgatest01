import { Router, Response } from 'express';
import * as dbQueries from '../models/queries.js';
import { sanitizePropertiesForStudent, sanitizePropertyForStudent } from '../services/businessLogic.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lodga-super-secret-key-12345';

const router = Router();

/**
 * GET /api/listings
 * Browse all properties with "Available" status. Filters: zone, type, maxPrice, bedrooms.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { zone, type, maxPrice, bedrooms } = req.query;

    const rawListings = await dbQueries.getProperties({
      zone: zone ? String(zone) : undefined,
      type: type ? String(type) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minBedrooms: bedrooms ? Number(bedrooms) : undefined,
      availableOnly: true // Gated strictly to verified Available properties
    });

    const studentSafeListings = sanitizePropertiesForStudent(rawListings);
    res.status(200).json(studentSafeListings);
  } catch (error) {
    console.error('Listings Error:', error);
    res.status(500).json({ error: 'Failed to retrieve available listings.' });
  }
});

/**
 * GET /api/listings/search
 * Search by zone/type/price
 */
router.get('/search', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { q, maxPrice } = req.query;
    const rawListings = await dbQueries.getProperties({ availableOnly: true });

    let filtered = rawListings;

    if (q) {
      const searchTerm = String(q).toLowerCase();
      filtered = rawListings.filter(p =>
        p.zone.toLowerCase().includes(searchTerm) ||
        p.property_type.toLowerCase().includes(searchTerm) ||
        p.street_landmark.toLowerCase().includes(searchTerm)
      );
    }

    if (maxPrice) {
      filtered = filtered.filter(p => p.total_listed_price <= Number(maxPrice));
    }

    res.status(200).json(sanitizePropertiesForStudent(filtered));
  } catch (error) {
    console.error('Listings Search Error:', error);
    res.status(500).json({ error: 'Search failed.' });
  }
});

/**
 * GET /api/listings/saved
 * Get all saved listings for current user
 */
router.get('/saved', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const savedListings = await dbQueries.getSavedListings(user_id);
    res.status(200).json(savedListings);
  } catch (error) {
    console.error('Get Saved Listings Error:', error);
    res.status(500).json({ error: 'Failed to retrieve saved listings' });
  }
});

/**
 * POST /api/listings/saved/:property_id
 * Save a property listing
 */
router.post('/saved/:property_id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { property_id } = req.params;
    const user_id = req.user?.user_id;
    if (!user_id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    const saved = await dbQueries.saveListing(user_id, property_id);
    res.status(200).json({ message: 'Property saved successfully', saved });
  } catch (error) {
    console.error('Save Listing Error:', error);
    res.status(500).json({ error: 'Failed to save property' });
  }
});

/**
 * DELETE /api/listings/saved/:property_id
 * Unsave a property listing
 */
router.delete('/saved/:property_id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { property_id } = req.params;
    const user_id = req.user?.user_id;
    if (!user_id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    await dbQueries.unsaveListing(user_id, property_id);
    res.status(200).json({ message: 'Property unsaved successfully' });
  } catch (error) {
    console.error('Unsave Listing Error:', error);
    res.status(500).json({ error: 'Failed to unsave property' });
  }
});

/**
 * GET /api/listings/:id
 * Retrieve properties details. Redacts sensitive landlord rent metrics.
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const property = await dbQueries.findPropertyById(id);

    if (!property) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    // Only allow details for Available or Under Verification
    if (property.availability !== 'Available') {
      res.status(403).json({ error: 'This listing is pending verification or already taken.' });
      return;
    }

    // Extract user identity if authenticated
    let userId: string | null = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded?.user_id || null;
      } catch (err) {
        // Safe fallback for parsing errors
      }
    }

    // Record audit event
    await createAuditLog(userId, 'VIEW_LISTING', {
      property_id: id,
      property_type: property.property_type,
      zone: property.zone,
      price: property.total_listed_price,
      ip_address: req.ip || 'unknown'
    });

    const studentSafe = sanitizePropertyForStudent(property);
    res.status(200).json(studentSafe);
  } catch (error) {
    console.error('Listing Detail Error:', error);
    res.status(500).json({ error: 'Failed to retrieve listing detail.' });
  }
});

/**
 * GET /api/listings/reviews/:property_id
 * Get reviews for a property
 */
router.get('/reviews/:property_id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { property_id } = req.params;
    const reviews = await dbQueries.getPropertyReviews(property_id);
    res.status(200).json(reviews);
  } catch (error) {
    console.error('Get Reviews Error:', error);
    res.status(500).json({ error: 'Failed to retrieve reviews' });
  }
});

/**
 * POST /api/listings/reviews
 * Create a new review for a property
 */
router.post('/reviews', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { property_id, rating, comment } = req.body;
    const user_id = req.user?.user_id;
    const user_name = req.user?.full_name || 'Anonymous Student';
    if (!user_id) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    if (!property_id || !rating) {
      res.status(400).json({ error: 'property_id and rating are required' });
      return;
    }
    const review = await dbQueries.createPropertyReview(property_id, user_id, user_name, Number(rating), comment);
    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    console.error('Create Review Error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

export default router;
