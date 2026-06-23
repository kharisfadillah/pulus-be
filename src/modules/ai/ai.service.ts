import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AiProvider } from './providers/ai-provider.interface';
import { TransactionsService } from '../transactions/transactions.service';
import { CategoriesService } from '../categories/categories.service';
import { WalletsService } from '../wallets/wallets.service';
import { TransType } from 'generated/prisma/client';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CreateCategoryDto } from '../categories/dto/create-category.dto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CreateWalletDto } from '../wallets/dto/create-wallet.dto';

@Injectable()
export class AiService {
  constructor(
    @Inject('AI_PROVIDER') private aiProvider: AiProvider,
    private prisma: PrismaService,
    private transactionsService: TransactionsService,
    private categoriesService: CategoriesService,
    private walletsService: WalletsService,
  ) {}

  async sendMessage(message: string, userId: string) {
    // 1. Fetch categories and wallets for context
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    const wallets = await this.prisma.wallet.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch financial summary context
    const financialSummary = await this.getFinancialSummary();

    // 3. Call AI provider to parse message
    const currentDate = new Date().toISOString().split('T')[0];
    const aiResult = await this.aiProvider.parseMessage(message, {
      categories,
      wallets,
      currentDate,
      financialSummary,
    });

    // 4. Save user message to database
    await this.prisma.aiChatMessage.create({
      data: {
        userId,
        role: 'user',
        message,
      },
    });

    let referenceId: string | null = null;

    // 5. Execute action if confidence is sufficient
    if (aiResult.confidence >= 0.7) {
      try {
        if (
          aiResult.action === 'CREATE_TRANSACTION' &&
          aiResult.transactionData
        ) {
          // Double check category and wallet exist
          const catExists = categories.find(
            (c) => c.id === aiResult.transactionData?.categoryId,
          );
          const walletExists = wallets.find(
            (w) => w.id === aiResult.transactionData?.fromWalletId,
          );

          if (!catExists || !walletExists) {
            // Suggest alternatives / switch to GENERAL_CHAT
            aiResult.action = 'GENERAL_CHAT';
            aiResult.explanation = `Maaf, saya tidak dapat membuat transaksi karena kategori atau dompet tidak valid. Kategori yang tersedia: ${categories.map((c) => c.name).join(', ')}. Dompet yang tersedia: ${wallets.map((w) => w.name).join(', ')}.`;
          } else {
            const tx = await this.transactionsService.create(
              {
                ...aiResult.transactionData,
                isCreatedByAi: true,
              },
              userId,
            );
            referenceId = tx.id;
          }
        } else if (
          aiResult.action === 'CREATE_CATEGORY' &&
          aiResult.categoryData
        ) {
          const cat = await this.categoriesService.create(
            {
              ...aiResult.categoryData,
              isCreatedByAi: true,
            },
            userId,
          );
          referenceId = cat.id;
        } else if (aiResult.action === 'CREATE_WALLET' && aiResult.walletData) {
          const wallet = await this.walletsService.create(
            {
              ...aiResult.walletData,
              isCreatedByAi: true,
            },
            userId,
          );
          referenceId = wallet.id;
        }
      } catch (err) {
        console.error('Error executing AI action:', err);
        aiResult.action = 'GENERAL_CHAT';
        aiResult.explanation = `Maaf, terjadi kesalahan saat mencoba memproses aksi ini secara otomatis: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}.`;
      }
    }

    // 6. Save model reply to database
    const modelMessage = await this.prisma.aiChatMessage.create({
      data: {
        userId,
        role: 'model',
        message: aiResult.explanation,
        actionType: aiResult.action,
        referenceId,
      },
    });

    return {
      ...aiResult,
      messageId: modelMessage.id,
    };
  }

  async getChatHistory(userId: string) {
    return this.prisma.aiChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async undoAction(messageId: string, userId: string) {
    const message = await this.prisma.aiChatMessage.findFirst({
      where: { id: messageId, userId, role: 'model' },
    });

    if (!message) {
      throw new NotFoundException('Pesan respon AI tidak ditemukan.');
    }

    if (!message.referenceId || !message.actionType) {
      throw new BadRequestException(
        'Pesan AI ini tidak memiliki aksi yang dapat dibatalkan.',
      );
    }

    const { referenceId, actionType } = message;

    // 1. Delete/revert database object
    if (actionType === 'CREATE_TRANSACTION') {
      await this.transactionsService.remove(referenceId, userId);
    } else if (actionType === 'CREATE_CATEGORY') {
      await this.categoriesService.remove(referenceId, userId);
    } else if (actionType === 'CREATE_WALLET') {
      await this.walletsService.remove(referenceId, userId);
    }

    // 2. Remove the AI reply and the user message immediately preceding it
    const userMessage = await this.prisma.aiChatMessage.findFirst({
      where: {
        userId,
        role: 'user',
        createdAt: { lt: message.createdAt },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (userMessage) {
      await this.prisma.aiChatMessage.delete({ where: { id: userMessage.id } });
    }
    await this.prisma.aiChatMessage.delete({ where: { id: message.id } });

    return { success: true };
  }

  private async getFinancialSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeTransactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        date: { gte: startOfMonth },
      },
      include: {
        category: true,
        fromWallet: true,
        toWallet: true,
      },
    });

    let totalIncomeThisMonth = 0;
    let totalExpenseThisMonth = 0;

    activeTransactions.forEach((tx) => {
      if (tx.type === TransType.INCOME) {
        totalIncomeThisMonth += tx.amount;
      } else if (tx.type === TransType.EXPENSE) {
        totalExpenseThisMonth += tx.amount;
      }
    });

    const wallets = await this.prisma.wallet.findMany({
      where: { deletedAt: null },
    });

    const balancePerWallet = wallets.map((w) => ({
      walletName: w.name,
      balance: w.balance,
    }));

    // Group expense by category
    const categoryExpensesMap: Record<string, number> = {};
    activeTransactions
      .filter((tx) => tx.type === TransType.EXPENSE)
      .forEach((tx) => {
        const catName = tx.category.name;
        categoryExpensesMap[catName] =
          (categoryExpensesMap[catName] || 0) + tx.amount;
      });

    const expensePerCategoryThisMonth = Object.entries(categoryExpensesMap).map(
      ([categoryName, amount]) => ({
        categoryName,
        amount,
      }),
    );

    const recentTransactions = activeTransactions.slice(0, 5).map((tx) => ({
      date: tx.date.toISOString().split('T')[0],
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
    }));

    return {
      totalIncomeThisMonth,
      totalExpenseThisMonth,
      balancePerWallet,
      expensePerCategoryThisMonth,
      recentTransactions,
    };
  }
}
