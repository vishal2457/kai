ALTER TABLE model_status ADD COLUMN provider text;
ALTER TABLE model_status ADD COLUMN provider_config text;
-- Optionally migrate existing data here
ALTER TABLE model_status DROP COLUMN mode;
ALTER TABLE model_status DROP COLUMN gemini_api_key; 