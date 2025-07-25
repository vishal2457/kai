import { db } from "@/lib/db";
import { modelStatus } from "@/lib/db/schema/model-status.schema";
import { eq } from "drizzle-orm";

export async function getModelStatus() {
  const rows = await db.select().from(modelStatus).where(eq(modelStatus.id, 1));
  if (rows.length > 0) {
    return {
      isLoaded: rows[0].isLoaded,
      modelPath: rows[0].modelPath,
      provider: rows[0].provider || 'local',
      providerConfig: rows[0].providerConfig ? JSON.parse(rows[0].providerConfig) : {},
    };
  } else {
    return { isLoaded: false, modelPath: null, provider: 'local', providerConfig: {} };
  }
}

export async function setProvider(provider: string, providerConfig: any = {}, isLoaded = false, modelPath: string | null = null) {
  await db.delete(modelStatus);
  await db.insert(modelStatus).values({
    id: 1,
    isLoaded: provider === 'local' ? isLoaded : false,
    modelPath: provider === 'local' ? modelPath : null,
    provider,
    providerConfig: JSON.stringify(providerConfig),
  });
}

export async function deleteModelStatus() {
  await db.delete(modelStatus);
} 