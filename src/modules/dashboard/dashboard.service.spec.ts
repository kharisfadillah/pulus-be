import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../database/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    wallet: {
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardData', () => {
    it('should aggregate and calculate correct dashboard statistics', async () => {
      const query = {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
      };

      // Mock wallets data
      const mockWallets = [
        { id: 'w-1', name: 'Cash', balance: 100000 },
        { id: 'w-2', name: 'Bank', balance: 250000 },
      ];
      mockPrismaService.wallet.findMany.mockResolvedValue(mockWallets);

      // Mock transactions in range
      const mockTransactions = [
        {
          id: 'tx-1',
          type: 'INCOME',
          amount: 500000,
          date: new Date('2026-06-01T10:00:00.000Z'),
          category: { id: 'c-1', name: 'Salary', color: '#00ff00' },
        },
        {
          id: 'tx-2',
          type: 'EXPENSE',
          amount: 50000,
          date: new Date('2026-06-02T12:00:00.000Z'),
          category: { id: 'c-2', name: 'Food', color: '#ff0000' },
        },
        {
          id: 'tx-3',
          type: 'EXPENSE',
          amount: 30000,
          date: new Date('2026-06-02T18:00:00.000Z'),
          category: { id: 'c-2', name: 'Food', color: '#ff0000' },
        },
      ];
      mockPrismaService.transaction.findMany.mockResolvedValueOnce(
        mockTransactions,
      );

      // Mock recent transactions (take 5)
      const mockRecent = mockTransactions.slice(0, 2).map((tx) => ({
        ...tx,
        fromWallet: { id: 'w-1', name: 'Cash' },
        toWallet: null,
      }));
      mockPrismaService.transaction.findMany.mockResolvedValueOnce(mockRecent);

      const result = await service.getDashboardData(query);

      expect(result).toBeDefined();
      expect(result.wallets.totalBalance).toBe(350000);
      expect(result.wallets.list).toEqual(mockWallets);

      expect(result.summary.totalIncome).toBe(500000);
      expect(result.summary.totalExpense).toBe(80000);
      expect(result.summary.netSavings).toBe(420000);

      // Category expenses calculation
      expect(result.expenseByCategory).toHaveLength(1);
      expect(result.expenseByCategory[0]).toEqual({
        categoryId: 'c-2',
        categoryName: 'Food',
        color: '#ff0000',
        amount: 80000,
        percentage: 100,
      });

      // Cash flow daily trend check
      expect(result.cashFlowTrend).toHaveLength(3); // Jun 1, 2, 3
      expect(result.cashFlowTrend[0]).toEqual({
        date: '2026-06-01',
        income: 500000,
        expense: 0,
      });
      expect(result.cashFlowTrend[1]).toEqual({
        date: '2026-06-02',
        income: 0,
        expense: 80000,
      });
      expect(result.cashFlowTrend[2]).toEqual({
        date: '2026-06-03',
        income: 0,
        expense: 0,
      });

      expect(result.recentTransactions).toEqual(mockRecent);
    });

    it('should use default dates if query parameters are missing', async () => {
      mockPrismaService.wallet.findMany.mockResolvedValue([]);
      mockPrismaService.transaction.findMany.mockResolvedValue([]);

      const result = await service.getDashboardData({});

      expect(result).toBeDefined();
      expect(result.summary.startDate).toBeDefined();
      expect(result.summary.endDate).toBeDefined();
    });
  });
});
