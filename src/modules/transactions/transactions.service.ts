import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransType } from 'generated/prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    // 1. Validate Category
    const category = await this.prisma.category.findFirst({
      where: { id: createTransactionDto.categoryId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID "${createTransactionDto.categoryId}" not found.`,
      );
    }
    if (category.type !== createTransactionDto.type) {
      throw new BadRequestException(
        `Category type (${category.type}) does not match transaction type (${createTransactionDto.type}).`,
      );
    }

    // 2. Validate fromWallet
    const fromWallet = await this.prisma.wallet.findFirst({
      where: { id: createTransactionDto.fromWalletId, deletedAt: null },
    });
    if (!fromWallet) {
      throw new NotFoundException(
        `Wallet with ID "${createTransactionDto.fromWalletId}" not found.`,
      );
    }

    // 3. Validate TRANSFER properties
    if (createTransactionDto.type === TransType.TRANSFER) {
      if (!createTransactionDto.toWalletId) {
        throw new BadRequestException(
          'toWalletId is required for TRANSFER transaction.',
        );
      }
      if (
        createTransactionDto.toWalletId === createTransactionDto.fromWalletId
      ) {
        throw new BadRequestException(
          'fromWalletId and toWalletId must be different.',
        );
      }
      const toWallet = await this.prisma.wallet.findFirst({
        where: { id: createTransactionDto.toWalletId, deletedAt: null },
      });
      if (!toWallet) {
        throw new NotFoundException(
          `Wallet with ID "${createTransactionDto.toWalletId}" not found.`,
        );
      }
    }

    // 4. Run database operations in transaction
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          date: new Date(createTransactionDto.date),
          description: createTransactionDto.description,
          categoryId: createTransactionDto.categoryId,
          type: createTransactionDto.type,
          fromWalletId: createTransactionDto.fromWalletId,
          toWalletId:
            createTransactionDto.type === TransType.TRANSFER
              ? createTransactionDto.toWalletId
              : null,
          amount: createTransactionDto.amount,
          createdBy: userId,
        },
      });

      if (createTransactionDto.type === TransType.INCOME) {
        await tx.mutation.create({
          data: {
            transactionId: transaction.id,
            walletId: createTransactionDto.fromWalletId,
            amount: createTransactionDto.amount,
            createdBy: userId,
          },
        });

        await tx.wallet.update({
          where: { id: createTransactionDto.fromWalletId },
          data: { balance: { increment: createTransactionDto.amount } },
        });
      } else if (createTransactionDto.type === TransType.EXPENSE) {
        await tx.mutation.create({
          data: {
            transactionId: transaction.id,
            walletId: createTransactionDto.fromWalletId,
            amount: -createTransactionDto.amount,
            createdBy: userId,
          },
        });

        await tx.wallet.update({
          where: { id: createTransactionDto.fromWalletId },
          data: { balance: { decrement: createTransactionDto.amount } },
        });
      } else if (createTransactionDto.type === TransType.TRANSFER) {
        // Source wallet
        await tx.mutation.create({
          data: {
            transactionId: transaction.id,
            walletId: createTransactionDto.fromWalletId,
            amount: -createTransactionDto.amount,
            createdBy: userId,
          },
        });

        await tx.wallet.update({
          where: { id: createTransactionDto.fromWalletId },
          data: { balance: { decrement: createTransactionDto.amount } },
        });

        // Target wallet
        await tx.mutation.create({
          data: {
            transactionId: transaction.id,
            walletId: createTransactionDto.toWalletId!,
            amount: createTransactionDto.amount,
            createdBy: userId,
          },
        });

        await tx.wallet.update({
          where: { id: createTransactionDto.toWalletId! },
          data: { balance: { increment: createTransactionDto.amount } },
        });
      }

      return transaction;
    });
  }

  async findAll(limit?: number, offset?: number, type?: string, search?: string) {
    const whereClause: any = { deletedAt: null };

    if (type && Object.values(TransType).includes(type as any)) {
      whereClause.type = type as TransType;
    }

    if (search) {
      whereClause.description = {
        contains: search,
        mode: 'insensitive',
      };
    }

    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
      include: {
        category: true,
        fromWallet: true,
        toWallet: true,
      },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        fromWallet: true,
        toWallet: true,
        mutations: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID "${id}" not found.`);
    }
    return transaction;
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
  ) {
    // 1. Get current transaction state
    const currentTx = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: { mutations: { where: { deletedAt: null } } },
    });
    if (!currentTx) {
      throw new NotFoundException(`Transaction with ID "${id}" not found.`);
    }

    // 2. Compute target state
    const targetDate =
      updateTransactionDto.date !== undefined
        ? updateTransactionDto.date
        : currentTx.date.toISOString();
    const targetDescription =
      updateTransactionDto.description !== undefined
        ? updateTransactionDto.description
        : currentTx.description;
    const targetCategoryId =
      updateTransactionDto.categoryId !== undefined
        ? updateTransactionDto.categoryId
        : currentTx.categoryId;
    const targetType =
      updateTransactionDto.type !== undefined
        ? updateTransactionDto.type
        : currentTx.type;
    const targetFromWalletId =
      updateTransactionDto.fromWalletId !== undefined
        ? updateTransactionDto.fromWalletId
        : currentTx.fromWalletId;
    const targetToWalletId =
      updateTransactionDto.toWalletId !== undefined
        ? updateTransactionDto.toWalletId
        : currentTx.toWalletId;
    const targetAmount =
      updateTransactionDto.amount !== undefined
        ? updateTransactionDto.amount
        : currentTx.amount;

    // 3. Validate target state against DB rules
    if (
      updateTransactionDto.categoryId !== undefined ||
      updateTransactionDto.type !== undefined
    ) {
      const category = await this.prisma.category.findFirst({
        where: { id: targetCategoryId, deletedAt: null },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${targetCategoryId}" not found.`,
        );
      }
      if (category.type !== targetType) {
        throw new BadRequestException(
          `Category type (${category.type}) does not match transaction type (${targetType}).`,
        );
      }
    }

    if (updateTransactionDto.fromWalletId !== undefined) {
      const fromWallet = await this.prisma.wallet.findFirst({
        where: { id: targetFromWalletId, deletedAt: null },
      });
      if (!fromWallet) {
        throw new NotFoundException(
          `Wallet with ID "${targetFromWalletId}" not found.`,
        );
      }
    }

    if (targetType === TransType.TRANSFER) {
      if (!targetToWalletId) {
        throw new BadRequestException(
          'toWalletId is required for TRANSFER transaction.',
        );
      }
      if (targetToWalletId === targetFromWalletId) {
        throw new BadRequestException(
          'fromWalletId and toWalletId must be different.',
        );
      }
      const toWallet = await this.prisma.wallet.findFirst({
        where: { id: targetToWalletId, deletedAt: null },
      });
      if (!toWallet) {
        throw new NotFoundException(
          `Wallet with ID "${targetToWalletId}" not found.`,
        );
      }
    }

    // 4. Run update in interactive transaction
    return this.prisma.$transaction(async (tx) => {
      // Revert old mutations balance effects
      for (const mut of currentTx.mutations) {
        await tx.wallet.update({
          where: { id: mut.walletId },
          data: { balance: { decrement: mut.amount } },
        });
      }

      // Hard-delete old mutations
      await tx.mutation.deleteMany({
        where: { transactionId: id },
      });

      // Update transaction details
      const updatedTx = await tx.transaction.update({
        where: { id },
        data: {
          date: new Date(targetDate),
          description: targetDescription,
          categoryId: targetCategoryId,
          type: targetType,
          fromWalletId: targetFromWalletId,
          toWalletId:
            targetType === TransType.TRANSFER ? targetToWalletId : null,
          amount: targetAmount,
          updatedBy: userId,
        },
      });

      // Apply new mutations and balance changes
      if (targetType === TransType.INCOME) {
        await tx.mutation.create({
          data: {
            transactionId: id,
            walletId: targetFromWalletId,
            amount: targetAmount,
            createdBy: userId,
          },
        });

        await tx.wallet.update({
          where: { id: targetFromWalletId },
          data: { balance: { increment: targetAmount } },
        });
      } else if (targetType === TransType.EXPENSE) {
        await tx.mutation.create({
          data: {
            transactionId: id,
            walletId: targetFromWalletId,
            amount: -targetAmount,
            createdBy: userId,
          },
        });

        await tx.wallet.update({
          where: { id: targetFromWalletId },
          data: { balance: { decrement: targetAmount } },
        });
      } else if (targetType === TransType.TRANSFER) {
        // Source wallet
        await tx.mutation.create({
          data: {
            transactionId: id,
            walletId: targetFromWalletId,
            amount: -targetAmount,
            createdBy: userId,
          },
        });

        await tx.wallet.update({
          where: { id: targetFromWalletId },
          data: { balance: { decrement: targetAmount } },
        });

        // Target wallet
        await tx.mutation.create({
          data: {
            transactionId: id,
            walletId: targetToWalletId!,
            amount: targetAmount,
            createdBy: userId,
          },
        });

        await tx.wallet.update({
          where: { id: targetToWalletId! },
          data: { balance: { increment: targetAmount } },
        });
      }

      return updatedTx;
    });
  }

  async remove(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: { mutations: { where: { deletedAt: null } } },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID "${id}" not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Revert wallet balances and soft delete mutations
      for (const mut of transaction.mutations) {
        await tx.wallet.update({
          where: { id: mut.walletId },
          data: { balance: { decrement: mut.amount } },
        });

        await tx.mutation.update({
          where: { id: mut.id },
          data: {
            deletedAt: new Date(),
            deletedBy: userId,
          },
        });
      }

      // Soft delete transaction
      return tx.transaction.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });
    });
  }
}
