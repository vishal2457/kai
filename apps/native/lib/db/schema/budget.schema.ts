import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { category } from './category.schema';

export const budget = sqliteTable('budget', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull(),
  amount: real('amount').notNull(),
  period: text('period').notNull(), // 'monthly', 'weekly', 'yearly'
  userId: text('user_id'), // nullable for now
}); 