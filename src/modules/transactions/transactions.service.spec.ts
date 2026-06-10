/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../database/prisma.service';
import { TransType } from 'generated/prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockPrismaService = {
    category: {
      findFirst: jest.fn(),
    },
    wallet: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    mutation: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an INCOME transaction and increment wallet balance', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Salary',
        categoryId: 'cat-1',
        type: TransType.INCOME,
        fromWalletId: 'wallet-1',
        amount: 500000,
      };

      // Mock category validation
      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        type: TransType.INCOME,
      });
      // Mock fromWallet validation
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        balance: 100000,
      });
      // Mock transaction creation
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx-1',
        ...dto,
      });

      const result = await service.create(dto, 'user-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.transaction.create).toHaveBeenCalled();
      expect(mockPrismaService.mutation.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'tx-1',
          walletId: 'wallet-1',
          amount: 500000,
          createdBy: 'user-1',
        },
      });
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { increment: 500000 } },
      });
    });

    it('should throw NotFoundException if category does not exist', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Salary',
        categoryId: 'cat-invalid',
        type: TransType.INCOME,
        fromWalletId: 'wallet-1',
        amount: 500000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
