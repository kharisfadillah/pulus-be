export interface AiProvider {
  parseMessage(
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
  ): Promise<AiParseResult>;
}

export type AiAction =
  | 'CREATE_TRANSACTION'
  | 'CREATE_CATEGORY'
  | 'CREATE_WALLET'
  | 'GENERAL_CHAT';

export interface AiParseResult {
  action: AiAction;
  explanation: string; // Explanation message to show in chat
  confidence: number; // Confidence score (0 - 1)

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
    icon: string; // Icon name matching the presets
    color: string; // Hex color code
  };

  walletData?: {
    name: string;
    balance: number;
    icon: string;
    color: string;
  };
}
