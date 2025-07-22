import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { category } from './category.schema';

export const transaction = sqliteTable('transaction', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  date: integer('date').notNull(),
  description: text('description'),
  item: text('item'),
  categoryId: text('category_id').notNull(),
  type: text('type').notNull(),
  userId: text('user_id'),
}); 