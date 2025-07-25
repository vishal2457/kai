import { Platform } from "react-native";
import { initLlama, LlamaContext } from "llama.rn";
import { db, modelStatus } from "@/lib/db";
import { eq } from "drizzle-orm";
import { addTransaction as repoAddTransaction } from "./db/repos/expense-tracker.repo";
import { getModelStatus, setProvider as repoSetProvider, deleteModelStatus } from "@/lib/db/repos/model-status.repo";
import axios from "axios";

export type ModelStatus = {
  isLoaded: boolean;
  modelPath: string | null;
  provider?: string;
  providerConfig?: any;
};

// Provider handler interface
interface ProviderHandler {
  chat(input: string, config: any): Promise<string>;
  parseExpense?(message: string, config: any): Promise<any>;
  report?(transactions: any[], config: any): Promise<any[]>;
  generateDataQuery?(userQuery: string, config: any): Promise<any>;
  conversationalReport?(userQuery: string, data: any, config: any): Promise<string>;
  generateSQLQuery?(userQuery: string, schema: string, config: any): Promise<string>;
  conversationalReportFromSQL?(userQuery: string, sql: string, data: any, config: any): Promise<string>;
}

const GeminiProvider: ProviderHandler = {
  async chat(input, config) {
    if (!config?.apiKey) throw new Error('Gemini API key not set');
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        contents: [
          { parts: [{ text: input }] }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
      }
    );
    const data = response.data;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },
  async parseExpense(message, config) {
    const systemPrompt = `Extract expense as JSON:\n{"amount": number, "description": "string", "category": "food|transport|shopping|rent|other", "item"?: "string", "type"?: "debit|credit" }\n"20 snacks" → {"amount": 20, "description": "snacks", "category": "food", "item": "snacks"}`;
    const input = `${systemPrompt}\n${message}`;
    const text = await GeminiProvider.chat(input, config);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse transaction JSON");
    return JSON.parse(match[0]);
  },
  async report(transactions, config) {
    if (!config?.apiKey) throw new Error('Gemini API key not set');
    const compactTxns = transactions.map(t => ({ category: t.category, amount: t.amount }));
    const systemPrompt = `Summarize expenses by category as JSON: [{"category": string, "total": number}]
Input: ${JSON.stringify(compactTxns)}\nOutput:`;
    const text = await GeminiProvider.chat(systemPrompt, config);
    const match = text.match(/\[.*\]/s);
    if (!match) throw new Error("Could not parse report JSON");
    return JSON.parse(match[0]);
  },
  async generateDataQuery(userQuery, config) {
    if (!config?.apiKey) throw new Error('Gemini API key not set');
    const prompt = `Given the following user query, generate a JSON filter for querying a transaction database.\nExample: {\"category\":\"food\",\"startDate\":1700000000000,\"endDate\":1700600000000}\nUser Query: "${userQuery}"\nFilter:`;
    const text = await GeminiProvider.chat(prompt, config);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse query filter JSON");
    return JSON.parse(match[0]);
  },
  async conversationalReport(userQuery, data, config) {
    if (!config?.apiKey) throw new Error('Gemini API key not set');
    const prompt = `User asked: "${userQuery}"\nHere is the result data: ${JSON.stringify(data)}\nPlease provide a helpful, conversational answer for the user based on the data.`;
    return GeminiProvider.chat(prompt, config);
  },
  async generateSQLQuery(userQuery, schema, config) {
    if (!config?.apiKey) throw new Error('Gemini API key not set');
    const prompt = `Given the following user query and database schema, generate an executable SQLite SQL query.\nSCHEMA:\n${schema}\nUSER QUERY: "${userQuery}"\nSQL:`;
    const text = await GeminiProvider.chat(prompt, config);
    // Extract the first SQL statement (until first semicolon)
    const match = text.match(/SELECT[\s\S]*?;/i);
    if (!match) throw new Error("Could not parse SQL query");
    return match[0];
  },
  async conversationalReportFromSQL(userQuery, sql, data, config) {
    if (!config?.apiKey) throw new Error('Gemini API key not set');
    const prompt = `User asked: "${userQuery}"\nSQL used: ${sql}\nResult data: ${JSON.stringify(data)}\nPlease provide a helpful, conversational answer for the user based on the data.`;
    return GeminiProvider.chat(prompt, config);
  },
};

