-- Migration to add location pinning and verification check SOP item

-- 1. Add location fields to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS google_maps_place_id TEXT,
ADD COLUMN IF NOT EXISTS location_pinned_by UUID REFERENCES users(user_id),
ADD COLUMN IF NOT EXISTS location_pinned_at TIMESTAMPTZ;

-- 2. Add item_8_location_pinned column to verification_checks table
ALTER TABLE verification_checks
ADD COLUMN IF NOT EXISTS item_8_location_pinned TEXT NOT NULL DEFAULT 'Pending' 
CHECK (item_8_location_pinned IN ('Pass', 'Fail', 'N/A', 'Pending'));
