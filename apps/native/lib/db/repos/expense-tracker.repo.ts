import { db } from "@/lib/db";
import { transaction } from "@/lib/db/schema/transaction.schema";
import { category } from "@/lib/db/schema/category.schema";
import { eq, gte, lte, and } from "drizzle-orm";
import { z } from "zod";

export const TransactionInputSchema = z.object({
  amount: z.number().positive().min(0.01),
  description: z.string().optional().nullable(),
  item: z.string().optional().nullable(),
  category: z.string().min(1),
  type: z.enum(["credit", "debit"]).default("debit"),
});

export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export async function resolveCategory(categoryName: string, type: "credit" | "debit") {
  try {
    let catRows = await db.select().from(category).where(eq(category.name, categoryName));
    
    if (!catRows || catRows.length === 0) {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const [newCat] = await db.insert(category).values({ id, name: categoryName, type: type === "credit" ? "income" : "expense" }).returning();

      return newCat.id;
    } else {
      return catRows[0].id;
    }
  } catch (error) {
    console.error("Error in resolveCategory:", error);
    throw error;
  }
}

export async function addTransaction(parsed: any, userId?: string) {
  try {
    const validated = TransactionInputSchema.parse(parsed);
    const catId = await resolveCategory(validated.category, validated.type);
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

    const payload = {
      id,
      amount: validated.amount,
      date: new Date().getTime(),
      description: validated.description,
      item: validated.item,
      categoryId: catId,
      type: validated.type,
      userId: userId || null,
    }

    await db.insert(transaction).values(payload);
  } catch (error) {
    console.error("Error in addTransaction:", error);
    throw error;
  }
}

export async function getTransactions({ startDate, endDate }: { startDate?: number; endDate?: number } = {}) {

  if (startDate !== undefined && endDate !== undefined) {
    return await db
      .select()
      .from(transaction)
      .where(
        and(
          gte(transaction.date, startDate),
          lte(transaction.date, endDate),
          eq(transaction.type, "debit")
        )
      );
  } else {
    return await db
      .select()
      .from(transaction)
      .where(eq(transaction.type, "debit"));
  }
}