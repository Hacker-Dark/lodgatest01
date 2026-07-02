import { query, localDB } from '../config/db.js';

// Table ID generators & helpers
export function generateId(prefix: string): string {
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

// ----------------------------------------------------
// USERS QUERIES
// ----------------------------------------------------
export async function findUserById(userId: string) {
  const sql = `SELECT * FROM users WHERE user_id = $1 LIMIT 1;`;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
}

export async function findUserByPhoneOrEmail(identifier: string) {
  const sql = `SELECT * FROM users WHERE phone = $1 OR email = $1 LIMIT 1;`;
  const result = await query(sql, [identifier]);
  return result.rows[0] || null;
}

export async function createUser(payload: {
  email?: string;
  phone: string;
  full_name: string;
  user_type: 'student' | 'caretaker' | 'landlord' | 'admin';
  is_futminna?: boolean;
}) {
  const sql = `
    INSERT INTO users (email, phone, full_name, user_type, is_futminna)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await query(sql, [payload.email || null, payload.phone, payload.full_name, payload.user_type, payload.is_futminna || false]);
  return result.rows[0];
}

export async function updateUserPhone(userId: string, phone: string, isFutminna?: boolean) {
  const sql = `
    UPDATE users
    SET phone = $1, is_futminna = COALESCE($2, is_futminna), updated_at = now()
    WHERE user_id = $3
    RETURNING *;
  `;
  const result = await query(sql, [phone, isFutminna !== undefined ? isFutminna : null, userId]);
  
  // Keep local simulation DB state synchronized
  const user = localDB.users.find(u => u.user_id === userId);
  if (user) {
    user.phone = phone;
    if (isFutminna !== undefined) {
      user.is_futminna = isFutminna;
    }
    user.updated_at = new Date();
  }
  return result.rows[0] || user;
}

export async function updateUserProfile(userId: string, fullName: string, phone: string) {
  const sql = `
    UPDATE users
    SET full_name = $1, phone = $2, updated_at = now()
    WHERE user_id = $3
    RETURNING *;
  `;
  const result = await query(sql, [fullName, phone, userId]);

  // Keep local simulation DB state synchronized
  const user = localDB.users.find(u => u.user_id === userId);
  if (user) {
    user.full_name = fullName;
    user.phone = phone;
    user.updated_at = new Date();
  }
  return result.rows[0] || user;
}

// ----------------------------------------------------
// CONTACTS SERVICE / QUERIES (supply side directory)
// ----------------------------------------------------
export async function getContacts() {
  const sql = `
    SELECT c.*, COALESCE(p.pings_count, 0) AS renewal_pings_count
    FROM contacts c
    LEFT JOIN (
      SELECT caretaker_id, COUNT(*) AS pings_count
      FROM caretaker_renewal_pings
      GROUP BY caretaker_id
    ) p ON c.contact_id = p.caretaker_id
    ORDER BY c.date_added DESC;
  `;
  const result = await query(sql);
  return result.rows;
}

export async function findContactById(contactId: string) {
  const sql = `SELECT * FROM contacts WHERE contact_id = $1 LIMIT 1;`;
  const result = await query(sql, [contactId]);
  return result.rows[0] || null;
}

export async function findContactByUserId(userId: string) {
  const sql = `SELECT * FROM contacts WHERE linked_user_id = $1 LIMIT 1;`;
  const result = await query(sql, [userId]);
  return result.rows[0] || null;
}

export async function createContact(payload: {
  full_name: string;
  phone: string;
  whatsapp?: string;
  zone: string;
  contact_type: 'Landlord' | 'Caretaker' | 'Agent' | 'Flipper';
  referred_by?: string;
  notes?: string;
  linked_user_id?: string;
}) {
  const contactId = generateId('LLC');
  const sql = `
    INSERT INTO contacts (contact_id, full_name, phone, whatsapp, zone, contact_type, referred_by, notes, linked_user_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  const result = await query(sql, [
    contactId,
    payload.full_name,
    payload.phone,
    payload.whatsapp || null,
    payload.zone,
    payload.contact_type,
    payload.referred_by || null,
    payload.notes || null,
    payload.linked_user_id || null
  ]);
  return result.rows[0];
}

// ----------------------------------------------------
// PROPERTIES RESOURCE
// ----------------------------------------------------
export async function getProperties(filters: {
  zone?: string;
  type?: string;
  maxPrice?: number;
  minBedrooms?: number;
  availableOnly?: boolean;
}) {
  let sql = `SELECT * FROM properties WHERE 1=1`;
  const params: any[] = [];
  let index = 1;

  if (filters.zone) {
    sql += ` AND zone = $${index++}`;
    params.push(filters.zone);
  }
  if (filters.type) {
    sql += ` AND property_type = $${index++}`;
    params.push(filters.type);
  }
  if (filters.maxPrice) {
    sql += ` AND total_listed_price <= $${index++}`;
    params.push(filters.maxPrice);
  }
  if (filters.minBedrooms) {
    sql += ` AND bedrooms >= $${index++}`;
    params.push(filters.minBedrooms);
  }
  if (filters.availableOnly) {
    sql += ` AND availability = 'Available'`;
  }

  sql += ` ORDER BY date_listed DESC;`;
  const result = await query(sql, params);
  return result.rows;
}

export async function getPropertiesForCaretaker(caretakerId: string) {
  const sql = `SELECT * FROM properties WHERE caretaker_id = $1 ORDER BY created_at DESC;`;
  const result = await query(sql, [caretakerId]);
  return result.rows;
}

export async function findPropertyById(propertyId: string) {
  const sql = `SELECT * FROM properties WHERE property_id = $1 LIMIT 1;`;
  const result = await query(sql, [propertyId]);
  return result.rows[0] || null;
}

export async function createProperty(payload: {
  zone: 'Gidan Kwano' | 'Jatapi' | 'Dama' | 'Gidan Managoro' | 'Other';
  street_landmark: string;
  property_type: 'Self-contain' | 'Room & Parlour' | 'Mini Flat' | 'Shared Room' | 'Studio';
  caretaker_id: string;
  bedrooms: number;
  bathroom_type: 'Flush' | 'Squatting' | 'Shared Flush' | 'Shared Squatting';
  has_kitchen: boolean;
  water_source: 'Borehole' | 'Well' | 'Public' | 'Tanker';
  distance_to_campus: string;
  landlord_rent: number;
  photos: string[];
  lease_expiry_estimate?: string;
  map_location?: string;
  accepts_half_session?: boolean;
}) {
  const rent = payload.landlord_rent;
  // Lodga Connection fee: minimum floor N12,000, else 8%
  const connectionFee = Math.max(rent * 0.08, 12000.0);
  const propertyId = generateId('PROP');

  // We explicitly write raw SQL (with auto-generated ID handled in node to ensure compatibility)
  const sql = `
    INSERT INTO properties (
      property_id, zone, street_landmark, property_type, caretaker_id, bedrooms,
      bathroom_type, has_kitchen, water_source, distance_to_campus, landlord_rent,
      connection_fee, photos, lease_expiry_estimate, map_location, accepts_half_session
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *;
  `;
  const result = await query(sql, [
    propertyId,
    payload.zone,
    payload.street_landmark,
    payload.property_type,
    payload.caretaker_id,
    payload.bedrooms,
    payload.bathroom_type,
    payload.has_kitchen,
    payload.water_source,
    payload.distance_to_campus,
    rent,
    connectionFee,
    payload.photos,
    payload.lease_expiry_estimate || null,
    payload.map_location || null,
    payload.accepts_half_session || false
  ]);

  const newProperty = result.rows[0];

  if (newProperty) {
    try {
      // In PostgreSQL we use CURRENT_DATE, but to keep simulated query parser from breaking, 
      // we can use a standard insert or check.
      // Wait, let's make sure the simulated database query doesn't choke on this SQL if we use CURRENT_DATE.
      // We can also supply a parameterized date like GenDate.
      const checkSql = `
        INSERT INTO verification_checks (
          property_id, caretaker_id, visit_date,
          item_1_physical_visit, item_2_photos, item_3_id_verified,
          item_4_ownership, item_5_pricing, item_6_amenities, item_7_feedback,
          overall_status, notes
        ) VALUES ($1, $2, CURRENT_DATE, 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Incomplete', 'Review is scheduled')
        RETURNING *;
      `;
      await query(checkSql, [newProperty.property_id, newProperty.caretaker_id]);
    } catch (err) {
      console.error('Error auto-creating blank verification check:', err);
    }
  }

  return newProperty;
}

export async function updatePropertyAvailability(propertyId: string, availabilityStr: string) {
  const sql = `
    UPDATE properties
    SET availability = $1, updated_at = now()
    WHERE property_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [availabilityStr, propertyId]);
  return result.rows[0] || null;
}

export async function updatePropertyLocation(
  propertyId: string,
  latitude: number | null,
  longitude: number | null,
  googleMapsPlaceId: string | null,
  userId: string
) {
  const sql = `
    UPDATE properties
    SET 
      latitude = $1,
      longitude = $2,
      google_maps_place_id = $3,
      location_pinned_by = $4,
      location_pinned_at = now(),
      updated_at = now()
    WHERE property_id = $5
    RETURNING *;
  `;
  const result = await query(sql, [latitude, longitude, googleMapsPlaceId, userId, propertyId]);
  
  // Directly sync with simulation state if needed
  try {
    const { localDB } = await import('../config/db.js');
    if (localDB) {
      const prop = localDB.properties.find((p: any) => p.property_id === propertyId);
      if (prop) {
        prop.latitude = latitude;
        prop.longitude = longitude;
        prop.google_maps_place_id = googleMapsPlaceId;
        prop.location_pinned_by = userId;
        prop.location_pinned_at = new Date();
        prop.updated_at = new Date();
      }
    }
  } catch (err) {
    console.error("LocalDB sync error in updatePropertyLocation:", err);
  }

  return result.rows[0] || null;
}

// ----------------------------------------------------
// VERIFICATION CHECKS
// ----------------------------------------------------
export async function getVerificationCheckForProperty(propertyId: string) {
  const sql = `
    SELECT * FROM verification_checks
    WHERE property_id = $1
    ORDER BY created_at DESC
    LIMIT 1;
  `;
  const result = await query(sql, [propertyId]);
  return result.rows[0] || null;
}

export async function createOrUpdateVerificationCheck(payload: {
  property_id: string;
  caretaker_id: string;
  visit_date: string;
  item_1_physical_visit: 'Pass' | 'Fail' | 'N/A' | 'Pending';
  item_2_photos: 'Pass' | 'Fail' | 'N/A' | 'Pending';
  item_3_id_verified: 'Pass' | 'Fail' | 'N/A' | 'Pending';
  item_4_ownership: 'Pass' | 'Fail' | 'N/A' | 'Pending';
  item_5_pricing: 'Pass' | 'Fail' | 'N/A' | 'Pending';
  item_6_amenities: 'Pass' | 'Fail' | 'N/A' | 'Pending';
  item_7_feedback: 'Pass' | 'Fail' | 'N/A' | 'Pending';
  notes?: string;
  overall_status: 'Passed' | 'Failed' | 'Incomplete';
}) {
  // Let us execute query
  const sql = `
    INSERT INTO verification_checks (
      property_id, caretaker_id, visit_date,
      item_1_physical_visit, item_2_photos, item_3_id_verified,
      item_4_ownership, item_5_pricing, item_6_amenities, item_7_feedback,
      overall_status, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;
  const result = await query(sql, [
    payload.property_id,
    payload.caretaker_id,
    payload.visit_date,
    payload.item_1_physical_visit,
    payload.item_2_photos,
    payload.item_3_id_verified,
    payload.item_4_ownership,
    payload.item_5_pricing,
    payload.item_6_amenities,
    payload.item_7_feedback,
    payload.overall_status,
    payload.notes || null,
  ]);
  return result.rows[0];
}

// ----------------------------------------------------
// TRANSACTIONS
// ----------------------------------------------------
export async function getTransactions(role: string, userId: string) {
  let sql = `SELECT * FROM transactions`;
  const params: any[] = [];

  if (role === 'student') {
    sql += ` WHERE student_id = $1`;
    params.push(userId);
  } else if (role === 'caretaker') {
    // Requires joining properties to select placements under caretaker's contact
    sql += `
      INNER JOIN properties ON transactions.property_id = properties.property_id
      INNER JOIN contacts ON properties.caretaker_id = contacts.contact_id
      WHERE contacts.linked_user_id = $1
    `;
    params.push(userId);
  }

  sql += ` ORDER BY transactions.created_at DESC;`;
  const result = await query(sql, params);
  return result.rows;
}

export async function findTransactionById(transactionId: string) {
  const sql = `SELECT * FROM transactions WHERE transaction_id = $1 LIMIT 1;`;
  const result = await query(sql, [transactionId]);
  return result.rows[0] || null;
}

export async function findTransactionByReference(reference: string) {
  const sql = `SELECT * FROM transactions WHERE paystack_reference = $1 LIMIT 1;`;
  const result = await query(sql, [reference]);
  return result.rows[0] || null;
}

export async function createTransaction(payload: {
  property_id: string;
  student_id: string;
  landlord_rent: number;
  connection_fee: number;
  inspection_fee: number;
  paystack_reference: string;
  inspect_waiver: boolean;
  move_in_date: string;
}) {
  const transactionId = generateId('TXN');
  const sql = `
    INSERT INTO transactions (
      transaction_id, property_id, student_id, landlord_rent, connection_fee,
      inspection_fee, paystack_reference, escrow_status, move_in_date, inspection_waiver
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Held', $8, $9)
    RETURNING *;
  `;
  const result = await query(sql, [
    transactionId,
    payload.property_id,
    payload.student_id,
    payload.landlord_rent,
    payload.connection_fee,
    payload.inspection_fee,
    payload.paystack_reference,
    payload.move_in_date,
    payload.inspect_waiver
  ]);
  return result.rows[0];
}

export async function updateTransactionEscrow(transactionId: string, escrowStatus: 'Held' | 'Released' | 'Disputed' | 'Refunded') {
  const sql = `
    UPDATE transactions
    SET escrow_status = $1, escrow_release_date = CASE WHEN $1 = 'Released' THEN now() ELSE escrow_release_date END, updated_at = now()
    WHERE transaction_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [escrowStatus, transactionId]);
  return result.rows[0] || null;
}

export async function updateTransactionDispute(transactionId: string, disputeStatus: 'No' | 'Yes — Resolved' | 'Yes — Pending') {
  const sql = `
    UPDATE transactions
    SET dispute_status = $1, escrow_status = CASE WHEN $1 = 'Yes — Pending' THEN 'Disputed' ELSE escrow_status END, updated_at = now()
    WHERE transaction_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [disputeStatus, transactionId]);
  return result.rows[0] || null;
}

export async function updateTransactionFeedback(transactionId: string, rating: number, text: string) {
  const sql = `
    UPDATE transactions
    SET feedback_received = true, feedback_rating = $1, feedback_text = $2, updated_at = now()
    WHERE transaction_id = $3
    RETURNING *;
  `;
  const result = await query(sql, [rating, text, transactionId]);
  return result.rows[0] || null;
}

// ----------------------------------------------------
// RENEWAL PINGS
// ----------------------------------------------------
export async function createRenewalPing(propertyId: string, caretakerId: string, notes?: string) {
  const pingId = `PING-${Date.now()}`;
  const sql = `
    INSERT INTO caretaker_renewal_pings (ping_id, property_id, caretaker_id, Notes)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const result = await query(sql, [pingId, propertyId, caretakerId, notes || 'Daily Automated Check']);
  return result.rows[0];
}

export async function getRenewalPingsForProperty(propertyId: string) {
  const sql = `SELECT * FROM caretaker_renewal_pings WHERE property_id = $1 ORDER BY ping_sent_at DESC;`;
  const result = await query(sql, [propertyId]);
  return result.rows;
}

export async function respondRenewalPing(pingId: string, response: 'Available' | 'Not Available') {
  const sql = `
    UPDATE caretaker_renewal_pings
    SET caretaker_response = $1, response_received_at = now()
    WHERE ping_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [response, pingId]);
  return result.rows[0] || null;
}

// ----------------------------------------------------
// SAVED LISTINGS & WISHLIST
// ----------------------------------------------------
export async function saveListing(userId: string, propertyId: string) {
  const sql = `
    INSERT INTO saved_listings (user_id, property_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, property_id) DO NOTHING
    RETURNING *;
  `;
  const result = await query(sql, [userId, propertyId]);
  return result.rows[0] || null;
}

export async function unsaveListing(userId: string, propertyId: string) {
  const sql = `
    DELETE FROM saved_listings
    WHERE user_id = $1 AND property_id = $2;
  `;
  await query(sql, [userId, propertyId]);
  return { success: true };
}

export async function getSavedListings(userId: string) {
  const sql = `
    SELECT s.*, p.*
    FROM saved_listings s
    JOIN properties p ON s.property_id = p.property_id
    WHERE s.user_id = $1;
  `;
  const result = await query(sql, [userId]);
  return result.rows;
}

// ----------------------------------------------------
// PROPERTY REVIEWS & COMMUNITY RATINGS
// ----------------------------------------------------
export async function getPropertyReviews(propertyId: string) {
  const sql = `
    SELECT *
    FROM property_reviews
    WHERE property_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await query(sql, [propertyId]);
  return result.rows;
}

export async function createPropertyReview(propertyId: string, studentId: string, studentName: string, rating: number, comment: string) {
  const sql = `
    INSERT INTO property_reviews (property_id, student_id, student_name, rating, comment)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await query(sql, [propertyId, studentId, studentName, rating, comment]);
  return result.rows[0] || null;
}

// ----------------------------------------------------
// SAFETY & REPORTING QUERIES
// ----------------------------------------------------
export async function createReport(
  reporterId: string,
  reportType: string,
  subjectContactId: string | null,
  subjectPropertyId: string | null,
  subjectUserId: string | null,
  description: string,
  evidenceUrls: string[],
  status: string
) {
  const sql = `
    INSERT INTO reports (reporter_id, report_type, subject_contact_id, subject_property_id, subject_user_id, description, evidence_urls, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const result = await query(sql, [reporterId, reportType, subjectContactId, subjectPropertyId, subjectUserId, description, evidenceUrls, status]);
  return result.rows[0] || null;
}

export async function getReportsByReporter(reporterId: string) {
  const sql = `
    SELECT * FROM reports WHERE reporter_id = $1 ORDER BY created_at DESC;
  `;
  const result = await query(sql, [reporterId]);
  return result.rows;
}

export async function getAllReports() {
  const sql = `
    SELECT * FROM reports ORDER BY created_at DESC;
  `;
  const result = await query(sql);
  return result.rows;
}

export async function getReportById(reportId: string) {
  const sql = `
    SELECT * FROM reports WHERE report_id = $1 LIMIT 1;
  `;
  const result = await query(sql, [reportId]);
  return result.rows[0] || null;
}

export async function updateReportStatus(reportId: string, status: string, adminNotes: string | null) {
  const sql = `
    UPDATE reports
    SET status = $1, admin_notes = $2, updated_at = now()
    WHERE report_id = $3
    RETURNING *;
  `;
  const result = await query(sql, [status, adminNotes, reportId]);
  
  // Also sync with localDB for reports updates
  const report = localDB.reports.find(r => r.report_id === reportId);
  if (report) {
    report.status = status;
    report.admin_notes = adminNotes;
    report.updated_at = new Date();
  }
  return result.rows[0] || report || null;
}

export async function flagContact(contactId: string, isFlagged: boolean) {
  const sql = `
    UPDATE contacts
    SET is_flagged = $1
    WHERE contact_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [isFlagged, contactId]);

  // Sync localDB contact
  const contact = localDB.contacts.find(c => c.contact_id === contactId);
  if (contact) {
    contact.is_flagged = isFlagged;
  }
  return result.rows[0] || contact || null;
}

