import { Platform } from "react-native";
import { initLlama, LlamaContext } from "llama.rn";
import { db, modelStatus } from "@/lib/db";
import { eq } from "drizzle-orm";
import { addTransaction as repoAddTransaction } from "./db/repos/expense-tracker.repo";

export type ModelStatus = {
  isLoaded: boolean;
  modelPath: string | null;
};

class LlamaService {
  private llamaContext: LlamaContext | null = null;
  private modelStatus: ModelStatus = { isLoaded: false, modelPath: null };
  private loading: boolean = false;
  private error: string | null = null;

  async checkModelStatus(): Promise<ModelStatus> {
    const rows = await db.select().from(modelStatus).where(eq(modelStatus.id, 1));
    if (rows.length > 0 && rows[0].isLoaded && rows[0].modelPath) {
      this.modelStatus = { isLoaded: true, modelPath: rows[0].modelPath };
    } else {
      this.modelStatus = { isLoaded: false, modelPath: null };
    }
    return this.modelStatus;
  }

  async loadModel(modelPath?: string): Promise<LlamaContext | null> {
    this.loading = true;
    this.error = null;
    try {
      let path = modelPath || this.modelStatus.modelPath;
      if (!path) {
        throw new Error("No model path provided");
      }
      this.llamaContext = await initLlama({
        model: path,
        use_mlock: true,
        n_ctx: 1024,
        n_gpu_layers: Platform.OS === "ios" ? 99 : 1,
        n_batch: 128,
      });
      this.modelStatus = { isLoaded: true, modelPath: path };
      return this.llamaContext;
    } catch (e: any) {
      this.error = e?.message || "Failed to load model";
      throw e;
    } finally {
      this.loading = false;
    }
  }

  getLlamaContext(): LlamaContext | null {
    return this.llamaContext;
  }

  getModelStatusSync(): ModelStatus {
    return this.modelStatus;
  }

  isLoading(): boolean {
    return this.loading;
  }

  getError(): string | null {
    return this.error;
  }

  async chatWithModel(input: string): Promise<string> {
    if (!this.llamaContext) throw new Error("Model not loaded");
    const stopWords = [
      "</s>",
      "<|end|>",
      "<|eot_id|>",
      "<|end_of_text|>",
      "<|im_end|>",
      "<|EOT|>",
      "<|END_OF_TURN_TOKEN|>",
      "<|end_of_turn|>",
      "<|endoftext|>",
    ];
    const result = await this.llamaContext.completion({
      messages: [
        {
          role: "system",
          content: "This is a conversation between user and assistant, a friendly chatbot.",
        },
        {
          role: "user",
          content: input,
        },
      ],
      n_predict: 100,
      stop: stopWords,
    });
    return result.text;
  }

  /**
   * Specialized agent for expense tracking: parses user message into transaction JSON.
   * Returns: { amount, date, description, item, category, type }
   */
  async parseExpenseMessage(message: string): Promise<any> {
    if (!this.llamaContext) throw new Error("Model not loaded");
    const stopWords = [
      "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>", "<|end_of_turn|>", "<|endoftext|>",
    ];
    const systemPrompt = `Extract expense as JSON:
{"amount": number, "description": "string", "category": "food|transport|shopping|rent|other", "item"?: "string", "type"?: "debit|credit" }
"20 snacks" → {"amount": 20, "description": "snacks", "category": "food", "item": "snacks"}`;

    const result = await this.llamaContext.completion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      n_predict: 200,
      stop: stopWords,
    });

    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse transaction JSON");
    return JSON.parse(match[0]);
  }
}

const llamaService = new LlamaService();
export default llamaService; 