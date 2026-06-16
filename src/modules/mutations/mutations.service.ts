import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TransType, Prisma } from 'generated/prisma/client';

export interface GetMutationsParams {
  walletId?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class MutationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: GetMutationsParams) {
    const { walletId, startDate, endDate, type, search, limit, offset } =
      params;

    const transactionFilter: Prisma.TransactionWhereInput = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDate) {
        dateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.lte = new Date(endDate);
      }
      transactionFilter.date = dateFilter;
    }

    if (type && Object.values(TransType).includes(type as TransType)) {
      transactionFilter.type = type as TransType;
    }

    if (search) {
      transactionFilter.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const whereClause: Prisma.MutationWhereInput = {
      deletedAt: null,
      transaction: transactionFilter,
    };

    if (walletId) {
      whereClause.walletId = walletId;
    }

    // Get current wallet balance if walletId is provided
    let currentBalance = 0;
    if (walletId) {
      const wallet = await this.prisma.wallet.findFirst({
        where: { id: walletId, deletedAt: null },
      });
      currentBalance = wallet ? wallet.balance : 0;
    }

    // Calculate sum of positive mutations (inflow) and negative mutations (outflow)
    const inflowSum = await this.prisma.mutation.aggregate({
      where: {
        ...whereClause,
        amount: { gt: 0 },
      },
      _sum: {
        amount: true,
      },
    });

    const outflowSum = await this.prisma.mutation.aggregate({
      where: {
        ...whereClause,
        amount: { lt: 0 },
      },
      _sum: {
        amount: true,
      },
    });

    const totalInflow = inflowSum._sum.amount || 0;
    const totalOutflow = Math.abs(outflowSum._sum.amount || 0);
    const netChange = totalInflow - totalOutflow;

    let beginningBalance = 0;
    let endingBalance = 0;

    if (walletId) {
      const transactionFilter: Prisma.TransactionWhereInput = {
        deletedAt: null,
      };

      if (endDate) {
        transactionFilter.date = {
          gt: new Date(endDate),
        };
      } else {
        transactionFilter.date = {
          gt: new Date(),
        };
      }

      const afterRangeClause: Prisma.MutationWhereInput = {
        deletedAt: null,
        walletId: walletId,
        transaction: transactionFilter,
      };

      const afterRangeSum = await this.prisma.mutation.aggregate({
        where: afterRangeClause,
        _sum: {
          amount: true,
        },
      });

      const sumAfterRange = afterRangeSum._sum.amount || 0;
      endingBalance = currentBalance - sumAfterRange;
      beginningBalance = endingBalance - netChange;
    }

    const total = await this.prisma.mutation.count({
      where: whereClause,
    });

    const data = await this.prisma.mutation.findMany({
      where: whereClause,
      orderBy: [
        {
          transaction: {
            date: 'desc',
          },
        },
        {
          createdAt: 'desc',
        },
      ],
      take: limit || 20,
      skip: offset || 0,
      include: {
        wallet: true,
        transaction: {
          include: {
            category: true,
            fromWallet: true,
            toWallet: true,
          },
        },
      },
    });

    // Calculate beginning and ending balances if walletId is provided and we have data
    let mutationsWithBalances = data.map((m) => ({
      ...m,
      beginningBalance: 0,
      endingBalance: 0,
    }));

    if (walletId && data.length > 0) {
      const firstItem = data[0];
      const newerMutationsSum = await this.prisma.mutation.aggregate({
        where: {
          deletedAt: null,
          walletId: walletId,
          transaction: {
            deletedAt: null,
          },
          OR: [
            {
              transaction: {
                date: { gt: firstItem.transaction.date },
              },
            },
            {
              transaction: {
                date: firstItem.transaction.date,
              },
              createdAt: { gt: firstItem.createdAt },
            },
          ],
        },
        _sum: {
          amount: true,
        },
      });

      const sumAfter = newerMutationsSum._sum.amount || 0;
      let runningEndingBalance = currentBalance - sumAfter;

      mutationsWithBalances = data.map((m) => {
        const endingBalance = runningEndingBalance;
        const beginningBalance = endingBalance - m.amount;
        runningEndingBalance = beginningBalance;

        return {
          ...m,
          beginningBalance,
          endingBalance,
        };
      });
    }

    return {
      data: mutationsWithBalances,
      total,
      summary: {
        totalInflow,
        totalOutflow,
        netChange,
        beginningBalance,
        endingBalance,
      },
    };
  }
}
