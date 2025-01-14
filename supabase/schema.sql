-- Drop existing table if it exists
DROP TABLE IF EXISTS assets;

-- Create assets table
CREATE TABLE assets (
    id BIGSERIAL PRIMARY KEY,
    asset_number TEXT NOT NULL,
    name TEXT NOT NULL,
    tracking_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    completion_date TIMESTAMP WITH TIME ZONE,
    completed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 