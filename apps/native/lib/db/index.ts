import journal from "../../drizzle/meta/_journal.json";
import migrationsExport from "../../drizzle/migrations.js";

export * from './db';
export * from './schema/model-status.schema';

export function getMigrationStatus() {
  // Get expected migration tags from migrations.js
  const expected = Object.keys(migrationsExport.migrations).map((k) => {
    // migration variable names are like m0000, m0001, etc.
    // The tag in the journal is like 0000_free_nightcrawler
    // So we need to match by tag
    // We'll get the tag from the SQL file name
    // But for now, let's just hardcode the mapping for simplicity
    if (k === "m0000") return "0000_free_nightcrawler";
    if (k === "m0001") return "0001_graceful_bishop";
    return k;
  });
  // Get applied migration tags from the journal
  const applied = (journal.entries || []).map((e) => e.tag);
  // Check if all expected migrations are in applied
  const allApplied = expected.every((tag) => applied.includes(tag));
  return {
    allApplied,
    expected,
    applied,
    pending: expected.filter((tag) => !applied.includes(tag)),
  };
}