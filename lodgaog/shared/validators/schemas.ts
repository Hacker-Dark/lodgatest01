import { z } from 'zod';

// Users Schemas
export const UserRegisterSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().regex(/^0[789]\d{9}$/, 'Must be a valid Nigerian phone number (11 digits starting with 07/08/09)'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  user_type: z.enum(['student', 'caretaker', 'landlord', 'admin']),
  is_futminna: z.boolean().optional(),
});

export const UserLoginSchema = z.object({
  phone: z.string().regex(/^0[789]\d{9}$/, 'Must be a valid 11-digit Nigerian phone number'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').optional(),
});

// Contacts Schemas
export const ContactSchema = z.object({
  contact_id: z.string().regex(/^LLC-\d{3,6}$/, 'Contact ID must match format LLC-XXX'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^0[789]\d{9}$/, 'Must be a valid Nigerian phone number'),
  whatsapp: z.string().optional(),
  zone: z.string(),
  contact_type: z.enum(['Landlord', 'Caretaker', 'Agent', 'Flipper']),
  id_verified: z.enum(['Verified', 'Pending', 'Failed']).default('Pending'),
  ownership_verified: z.enum(['Verified', 'Pending', 'Failed', 'N/A']).default('Pending'),
  trust_level: z.enum(['High', 'Medium', 'Low', 'Unknown']).default('Unknown'),
  referred_by: z.string().optional(),
  notes: z.string().optional(),
  linked_user_id: z.string().uuid().optional(),
});

// Properties Schemas
export const PropertyCreateSchema = z.object({
  zone: z.enum(['Gidan Kwano', 'Jatapi', 'Dama', 'Gidan Managoro', 'Other']),
  street_landmark: z.string().min(5, 'Landmark description too short'),
  property_type: z.enum(['Self-contain', 'Room & Parlour', 'Mini Flat', 'Shared Room', 'Studio']),
  caretaker_id: z.string().min(1, 'Caretaker ID is required'),
  bedrooms: z.number().int().min(1),
  bathroom_type: z.enum(['Flush', 'Squatting', 'Shared Flush', 'Shared Squatting']),
  has_kitchen: z.boolean(),
  water_source: z.enum(['Borehole', 'Well', 'Public', 'Tanker']),
  distance_to_campus: z.string().min(1, 'Distance details required'),
  landlord_rent: z.number().positive('Rent must be a positive number'),
  photos: z.array(z.string().url()).min(8, 'At least 8 photos are required for listing verification'),
  lease_expiry_estimate: z.string().datetime().optional(),
  map_location: z.string().optional(),
});

// Verification Check Schemas
export const VerificationCheckSchema = z.object({
  property_id: z.string(),
  caretaker_id: z.string(),
  visit_date: z.string(),
  item_1_physical_visit: z.enum(['Pass', 'Fail', 'N/A', 'Pending']),
  item_2_photos: z.enum(['Pass', 'Fail', 'N/A', 'Pending']),
  item_3_id_verified: z.enum(['Pass', 'Fail', 'N/A', 'Pending']),
  item_4_ownership: z.enum(['Pass', 'Fail', 'N/A', 'Pending']),
  item_5_pricing: z.enum(['Pass', 'Fail', 'N/A', 'Pending']),
  item_6_amenities: z.enum(['Pass', 'Fail', 'N/A', 'Pending']),
  item_7_feedback: z.enum(['Pass', 'Fail', 'N/A', 'Pending']),
  notes: z.string().optional(),
});

// Transactions Schemas
export const InitiateTransactionSchema = z.object({
  property_id: z.string(),
  inspection_waiver: z.boolean().default(false),
});

export const HandleFeedbackSchema = z.object({
  feedback_rating: z.number().int().min(1).max(5),
  feedback_text: z.string().optional(),
});

export const DisputeSchema = z.object({
  reason: z.string().min(5, 'Dispute reason must be details of issue'),
});