export async function flagProperty(propertyId: string, isFlagged: boolean) {
  const sql = `
    UPDATE properties
    SET is_flagged = $1
    WHERE property_id = $2
    RETURNING *;
  `;
  const result = await query(sql, [isFlagged, propertyId]);

  // Sync localDB property
  const prop = localDB.properties.find(p => p.property_id === propertyId);
  if (prop) {
    prop.is_flagged = isFlagged;
  }
  return result.rows[0] || prop || null;
}

export async function suspendProperty(propertyId: string) {
  const sql = `
    UPDATE properties
    SET availability = 'Suspended', updated_at = now()
    WHERE property_id = $1
    RETURNING *;
  `;
  const result = await query(sql, [propertyId]);

  // Sync localDB property
  const prop = localDB.properties.find(p => p.property_id === propertyId);
  if (prop) {
    prop.availability = 'Suspended';
    prop.updated_at = new Date();
  }
  return result.rows[0] || prop || null;
}

export async function getReportsCountForSubject(subjectContactId: string | null, subjectPropertyId: string | null) {
  const sql = `
    SELECT COUNT(*) as count FROM reports
    WHERE (subject_contact_id = $1 AND subject_contact_id IS NOT NULL) 
       OR (subject_property_id = $2 AND subject_property_id IS NOT NULL)
       AND status IN ('Pending', 'Under Review');
  `;
  // Let's count in localDB if pool is not used, otherwise run query
  try {
    const result = await query(sql, [subjectContactId, subjectPropertyId]);
    if (result.rows && result.rows[0]) {
      const val = result.rows[0].count;
      if (val !== undefined) return parseInt(val, 10);
    }
  } catch (e) {
    console.warn("Postgres count failed or not running, checking localDB:", e);
  }

  const filtered = localDB.reports.filter(r => 
    (subjectContactId && r.subject_contact_id === subjectContactId) ||
    (subjectPropertyId && r.subject_property_id === subjectPropertyId)
  ).filter(r => r.status === 'Pending' || r.status === 'Under Review');
  return filtered.length;
}