const LocalProvider: ProviderHandler = {
  async chat(input, _config) {
    if (!llamaService.llamaContext) throw new Error("Model not loaded");
    const stopWords = [
      "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>", "<|end_of_turn|>", "<|endoftext|>",
    ];
    const result = await llamaService.llamaContext.completion({
      messages: [
        { role: "system", content: "This is a conversation between user and assistant, a friendly chatbot." },
        { role: "user", content: input },
      ],
      n_predict: 100,
      stop: stopWords,
    });
    return result.text;
  },
  async parseExpense(message, _config) {
    if (!llamaService.llamaContext) throw new Error("Model not loaded");
    const stopWords = [
      "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>", "<|end_of_turn|>", "<|endoftext|>",
    ];
    const systemPrompt = `Extract expense as JSON:\n{"amount": number, "description": "string", "category": "food|transport|shopping|rent|other", "item"?: "string", "type"?: "debit|credit" }\n"20 snacks" → {"amount": 20, "description": "snacks", "category": "food", "item": "snacks"}`;
    const result = await llamaService.llamaContext.completion({
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
  },
  async report(transactions, _config) {
    if (!llamaService.llamaContext) throw new Error("Model not loaded");
    const compactTxns = transactions.map(t => ({ category: t.category, amount: t.amount }));
    const systemPrompt = `Summarize expenses by category as JSON: [{\"category\": string, \"total\": number}]
Input: ${JSON.stringify(compactTxns)}\nOutput:`;
    const stopWords = [
      "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>", "<|end_of_turn|>", "<|endoftext|>",
    ];
    const result = await llamaService.llamaContext.completion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Summarize." },
      ],
      n_predict: 200,
      stop: stopWords,
    });
    const match = result.text.match(/\[.*\]/s);
    if (!match) throw new Error("Could not parse report JSON");
    return JSON.parse(match[0]);
  },
  async generateDataQuery(userQuery, _config) {
    if (!llamaService.llamaContext) throw new Error("Model not loaded");
    const stopWords = [
      "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>", "<|end_of_turn|>", "<|endoftext|>",
    ];
    const prompt = `Given the following user query, generate a JSON filter for querying a transaction database.\nExample: {\"category\":\"food\",\"startDate\":1700000000000,\"endDate\":1700600000000}\nUser Query: "${userQuery}"\nFilter:`;
    const result = await llamaService.llamaContext.completion({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userQuery },
      ],
      n_predict: 200,
      stop: stopWords,
    });
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse query filter JSON");
    return JSON.parse(match[0]);
  },
  async conversationalReport(userQuery, data, _config) {
    if (!llamaService.llamaContext) throw new Error("Model not loaded");
    const stopWords = [
      "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>", "<|end_of_turn|>", "<|endoftext|>",
    ];
    const prompt = `User asked: "${userQuery}"\nHere is the result data: ${JSON.stringify(data)}\nPlease provide a helpful, conversational answer for the user based on the data.`;
    const result = await llamaService.llamaContext.completion({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userQuery },
      ],
      n_predict: 200,
      stop: stopWords,
    });
    return result.text;
  },
  async generateSQLQuery(userQuery, schema, _config) {
    if (!llamaService.llamaContext) throw new Error("Model not loaded");
    const stopWords = [
      "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>", "<|end_of_turn|>", "<|endoftext|>",
    ];
    const prompt = `Given the following user query and database schema, generate an executable SQLite SQL query.\nSCHEMA:\n${schema}\nUSER QUERY: "${userQuery}"\nSQL:`;
    const result = await llamaService.llamaContext.completion({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userQuery },
      ],
      n_predict: 200,
      stop: stopWords,
    });
    const match = result.text.match(/SELECT[\s\S]*?;/i);
    if (!match) throw new Error("Could not parse SQL query");
    return match[0];
  },
  async conversationalReportFromSQL(userQuery, sql, data, _config) {
    if (!llamaService.llamaContext) throw new Error("Model not loaded");
    const stopWords = [
      "</s>", "<|end|>", "<|eot_id|>", "<|end_of_text|>", "<|im_end|>", "<|EOT|>", "<|END_OF_TURN_TOKEN|>", "<|end_of_turn|>", "<|endoftext|>",
    ];
    const prompt = `User asked: "${userQuery}"\nSQL used: ${sql}\nResult data: ${JSON.stringify(data)}\nPlease provide a helpful, conversational answer for the user based on the data.`;
    const result = await llamaService.llamaContext.completion({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userQuery },
      ],
      n_predict: 200,
      stop: stopWords,
    });
    return result.text;
  },
};

const PROVIDERS: Record<string, ProviderHandler> = {
  local: LocalProvider,
  gemini: GeminiProvider,
};

class LlamaService {
  public llamaContext: LlamaContext | null = null;
  private modelStatus: ModelStatus = { isLoaded: false, modelPath: null, provider: 'local', providerConfig: {} };
  private loading: boolean = false;
  private error: string | null = null;

  async checkModelStatus(): Promise<ModelStatus> {
    const status = await getModelStatus();
    this.modelStatus = status;
    console.log("Model status", this.modelStatus);
    return this.modelStatus;
  }

  async loadModel(modelPath?: string): Promise<LlamaContext | null> {
    try {
      this.loading = true;
      this.error = null;
      let path = modelPath || this.modelStatus.modelPath;
      if (!path) {
        throw new Error("No model path provided");
      }
      console.log("Loading model", path);
      this.llamaContext = await initLlama({
        model: path,
        use_mlock: true,
        n_ctx: 1024,
        n_gpu_layers: Platform.OS === "ios" ? 99 : 1,
        n_batch: 128,
      });
      // Always delete any existing entry and insert a new one
      await db.delete(modelStatus);
      await db.insert(modelStatus).values({ id: 1, isLoaded: true, modelPath: path });
      this.modelStatus = { isLoaded: true, modelPath: path };
      return this.llamaContext;
    } catch (e: any) {
      console.log("Error loading model", e);
      this.error = e?.message || "Failed to load model";
      return null;
    } finally {
      this.loading = false;
    }
  }

