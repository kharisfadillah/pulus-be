import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(query: DashboardQueryDto) {
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = query.startDate
      ? new Date(query.startDate)
      : defaultStart;
    const endDate = query.endDate ? new Date(query.endDate) : now;

    // 1. Wallets Summary
    const wallets = await this.prisma.wallet.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const totalBalance = wallets.reduce(
      (sum, wallet) => sum + wallet.balance,
      0,
    );

    // 2. Transactions in Range
    const transactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryExpenseMap = new Map<
      string,
      { name: string; color: string; amount: number }
    >();

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        totalIncome += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        totalExpense += tx.amount;

        const cat = tx.category;
        const existing = categoryExpenseMap.get(cat.id);
        if (existing) {
          existing.amount += tx.amount;
        } else {
          categoryExpenseMap.set(cat.id, {
            name: cat.name,
            color: cat.color,
            amount: tx.amount,
          });
        }
      }
    }

    const netSavings = totalIncome - totalExpense;

    // 3. Expense by Category
    const totalCategoryExpense = Array.from(categoryExpenseMap.values()).reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const expenseByCategory = Array.from(categoryExpenseMap.entries())
      .map(([id, item]) => ({
        categoryId: id,
        categoryName: item.name,
        color: item.color,
        amount: item.amount,
        percentage:
          totalCategoryExpense > 0
            ? parseFloat(
                ((item.amount / totalCategoryExpense) * 100).toFixed(2),
              )
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 4. Recent Transactions (Overall latest 5)
    const recentTransactions = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
      take: 5,
      include: {
        category: true,
        fromWallet: true,
        toWallet: true,
      },
    });

    // 5. Cash Flow Trend (Daily)
    const dailyDataMap = new Map<string, { income: number; expense: number }>();
    const tempDate = new Date(startDate);
    // Limit loop protection to avoid infinite loop on invalid dates
    let loopCount = 0;
    while (tempDate <= endDate && loopCount < 366) {
      const dateStr = tempDate.toISOString().split('T')[0];
      dailyDataMap.set(dateStr, { income: 0, expense: 0 });
      tempDate.setDate(tempDate.getDate() + 1);
      loopCount++;
    }

    for (const tx of transactions) {
      const dateStr = tx.date.toISOString().split('T')[0];
      const existing = dailyDataMap.get(dateStr);
      if (existing) {
        if (tx.type === 'INCOME') {
          existing.income += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          existing.expense += tx.amount;
        }
      } else {
        // If transaction falls slightly out of loop due to timezone shifting
        dailyDataMap.set(dateStr, {
          income: tx.type === 'INCOME' ? tx.amount : 0,
          expense: tx.type === 'EXPENSE' ? tx.amount : 0,
        });
      }
    }

    const cashFlowTrend = Array.from(dailyDataMap.entries())
      .map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      wallets: {
        totalBalance,
        list: wallets,
      },
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      expenseByCategory,
      recentTransactions,
      cashFlowTrend,
    };
  }
}
