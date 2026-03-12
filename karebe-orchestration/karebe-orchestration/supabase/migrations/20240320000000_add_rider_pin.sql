-- Add PIN column to riders table for authentication
ALTER TABLE riders ADD COLUMN IF NOT EXISTS pin TEXT;

-- Update existing demo riders with PINs
UPDATE riders SET pin = '1111' WHERE phone = '+254712345678';
UPDATE riders SET pin = '2222' WHERE phone = '+254723456789';
UPDATE riders SET pin = '3333' WHERE phone = '+254734567890';

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_riders_phone_pin ON riders(phone, pin);