  async setProvider(provider: string, providerConfig: any = {}) {
    await repoSetProvider(provider, providerConfig, provider === 'local' ? this.modelStatus.isLoaded : false, provider === 'local' ? this.modelStatus.modelPath : null);
    this.modelStatus = {
      isLoaded: provider === 'local' ? this.modelStatus.isLoaded : false,
      modelPath: provider === 'local' ? this.modelStatus.modelPath : null,
      provider,
      providerConfig,
    };
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
    const provider = this.modelStatus.provider || 'local';
    const handler = PROVIDERS[provider];
    if (!handler) throw new Error(`Provider not supported: ${provider}`);
    return handler.chat(input, this.modelStatus.providerConfig);
  }

  /**
   * Specialized agent for expense tracking: parses user message into transaction JSON.
   * Returns: { amount, date, description, item, category, type }
   */
  async parseExpenseMessage(message: string): Promise<any> {
    const provider = this.modelStatus.provider || 'local';
    const handler = PROVIDERS[provider];
    if (!handler || !handler.parseExpense) throw new Error(`Provider not supported: ${provider}`);
    return handler.parseExpense(message, this.modelStatus.providerConfig);
  }

  /**
   * Classifies user input as 'add' (add transaction) or 'report' (generate report).
   * Returns: 'add' | 'report'
   */
  async classifyIntentMessage(message: string): Promise<'add' | 'report'> {
    const provider = this.modelStatus.provider || 'local';
    const handler = PROVIDERS[provider];
    if (!handler || !handler.chat) throw new Error(`Provider not supported: ${provider}`);
    const prompt = `Classify the following input as either \"add\" (for adding a transaction) or \"report\" (for generating a report):\n\nInput: "${message}"\nOutput:`;
    const result = await handler.chat(prompt, this.modelStatus.providerConfig);
    if (result.toLowerCase().includes('add')) return 'add';
    if (result.toLowerCase().includes('report')) return 'report';
    // fallback
    return 'add';
  }

  /**
   * Generate a compact report from a list of transactions.
   * Returns: [{ category, total }]
   */
  async generateReport(transactions: any[]): Promise<any[]> {
    const provider = this.modelStatus.provider || 'local';
    const handler = PROVIDERS[provider];
    if (!handler || !handler.report) throw new Error(`Provider not supported: ${provider}`);
    return handler.report(transactions, this.modelStatus.providerConfig);
  }

  async generateDataQuery(userQuery: string): Promise<any> {
    const provider = this.modelStatus.provider || 'local';
    const handler = PROVIDERS[provider];
    if (!handler || !handler.generateDataQuery) throw new Error(`Provider does not support generateDataQuery: ${provider}`);
    return handler.generateDataQuery(userQuery, this.modelStatus.providerConfig);
  }
  async conversationalReport(userQuery: string, data: any): Promise<string> {
    const provider = this.modelStatus.provider || 'local';
    const handler = PROVIDERS[provider];
    if (!handler || !handler.conversationalReport) throw new Error(`Provider does not support conversationalReport: ${provider}`);
    return handler.conversationalReport(userQuery, data, this.modelStatus.providerConfig);
  }

  async generateSQLQuery(userQuery: string, schema: string): Promise<string> {
    const provider = this.modelStatus.provider || 'local';
    const handler = PROVIDERS[provider];
    if (!handler || !handler.generateSQLQuery) throw new Error(`Provider does not support generateSQLQuery: ${provider}`);
    return handler.generateSQLQuery(userQuery, schema, this.modelStatus.providerConfig);
  }
  async conversationalReportFromSQL(userQuery: string, sql: string, data: any): Promise<string> {
    const provider = this.modelStatus.provider || 'local';
    const handler = PROVIDERS[provider];
    if (!handler || !handler.conversationalReportFromSQL) throw new Error(`Provider does not support conversationalReportFromSQL: ${provider}`);
    return handler.conversationalReportFromSQL(userQuery, sql, data, this.modelStatus.providerConfig);
  }

  // Remove model: delete file, unload, and delete DB entry
  async removeModel(): Promise<void> {
    if (this.modelStatus.modelPath) {
      try {
        const fs = await import('expo-file-system');
        await fs.deleteAsync(this.modelStatus.modelPath, { idempotent: true });
      } catch (e) {
        // Ignore file not found or deletion errors
      }
    }
    this.llamaContext = null;
    this.modelStatus = { isLoaded: false, modelPath: null, provider: 'local', providerConfig: {} };
    await deleteModelStatus();
  }
}

const llamaService = new LlamaService();
export default llamaService; 