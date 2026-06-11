import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../database/prisma.service';
import { TransType } from 'generated/prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        type: TransType.INCOME,
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        balance: 100000,
      });
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

    it('should create an EXPENSE transaction and decrement wallet balance', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Food',
        categoryId: 'cat-expense',
        type: TransType.EXPENSE,
        fromWalletId: 'wallet-1',
        amount: 50000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-expense',
        type: TransType.EXPENSE,
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        balance: 100000,
      });
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx-2',
        ...dto,
      });

      const result = await service.create(dto, 'user-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.mutation.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'tx-2',
          walletId: 'wallet-1',
          amount: -50000,
          createdBy: 'user-1',
        },
      });
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { decrement: 50000 } },
      });
    });

    it('should create a TRANSFER transaction, decrement source wallet and increment target wallet balance', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Move money',
        categoryId: 'cat-transfer',
        type: TransType.TRANSFER,
        fromWalletId: 'wallet-1',
        toWalletId: 'wallet-2',
        amount: 25000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-transfer',
        type: TransType.TRANSFER,
      });
      mockPrismaService.wallet.findFirst
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 100000 }) // fromWallet
        .mockResolvedValueOnce({ id: 'wallet-2', balance: 50000 }); // toWallet
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx-3',
        ...dto,
      });

      const result = await service.create(dto, 'user-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.mutation.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'tx-3',
          walletId: 'wallet-1',
          amount: -25000,
          createdBy: 'user-1',
        },
      });
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { decrement: 25000 } },
      });
      expect(mockPrismaService.mutation.create).toHaveBeenCalledWith({
        data: {
          transactionId: 'tx-3',
          walletId: 'wallet-2',
          amount: 25000,
          createdBy: 'user-1',
        },
      });
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-2' },
        data: { balance: { increment: 25000 } },
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
        new NotFoundException('Category with ID "cat-invalid" not found.'),
      );
    });

    it('should throw BadRequestException if category type does not match transaction type', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Salary',
        categoryId: 'cat-expense',
        type: TransType.INCOME,
        fromWalletId: 'wallet-1',
        amount: 500000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-expense',
        type: TransType.EXPENSE,
      });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        new BadRequestException(
          'Category type (EXPENSE) does not match transaction type (INCOME).',
        ),
      );
    });

    it('should throw NotFoundException if fromWallet does not exist', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Salary',
        categoryId: 'cat-1',
        type: TransType.INCOME,
        fromWalletId: 'wallet-invalid',
        amount: 500000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        type: TransType.INCOME,
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue(null);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        new NotFoundException('Wallet with ID "wallet-invalid" not found.'),
      );
    });

    it('should throw BadRequestException if toWalletId is missing in TRANSFER transaction', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Transfer',
        categoryId: 'cat-transfer',
        type: TransType.TRANSFER,
        fromWalletId: 'wallet-1',
        amount: 25000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-transfer',
        type: TransType.TRANSFER,
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        balance: 100000,
      });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        new BadRequestException(
          'toWalletId is required for TRANSFER transaction.',
        ),
      );
    });

    it('should throw BadRequestException if toWalletId is the same as fromWalletId in TRANSFER transaction', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Transfer',
        categoryId: 'cat-transfer',
        type: TransType.TRANSFER,
        fromWalletId: 'wallet-1',
        toWalletId: 'wallet-1',
        amount: 25000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-transfer',
        type: TransType.TRANSFER,
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        balance: 100000,
      });

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        new BadRequestException(
          'fromWalletId and toWalletId must be different.',
        ),
      );
    });

    it('should throw NotFoundException if toWallet does not exist in TRANSFER transaction', async () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Transfer',
        categoryId: 'cat-transfer',
        type: TransType.TRANSFER,
        fromWalletId: 'wallet-1',
        toWalletId: 'wallet-invalid',
        amount: 25000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-transfer',
        type: TransType.TRANSFER,
      });
      mockPrismaService.wallet.findFirst
        .mockResolvedValueOnce({ id: 'wallet-1', balance: 100000 })
        .mockResolvedValueOnce(null);

      await expect(service.create(dto, 'user-1')).rejects.toThrow(
        new NotFoundException('Wallet with ID "wallet-invalid" not found.'),
      );
    });
  });

  describe('findAll', () => {
    it('should return all active transactions', async () => {
      const expectedResult = [
        {
          id: 'tx-1',
          description: 'Transaction 1',
          deletedAt: null,
          category: { id: 'cat-1' },
          fromWallet: { id: 'wallet-1' },
          toWallet: null,
        },
      ];
      mockPrismaService.transaction.findMany.mockResolvedValue(expectedResult);

      const result = await service.findAll();
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.transaction.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { date: 'desc' },
        include: {
          category: true,
          fromWallet: true,
          toWallet: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      const expectedResult = {
        id: 'tx-1',
        description: 'Transaction 1',
        deletedAt: null,
        category: { id: 'cat-1' },
        fromWallet: { id: 'wallet-1' },
        toWallet: null,
        mutations: [],
      };
      mockPrismaService.transaction.findFirst.mockResolvedValue(expectedResult);

      const result = await service.findOne('tx-1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'tx-1', deletedAt: null },
        include: {
          category: true,
          fromWallet: true,
          toWallet: true,
          mutations: true,
        },
      });
    });

    it('should throw NotFoundException if transaction is not found', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        new NotFoundException('Transaction with ID "999" not found.'),
      );
    });
  });

  describe('update', () => {
    it('should update a transaction, reverting old balance adjustments and applying new ones', async () => {
      const currentTx = {
        id: 'tx-1',
        date: new Date('2026-06-10T12:00:00.000Z'),
        description: 'Old Salary',
        categoryId: 'cat-1',
        type: TransType.INCOME,
        fromWalletId: 'wallet-1',
        amount: 200000,
        mutations: [{ id: 'mut-1', walletId: 'wallet-1', amount: 200000 }],
      };

      const dto = {
        description: 'Updated Salary',
        amount: 300000,
      };

      mockPrismaService.transaction.findFirst.mockResolvedValue(currentTx);
      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        type: TransType.INCOME,
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        balance: 100000,
      });

      const expectedUpdatedTx = {
        ...currentTx,
        description: 'Updated Salary',
        amount: 300000,
        updatedBy: 'user-1',
      };
      mockPrismaService.transaction.update.mockResolvedValue(expectedUpdatedTx);

      const result = await service.update('tx-1', dto, 'user-1');

      expect(result).toEqual(expectedUpdatedTx);
      // Verify revert
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { decrement: 200000 } },
      });
      expect(mockPrismaService.mutation.deleteMany).toHaveBeenCalledWith({
        where: { transactionId: 'tx-1' },
      });
      // Verify new balance application
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { increment: 300000 } },
      });
    });

    it('should throw NotFoundException if updated transaction does not exist', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(null);

      await expect(service.update('tx-invalid', {}, 'user-1')).rejects.toThrow(
        new NotFoundException('Transaction with ID "tx-invalid" not found.'),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a transaction, reverting wallet balances and soft-deleting mutations', async () => {
      const currentTx = {
        id: 'tx-1',
        date: new Date('2026-06-10T12:00:00.000Z'),
        description: 'Food',
        categoryId: 'cat-expense',
        type: TransType.EXPENSE,
        fromWalletId: 'wallet-1',
        amount: 50000,
        mutations: [{ id: 'mut-1', walletId: 'wallet-1', amount: -50000 }],
      };

      mockPrismaService.transaction.findFirst.mockResolvedValue(currentTx);
      mockPrismaService.transaction.update.mockResolvedValue({
        ...currentTx,
        deletedAt: new Date(),
        deletedBy: 'user-1',
      });

      const result = await service.remove('tx-1', 'user-1');

      expect(result).toBeDefined();
      // Revert wallet balance: decrement the negative amount (effectively increments it)
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-1' },
        data: { balance: { decrement: -50000 } },
      });
      // Soft delete mutation
      expect(mockPrismaService.mutation.update).toHaveBeenCalledWith({
        where: { id: 'mut-1' },
        data: {
          deletedAt: expect.any(Date) as Date,
          deletedBy: 'user-1',
        },
      });
      // Soft delete transaction
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: {
          deletedAt: expect.any(Date) as Date,
          deletedBy: 'user-1',
        },
      });
    });

    it('should throw NotFoundException if transaction to remove does not exist', async () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue(null);

      await expect(service.remove('tx-invalid', 'user-1')).rejects.toThrow(
        new NotFoundException('Transaction with ID "tx-invalid" not found.'),
      );
    });
  });
});
