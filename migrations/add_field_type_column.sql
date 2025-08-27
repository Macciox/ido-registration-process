-- Add field_type column to checker_items table
ALTER TABLE checker_items ADD COLUMN field_type TEXT;
ALTER TABLE checker_items ADD COLUMN scoring_logic TEXT;