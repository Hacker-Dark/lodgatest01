import pg from 'pg';

const { Pool } = pg;

// Connection string can be supplied from Supabase URI
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

let pool: pg.Pool | null = null;

if (connectionString) {
  try {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('Database Config: Real PostgreSQL/Supabase Pool Initialized.');
    
    // Auto-create audit_log table if it does not exist
    pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `).then(() => {
      console.log('Database Setup: Verified or created audit_log table.');
      // Create saved_listings table if not exists
      return pool!.query(`
        CREATE TABLE IF NOT EXISTS saved_listings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          property_id TEXT NOT NULL,
          saved_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(user_id, property_id)
        );
      `);
    }).then(() => {
      console.log('Database Setup: Verified saved_listings table.');
      // Create property_reviews table if not exists
      return pool!.query(`
        CREATE TABLE IF NOT EXISTS property_reviews (
          review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          property_id TEXT NOT NULL,
          student_id UUID NOT NULL,
          student_name TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
    }).then(() => {
      console.log('Database Setup: Verified property_reviews table.');
      // Also verify properties has accepts_half_session column
      return pool!.query(`
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS accepts_half_session BOOLEAN DEFAULT FALSE;
      `);
    }).then(() => {
      console.log('Database Setup: Verified accepts_half_session column in properties.');
      // Add location fields to properties
      return pool!.query(`
        ALTER TABLE properties 
        ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
        ADD COLUMN IF NOT EXISTS google_maps_place_id TEXT,
        ADD COLUMN IF NOT EXISTS location_pinned_by UUID REFERENCES users(user_id),
        ADD COLUMN IF NOT EXISTS location_pinned_at TIMESTAMPTZ;
      `);
    }).then(() => {
      console.log('Database Setup: Verified location pinning columns in properties.');
      // Add item_8_location_pinned to verification_checks
      return pool!.query(`
        ALTER TABLE verification_checks
        ADD COLUMN IF NOT EXISTS item_8_location_pinned TEXT NOT NULL DEFAULT 'Pending' 
        CHECK (item_8_location_pinned IN ('Pass', 'Fail', 'N/A', 'Pending'));
      `);
    }).then(() => {
      console.log('Database Setup: Verified item_8_location_pinned in verification_checks.');
      // Create reports table if not exists
      return pool!.query(`
        CREATE TABLE IF NOT EXISTS reports (
          report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reporter_id UUID REFERENCES users(user_id),
          report_type TEXT NOT NULL CHECK (report_type IN (
            'Suspicious landlord',
            'Suspicious caretaker', 
            'Fake listing',
            'Scam attempt',
            'Harassment',
            'Property mismatch',
            'Unauthorized fee request',
            'Other'
          )),
          subject_contact_id TEXT REFERENCES contacts(contact_id),
          subject_property_id TEXT REFERENCES properties(property_id),
          subject_user_id UUID REFERENCES users(user_id),
          description TEXT NOT NULL,
          evidence_urls TEXT[],
          status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN (
            'Pending',
            'Under Review',
            'Resolved',
            'Dismissed'
          )),
          admin_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `);
    }).then(() => {
      console.log('Database Setup: Verified reports table.');
      // Add is_flagged to properties
      return pool!.query(`
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
      `);
    }).then(() => {
      console.log('Database Setup: Verified is_flagged column in properties.');
      // Add is_flagged to contacts
      return pool!.query(`
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
      `);
    }).then(() => {
      console.log('Database Setup: Verified is_flagged column in contacts.');
      // Add is_futminna to users
      return pool!.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_futminna BOOLEAN DEFAULT FALSE;
      `);
    }).then(() => {
      console.log('Database Setup: Verified is_futminna column in users.');
    }).catch(err => {
      console.error('Database Setup Warning: Could not create tables or update properties table, falling back:', err);
      pool = null;
    });
  } catch (error) {
    console.error('Database Config: Failed to initialize real Pool. Falling back to local state.', error);
  }
} else {
  console.log('Database Config: DATABASE_URL not set. Running on local-storage relational simulation mode for the live preview.');
}

// Highly robust local-memory state that implements seed data reflecting Nigeria FUMTINNA
export interface LocalDBState {
  users: any[];
  contacts: any[];
  properties: any[];
  verification_checks: any[];
  transactions: any[];
  caretaker_renewal_pings: any[];
  saved_listings: any[];
  property_reviews: any[];
  sessions: { [key: string]: any };
  audit_logs: any[];
  reports: any[];
}

// Loaded with beautiful seed data for FUTMINNA student areas
export const localDB: LocalDBState = {
  users: [
    {
      user_id: 'a0000000-0000-0000-0000-000000000001',
      email: 'student1@futminna.edu.ng',
      phone: '08123456789',
      full_name: 'Sodiq Adesanya',
      user_type: 'student',
      created_at: new Date(),
      last_login: new Date(),
      is_active: true
    },
    {
      user_id: 'a0000000-0000-0000-0000-000000000002',
      email: 'caretaker1@gmail.com',
      phone: '09012345678',
      full_name: 'Mallam Ibrahim Musa',
      user_type: 'caretaker',
      created_at: new Date(),
      last_login: new Date(),
      is_active: true
    },
    {
      user_id: 'a0000000-0000-0000-0000-000000000003',
      email: 'admin@lodga.co',
      phone: '07033445566',
      full_name: 'Chinedu Eze Lodga Admin',
      user_type: 'admin',
      created_at: new Date(),
      last_login: new Date(),
      is_active: true
    }
  ],
  contacts: [
    {
      contact_id: 'LLC-001',
      full_name: 'Mallam Ibrahim Musa',
      phone: '09012345678',
      whatsapp: '2349012345678',
      zone: 'Gidan Kwano',
      contact_type: 'Caretaker',
      id_verified: 'Verified',
      ownership_verified: 'Verified',
      trust_level: 'High',
      date_added: '2026-05-10',
      referred_by: 'FUTMINNA Student Union Support',
      notes: 'Oversees Gidan Kwano lodges. Highly responsive.',
      linked_user_id: 'a0000000-0000-0000-0000-000000000002'
    },
    {
      contact_id: 'LLC-002',
      full_name: 'Chief Alabi Ogun',
      phone: '08099887766',
      whatsapp: '2348099887766',
      zone: 'Jatapi',
      contact_type: 'Landlord',
      id_verified: 'Verified',
      ownership_verified: 'Verified',
      trust_level: 'Medium',
      date_added: '2026-05-15',
      referred_by: 'Word of mouth',
      notes: 'Owns Alabi Court in Jatapi. Lives out of town.',
      linked_user_id: null
    }
  ],
  properties: [
    {
      property_id: 'PROP-101',
      zone: 'Gidan Kwano',
      street_landmark: 'Behind FUTMINNA Main Gate, adjacent Apex Clinic',
      property_type: 'Self-contain',
      caretaker_id: 'LLC-001',
      bedrooms: 1,
      bathroom_type: 'Flush',
      has_kitchen: true,
      water_source: 'Borehole',
      distance_to_campus: '5-minute walk',
      landlord_rent: 180000.00,
      connection_fee: 14400.00, // 8% of 180,000 = 14,400 (> 12,000 floor)
      total_listed_price: 194400.00,
      availability: 'Available',
      date_listed: '2026-06-01',
      photos: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600'
      ],
      lease_expiry_estimate: '2027-06-01',
      latitude: 9.0782,
      longitude: 6.5085,
      google_maps_place_id: 'ChIJ_f5p9f9RzRQRv0r_jXQ-Yzo',
      created_at: new Date('2026-06-01'),
      updated_at: new Date('2026-06-01')
    },
    {
      property_id: 'PROP-102',
      zone: 'Jatapi',
      street_landmark: 'Near Celestial Church Area',
      property_type: 'Room & Parlour',
      caretaker_id: 'LLC-002',
      bedrooms: 1,
      bathroom_type: 'Shared Flush',
      has_kitchen: true,
      water_source: 'Well',
      distance_to_campus: '12-minute walk',
      landlord_rent: 140000.00,
      connection_fee: 12000.00, // 8% of 140,000 = 11,200 (less than 12,000 floor -> set to 12,000 floor)
      total_listed_price: 152000.00,
      availability: 'Available',
      date_listed: '2026-06-03',
      photos: [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600'
      ],
      lease_expiry_estimate: '2027-06-05',
      latitude: 9.0734,
      longitude: 6.5120,
      google_maps_place_id: 'ChIJ_f5p9f9RzRQRv0r_jXQ-Yz1',
      created_at: new Date('2026-06-03'),
      updated_at: new Date('2026-06-03')
    },
    {
      property_id: 'PROP-103',
      zone: 'Dama',
      street_landmark: 'Behind Dama Water Reservoir',
      property_type: 'Mini Flat',
      caretaker_id: 'LLC-001',
      bedrooms: 1,
      bathroom_type: 'Flush',
      has_kitchen: true,
      water_source: 'Borehole',
      distance_to_campus: '8-minute mini bike ride',
      landlord_rent: 220000.00,
      connection_fee: 17600.00, // 8% of 220,000 = 17,600 (> 12,000)
      total_listed_price: 237600.00,
      availability: 'Under Verification',
      date_listed: '2026-06-15',
      photos: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600'
      ],
      lease_expiry_estimate: '2027-06-15',
      created_at: new Date('2026-06-15'),
      updated_at: new Date('2026-06-15')
    }
  ],
  verification_checks: [
    {
      check_id: 'v0000001-0000-0000-0000-000000000001',
      property_id: 'PROP-101',
      caretaker_id: 'LLC-001',
      visit_date: '2026-06-01',
      item_1_physical_visit: 'Pass',
      item_2_photos: 'Pass',
      item_3_id_verified: 'Pass',
      item_4_ownership: 'Pass',
      item_5_pricing: 'Pass',
      item_6_amenities: 'Pass',
      item_7_feedback: 'Pass',
      item_8_location_pinned: 'Pass',
      overall_status: 'Passed',
      notes: 'All features check out. Water pump active.',
      created_at: new Date('2026-06-01'),
      updated_at: new Date('2026-06-01')
    },
    {
      check_id: 'v0000001-0000-0000-0000-000000000002',
      property_id: 'PROP-102',
      caretaker_id: 'LLC-002',
      visit_date: '2026-06-03',
      item_1_physical_visit: 'Pass',
      item_2_photos: 'Pass',
      item_3_id_verified: 'Pass',
      item_4_ownership: 'Pass',
      item_5_pricing: 'Pass',
      item_6_amenities: 'Pass',
      item_7_feedback: 'Pass',
      item_8_location_pinned: 'Pass',
      overall_status: 'Passed',
      notes: 'Passed initial inspections.',
      created_at: new Date('2026-06-03'),
      updated_at: new Date('2026-06-03')
    },
    {
      check_id: 'v0000001-0000-0000-0000-000000000003',
      property_id: 'PROP-103',
      caretaker_id: 'LLC-001',
      visit_date: '2026-06-15',
      item_1_physical_visit: 'Pending',
      item_2_photos: 'Pending',
      item_3_id_verified: 'Pending',
      item_4_ownership: 'Pending',
      item_5_pricing: 'Pending',
      item_6_amenities: 'Pending',
      item_7_feedback: 'Pending',
      item_8_location_pinned: 'Pending',
      overall_status: 'Incomplete',
      notes: 'Initial check slated for next Tuesday.',
      created_at: new Date('2026-06-15'),
      updated_at: new Date('2026-06-15')
    }
  ],
  transactions: [
    {
      transaction_id: 'TXN-001',
      property_id: 'PROP-102',
      student_id: 'a0000000-0000-0000-0000-000000000001',
      landlord_rent: 140000.00,
      connection_fee: 12000.00,
      inspection_fee: 3000.00,
      total_paid: 155000.00,
      paystack_reference: 'PSTK_REF_998877',
      payment_date: new Date('2026-06-18T10:00:00Z'),
      move_in_date: '2026-06-21',
      escrow_status: 'Held',
      dispute_status: 'No',
      inspection_waiver: false,
      feedback_received: false,
      created_at: new Date('2026-06-18T09:45:00Z'),
      updated_at: new Date('2026-06-18T10:00:00Z')
    }
  ],
  caretaker_renewal_pings: [],
  saved_listings: [],
  property_reviews: [],
  sessions: {},
  audit_logs: [],
  reports: []
};

/**
 * Executes a PostgreSQL raw query if connection exists, or processes local store simulation inside Node
 */
export async function query(text: string, params: any[] = []): Promise<{ rows: any[] }> {
  if (pool) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.error('Database Query Error on Postgres pool:', error);
      throw error;
    }
  }

  // Fallback Simulator matching typical raw SQL statements used by models
  // Let's implement lightweight SQL parser mapping to our rich state tables!
  const stmt = text.trim().toLowerCase();

  // 1. SELECT * FROM users WHERE email = $1 OR phone = $2 OR phone = $1
  if (stmt.startsWith('select * from users') || stmt.includes('from users')) {
    if (stmt.includes('user_id = $1')) {
      const user = localDB.users.find(u => u.user_id === params[0]);
      return { rows: user ? [user] : [] };
    }
    if (stmt.includes('phone = $1')) {
      const user = localDB.users.find(u => u.phone === params[0] || u.email === params[0]);
      return { rows: user ? [user] : [] };
    }
    if (stmt.includes('email = $1')) {
      const user = localDB.users.find(u => u.email === params[0]);
      return { rows: user ? [user] : [] };
    }
    return { rows: localDB.users };
  }

  // 2. INSERT INTO users (email, phone, full_name, user_type)
  if (stmt.startsWith('insert into users')) {
    // values might be parameterized ($1, $2, $3, $4)
    // we map them
    const newUser = {
      user_id: `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: params[0] || null,
      phone: params[1],
      full_name: params[2],
      user_type: params[3],
      is_futminna: params[4] || false,
      is_active: true,
      created_at: new Date(),
      last_login: new Date()
    };
    localDB.users.push(newUser);
    return { rows: [newUser] };
  }

  // 3. SELECT * FROM properties
  if (stmt.startsWith('select * from properties') || stmt.includes('from properties')) {
    if (stmt.includes('property_id = $1')) {
      const prop = localDB.properties.find(p => p.property_id === params[0]);
      return { rows: prop ? [prop] : [] };
    }
    if (stmt.includes('caretaker_id = $1')) {
      const list = localDB.properties.filter(p => p.caretaker_id === params[0]);
      return { rows: list };
    }
    // Return filtered list of properties
    return { rows: localDB.properties };
  }

  // 4. INSERT INTO properties
  if (stmt.startsWith('insert into properties')) {
    const hasPropertyIdParam = typeof params[0] === 'string' && params[0].startsWith('PROP');
    const offset = hasPropertyIdParam ? 1 : 0;

    const zoneVal = params[0 + offset];
    const streetVal = params[1 + offset];
    const typeVal = params[2 + offset];
    const caretakerVal = params[3 + offset];
    const bedroomsVal = Number(params[4 + offset]) || 1;
    const bathroomVal = params[5 + offset];
    const hasKitchenVal = !!params[6 + offset];
    const waterVal = params[7 + offset];
    const distanceVal = params[8 + offset];
    const landlord_rent = Number(params[9 + offset]) || 150000;
    const connection_fee = Math.max(landlord_rent * 0.08, 12000.00);
    const total_listed_price = landlord_rent + connection_fee;
    const photosVal = params[11 + offset] || [];
    const leaseExpiryVal = params[12 + offset] || null;
    const mapLocationVal = params[13 + offset] || null;
    const acceptsHalfSessionVal = params[14 + offset] !== undefined ? !!params[14 + offset] : false;

    const newProperty = {
      property_id: hasPropertyIdParam ? params[0] : `PROP-${Math.floor(100 + Math.random() * 900)}`,
      zone: zoneVal,
      street_landmark: streetVal,
      property_type: typeVal,
      caretaker_id: caretakerVal,
      bedrooms: bedroomsVal,
      bathroom_type: bathroomVal,
      has_kitchen: hasKitchenVal,
      water_source: waterVal,
      distance_to_campus: distanceVal,
      landlord_rent,
      connection_fee,
      total_listed_price,
      availability: 'Under Verification',
      date_listed: new Date().toISOString().split('T')[0],
      photos: photosVal,
      lease_expiry_estimate: leaseExpiryVal,
      map_location: mapLocationVal,
      accepts_half_session: acceptsHalfSessionVal,
      created_at: new Date(),
      updated_at: new Date()
    };
    localDB.properties.push(newProperty);

    // Auto-create initial blank verification check
    localDB.verification_checks.push({
      check_id: `v-${Date.now()}`,
      property_id: newProperty.property_id,
      caretaker_id: newProperty.caretaker_id,
      visit_date: new Date().toISOString().split('T')[0],
      item_1_physical_visit: 'Pending',
      item_2_photos: 'Pending',
      item_3_id_verified: 'Pending',
      item_4_ownership: 'Pending',
      item_5_pricing: 'Pending',
      item_6_amenities: 'Pending',
      item_7_feedback: 'Pending',
      item_8_location_pinned: 'Pending',
      overall_status: 'Incomplete',
      notes: 'Review is scheduled',
      created_at: new Date(),
      updated_at: new Date()
    });

    return { rows: [newProperty] };
  }

  // 5. UPDATE properties
  if (stmt.startsWith('update properties')) {
    if (stmt.includes('availability = $1') && stmt.includes('property_id = $2')) {
      const propIdx = localDB.properties.findIndex(p => p.property_id === params[1]);
      if (propIdx !== -1) {
        localDB.properties[propIdx].availability = params[0];
        localDB.properties[propIdx].updated_at = new Date();
        return { rows: [localDB.properties[propIdx]] };
      }
    }
  }

  // 6. SELECT * FROM contacts
  if (stmt.includes('from contacts')) {
    const getPingsCount = (cid: string) => {
      return (localDB.caretaker_renewal_pings || []).filter(p => p.caretaker_id === cid).length;
    };

    if (stmt.includes('contact_id = $1')) {
      const contact = localDB.contacts.find(c => c.contact_id === params[0]);
      if (contact) {
        return { rows: [{ ...contact, renewal_pings_count: getPingsCount(contact.contact_id) }] };
      }
      return { rows: [] };
    }
    if (stmt.includes('linked_user_id = $1')) {
      const contact = localDB.contacts.find(c => c.linked_user_id === params[0]);
      if (contact) {
        return { rows: [{ ...contact, renewal_pings_count: getPingsCount(contact.contact_id) }] };
      }
      return { rows: [] };
    }

    const mappedContacts = localDB.contacts.map(c => ({
      ...c,
      renewal_pings_count: getPingsCount(c.contact_id)
    }));
    return { rows: mappedContacts };
  }

  // 7. INSERT INTO contacts
  if (stmt.startsWith('insert into contacts')) {
    // contact_id, full_name, phone, whatsapp, zone, contact_type, linked_user_id
    const newContact = {
      contact_id: params[0] || `LLC-${Math.floor(100 + Math.random() * 900)}`,
      full_name: params[1],
      phone: params[2],
      whatsapp: params[3] || null,
      zone: params[4],
      contact_type: params[5],
      id_verified: 'Pending',
      ownership_verified: 'Pending',
      date_added: new Date().toISOString().split('T')[0],
      trust_level: 'Unknown',
      referred_by: params[6] || null,
      notes: params[7] || null,
      linked_user_id: params[8] || null
    };
    localDB.contacts.push(newContact);
    return { rows: [newContact] };
  }

  // 8. SELECT * FROM verification_checks
  if (stmt.includes('from verification_checks')) {
    if (stmt.includes('property_id = $1')) {
      const check = localDB.verification_checks.filter(v => v.property_id === params[0]);
      return { rows: check };
    }
    return { rows: localDB.verification_checks };
  }

  // 9. INSERT OR UPDATE verification_checks
  if (stmt.startsWith('update verification_checks') || stmt.startsWith('insert into verification_checks')) {
    // Simple verification helper we call by endpoint
    // To make sure verification checks can be simulated, we will handle verification directly.
  }

  // 10. SELECT * FROM transactions
  if (stmt.includes('from transactions')) {
    if (stmt.includes('transaction_id = $1')) {
      const tx = localDB.transactions.find(t => t.transaction_id === params[0]);
      return { rows: tx ? [tx] : [] };
    }
    if (stmt.includes('student_id = $1')) {
      return { rows: localDB.transactions.filter(t => t.student_id === params[0]) };
    }
    if (stmt.includes('paystack_reference = $1')) {
      const tx = localDB.transactions.find(t => t.paystack_reference === params[0]);
      return { rows: tx ? [tx] : [] };
    }
    return { rows: localDB.transactions };
  }

  // 11. INSERT INTO transactions
  if (stmt.startsWith('insert into transactions')) {
    // transaction_id, property_id, student_id, landlord_rent, connection_fee, inspection_fee, paystack_reference, escrow_status, move_in_date
    const newTx = {
      transaction_id: params[0],
      property_id: params[1],
      student_id: params[2],
      landlord_rent: Number(params[3]),
      connection_fee: Number(params[4]),
      inspection_fee: Number(params[5]),
      total_paid: Number(params[3]) + Number(params[4]) + Number(params[5]),
      paystack_reference: params[6],
      move_in_date: params[7],
      escrow_status: 'Held',
      dispute_status: 'No',
      inspection_waiver: !!params[8],
      feedback_received: false,
      created_at: new Date(),
      updated_at: new Date()
    };
    localDB.transactions.push(newTx);
    return { rows: [newTx] };
  }

  // 12. SELECT * FROM saved_listings
  if (stmt.includes('from saved_listings')) {
    if (stmt.includes('user_id = $1')) {
      const saved = localDB.saved_listings.filter(s => s.user_id === params[0]);
      const joined = saved.map(s => {
        const prop = localDB.properties.find(p => p.property_id === s.property_id);
        return { ...prop, ...s };
      });
      return { rows: joined };
    }
    return { rows: localDB.saved_listings };
  }

  // 13. INSERT INTO saved_listings
  if (stmt.startsWith('insert into saved_listings')) {
    const userId = params[0];
    const propertyId = params[1];
    // Check duplicate
    const exists = localDB.saved_listings.some(s => s.user_id === userId && s.property_id === propertyId);
    if (!exists) {
      const newItem = {
        id: `saved-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: userId,
        property_id: propertyId,
        saved_at: new Date()
      };
      localDB.saved_listings.push(newItem);
      return { rows: [newItem] };
    }
    return { rows: [] };
  }

  // 14. DELETE FROM saved_listings
  if (stmt.startsWith('delete from saved_listings')) {
    const userId = params[0];
    const propertyId = params[1];
    localDB.saved_listings = localDB.saved_listings.filter(s => !(s.user_id === userId && s.property_id === propertyId));
    return { rows: [] };
  }

  // 15. SELECT * FROM property_reviews
  if (stmt.includes('from property_reviews')) {
    if (stmt.includes('property_id = $1')) {
      const reviews = localDB.property_reviews.filter(r => r.property_id === params[0]);
      return { rows: reviews };
    }
    return { rows: localDB.property_reviews };
  }

  // 16. INSERT INTO property_reviews
  if (stmt.startsWith('insert into property_reviews')) {
    const newItem = {
      review_id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      property_id: params[0],
      student_id: params[1],
      student_name: params[2],
      rating: Number(params[3]),
      comment: params[4] || '',
      created_at: new Date()
    };
    localDB.property_reviews.push(newItem);
    return { rows: [newItem] };
  }

  // 17. SELECT FROM reports
  if (stmt.includes('from reports')) {
    if (stmt.includes('reporter_id = $1')) {
      const filtered = localDB.reports.filter(r => r.reporter_id === params[0]);
      return { rows: filtered };
    }
    if (stmt.includes('report_id = $1')) {
      const found = localDB.reports.find(r => r.report_id === params[0]);
      return { rows: found ? [found] : [] };
    }
    return { rows: localDB.reports };
  }

  // 18. INSERT INTO reports
  if (stmt.startsWith('insert into reports')) {
    const newReport = {
      report_id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reporter_id: params[0] || null,
      report_type: params[1],
      subject_contact_id: params[2] || null,
      subject_property_id: params[3] || null,
      subject_user_id: params[4] || null,
      description: params[5],
      evidence_urls: params[6] || [],
      status: params[7] || 'Pending',
      admin_notes: params[8] || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    localDB.reports.push(newReport);
    return { rows: [newReport] };
  }

  // 19. UPDATE reports
  if (stmt.startsWith('update reports')) {
    if (stmt.includes('status = $1') && stmt.includes('admin_notes = $2')) {
      const repId = params[2];
      const foundIdx = localDB.reports.findIndex(r => r.report_id === repId);
      if (foundIdx !== -1) {
        localDB.reports[foundIdx].status = params[0];
        localDB.reports[foundIdx].admin_notes = params[1];
        localDB.reports[foundIdx].updated_at = new Date();
        return { rows: [localDB.reports[foundIdx]] };
      }
    }
  }

  // 20. UPDATE properties flagging/availability
  if (stmt.startsWith('update properties')) {
    if (stmt.includes('is_flagged = $1') && stmt.includes('property_id = $2')) {
      const propIdx = localDB.properties.findIndex(p => p.property_id === params[1]);
      if (propIdx !== -1) {
        localDB.properties[propIdx].is_flagged = !!params[0];
        localDB.properties[propIdx].updated_at = new Date();
        return { rows: [localDB.properties[propIdx]] };
      }
    }
    if (stmt.includes('availability = $1') && stmt.includes('property_id = $2')) {
      const propIdx = localDB.properties.findIndex(p => p.property_id === params[1]);
      if (propIdx !== -1) {
        localDB.properties[propIdx].availability = params[0];
        localDB.properties[propIdx].updated_at = new Date();
        return { rows: [localDB.properties[propIdx]] };
      }
    }
  }

  // 21. UPDATE contacts flagging
  if (stmt.startsWith('update contacts')) {
    if (stmt.includes('is_flagged = $1') && stmt.includes('contact_id = $2')) {
      const cIdx = localDB.contacts.findIndex(c => c.contact_id === params[1]);
      if (cIdx !== -1) {
        localDB.contacts[cIdx].is_flagged = !!params[0];
        return { rows: [localDB.contacts[cIdx]] };
      }
    }
  }

  return { rows: [] };
}
