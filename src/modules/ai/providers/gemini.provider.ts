import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiProvider, AiParseResult } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY environment variable is not defined',
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async parseMessage(
    message: string,
    context: {
      categories: any[];
      wallets: any[];
      currentDate: string;
      financialSummary?: {
        totalIncomeThisMonth: number;
        totalExpenseThisMonth: number;
        balancePerWallet: { walletName: string; balance: number }[];
        expensePerCategoryThisMonth: { categoryName: string; amount: number }[];
        recentTransactions: {
          date: string;
          description: string;
          amount: number;
          type: string;
        }[];
      };
    },
  ): Promise<AiParseResult> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const categoryIconsList = [
      'ShoppingBag',
      'Utensils',
      'Car',
      'Home',
      'Heart',
      'PiggyBank',
      'TrendingUp',
      'Gift',
      'Wrench',
      'Shield',
      'Tag',
      'Briefcase',
      'BookOpen',
      'Coffee',
      'Activity',
      'Plane',
      'Tv',
      'Wifi',
    ];

    const walletIconsList = [
      'Wallet',
      'CreditCard',
      'Coins',
      'Banknote',
      'Building',
      'PiggyBank',
      'Percent',
      'Briefcase',
      'ShieldAlert',
    ];

    const colorsList = [
      '#10b981',
      '#f43f5e',
      '#0ea5e9',
      '#6366f1',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#64748b',
    ];

    const systemInstruction = `
You are Pulus AI, a smart financial assistant. Your job is to parse the user's message, classify the user's intent (action), and return a structured JSON response.

Here is the current context database:
- Current date: "${context.currentDate}"
- Existing categories: ${JSON.stringify(context.categories)}
- Existing wallets: ${JSON.stringify(context.wallets)}
- Financial summary: ${JSON.stringify(context.financialSummary || {})}

Allowed Category Icons: ${JSON.stringify(categoryIconsList)}
Allowed Wallet Icons: ${JSON.stringify(walletIconsList)}
Allowed Colors: ${JSON.stringify(colorsList)}

You must classify the user's input into one of these actions:
1. CREATE_TRANSACTION:
   - Use this if the user wants to record a transaction (income, expense, or transfer).
   - IMPORTANT: The wallet and category mentioned by the user MUST exist in the context database (case-insensitive name match).
   - If the wallet or category does not exist in the context:
     * DO NOT classify as CREATE_TRANSACTION.
     * Instead, classify as GENERAL_CHAT.
     * In the "explanation", explain that the category or wallet was not found, suggest the closest existing options (suggest alternatives), and ask if they would like to create it or use one of the existing ones.
   - If valid, identify:
     * type: 'INCOME', 'EXPENSE', or 'TRANSFER'.
     * amount: number.
     * description: string.
     * categoryId: ID of the matching category in the context.
     * fromWalletId: ID of the matching source wallet in the context.
     * toWalletId: (For TRANSFER only) ID of the matching target wallet.
     * date: ISO 8601 string of the transaction date (infer from "yesterday", "today", "2 days ago", or use "${context.currentDate}" if not specified).

2. CREATE_CATEGORY:
   - Use this if the user explicitly asks to create a new category (e.g., "tambahkan kategori baru bernama...").
   - Extract:
     * name: string.
     * type: 'INCOME', 'EXPENSE', or 'TRANSFER'.
     * icon: select the best matching icon from the Allowed Category Icons. Default is "Tag".
     * color: select the best matching color from the Allowed Colors. Default is "#10b981".

3. CREATE_WALLET:
   - Use this if the user explicitly asks to create a new wallet (e.g., "buat dompet baru bernama...").
   - Extract:
     * name: string.
     * balance: initial balance (number).
     * icon: select the best matching icon from the Allowed Wallet Icons. Default is "Wallet".
     * color: select the best matching color from the Allowed Colors. Default is "#10b981".

4. GENERAL_CHAT:
   - Use this for general questions, reports, greetings, off-topic chat, or when a referenced category/wallet is missing.
   - If the user asks about reports/statistics (e.g. "Berapa saldo dompet BNI?", "Pengeluaran terbesar bulan ini apa?"):
     * Formulate an answer based on the provided "financialSummary" data context.
     * Put this answer in the "explanation" field in neat Markdown format.
   - If off-topic (guardrails):
     * Kindly refuse and explain that you can only help with transaction recording, wallet management, or category management in Pulus.

You MUST reply with ONLY a JSON object matching this TypeScript interface:
interface AiParseResult {
  action: 'CREATE_TRANSACTION' | 'CREATE_CATEGORY' | 'CREATE_WALLET' | 'GENERAL_CHAT';
  explanation: string; // The response message you will say to the user. Explain what action is taken, or answer their question, or explain the missing entities and suggest alternatives.
  confidence: number;  // Confidence score (0 to 1)
  transactionData?: {
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    amount: number;
    description: string;
    categoryId: string;
    fromWalletId: string;
    toWalletId?: string;
    date: string;
  };
  categoryData?: {
    name: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    icon: string;
    color: string;
  };
  walletData?: {
    name: string;
    balance: number;
    icon: string;
    color: string;
  };
}
`;

    try {
      const result = await model.generateContent([
        { text: systemInstruction },
        { text: `User Message: "${message}"` },
      ]);

      const responseText = result.response.text();
      // Parse the JSON output
      const parsed = JSON.parse(
        responseText.trim(),
      ) as unknown as AiParseResult;
      return parsed;
    } catch (error) {
      console.error('Error in GeminiProvider parsing:', error);
      return {
        action: 'GENERAL_CHAT',
        explanation:
          'Maaf, saya mengalami kendala teknis saat memproses pesan Anda. Silakan coba lagi.',
        confidence: 0,
      };
    }
  }
}
