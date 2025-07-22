import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const modelStatus = sqliteTable('model_status', {
  id: integer('id').primaryKey(),
  isLoaded: integer('is_loaded', { mode: 'boolean' }).notNull(),
  modelPath: text('model_path'),
});