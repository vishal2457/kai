import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const modelStatus = sqliteTable('model_status', {
  id: integer('id').primaryKey(),
  isLoaded: integer('is_loaded', { mode: 'boolean' }).notNull(),
  modelPath: text('model_path'),
  provider: text('provider'), // e.g. 'local', 'gemini', 'openai'
  providerConfig: text('provider_config'), // JSON string for API keys, etc.
});