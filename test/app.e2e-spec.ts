jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { FirebaseAuthGuard } from './../src/modules/auth/guards/firebase-auth.guard';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrismaService = {
    wallet: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(FirebaseAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: 'mock-user-id',
            email: 'family@pulus.com',
            name: 'Family User',
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Categories Controller', () => {
    it('POST /categories', () => {
      const dto = {
        name: 'Food',
        type: 'EXPENSE',
        icon: 'food',
        color: '#ff0000',
      };
      mockPrismaService.category.create.mockResolvedValue({
        id: '1',
        ...dto,
        createdBy: 'mock-user-id',
      });

      return request(app.getHttpServer())
        .post('/categories')
        .send(dto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Food');
          expect(res.body.createdBy).toBe('mock-user-id');
        });
    });

    it('GET /categories', () => {
      mockPrismaService.category.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'Food',
          type: 'EXPENSE',
          icon: 'fast-food',
          color: '#ff0000',
          createdBy: 'mock-user-id',
        },
      ]);

      return request(app.getHttpServer())
        .get('/categories')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0].name).toBe('Food');
        });
    });

    it('GET /categories/:id', () => {
      mockPrismaService.category.findFirst.mockResolvedValue({
        id: '1',
        name: 'Food',
        deletedAt: null,
      });

      return request(app.getHttpServer())
        .get('/categories/1')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Food');
        });
    });

    it('PATCH /categories/:id', () => {
      const dto = { name: 'Groceries' };
      mockPrismaService.category.update.mockResolvedValue({
        id: '1',
        name: 'Groceries',
        updatedBy: 'mock-user-id',
      });

      return request(app.getHttpServer())
        .patch('/categories/1')
        .send(dto)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Groceries');
        });
    });

    it('DELETE /categories/:id', () => {
      mockPrismaService.category.update.mockResolvedValue({
        id: '1',
        deletedAt: new Date(),
        deletedBy: 'mock-user-id',
      });

      return request(app.getHttpServer()).delete('/categories/1').expect(200);
    });
  });

  describe('Wallets Controller', () => {
    it('POST /wallets', () => {
      const dto = {
        name: 'Cash',
        balance: 50000,
        icon: 'cash',
        color: '#00ff00',
      };
      mockPrismaService.wallet.create.mockResolvedValue({
        id: '1',
        ...dto,
        createdBy: 'mock-user-id',
      });

      return request(app.getHttpServer())
        .post('/wallets')
        .send(dto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Cash');
          expect(res.body.balance).toBe(50000);
        });
    });

    it('GET /wallets', () => {
      mockPrismaService.wallet.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'Cash',
          balance: 50000,
          icon: 'cash',
          color: '#00ff00',
          createdBy: 'mock-user-id',
        },
      ]);

      return request(app.getHttpServer())
        .get('/wallets')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0].name).toBe('Cash');
        });
    });

    it('GET /wallets/:id', () => {
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: '1',
        name: 'Cash',
        balance: 50000,
        deletedAt: null,
      });

      return request(app.getHttpServer())
        .get('/wallets/1')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Cash');
        });
    });

    it('PATCH /wallets/:id', () => {
      const dto = { name: 'Savings' };
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: '1',
        name: 'Cash',
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: '1',
        name: 'Savings',
        updatedBy: 'mock-user-id',
      });

      return request(app.getHttpServer())
        .patch('/wallets/1')
        .send(dto)
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Savings');
        });
    });

    it('DELETE /wallets/:id', () => {
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: '1',
        name: 'Cash',
      });
      mockPrismaService.wallet.update.mockResolvedValue({
        id: '1',
        deletedAt: new Date(),
        deletedBy: 'mock-user-id',
      });

      return request(app.getHttpServer()).delete('/wallets/1').expect(200);
    });
  });

  describe('Transactions Controller', () => {
    it('POST /transactions', () => {
      const dto = {
        date: '2026-06-10T12:00:00.000Z',
        description: 'Salary',
        categoryId: 'cat-1',
        type: 'INCOME',
        fromWalletId: 'wallet-1',
        amount: 500000,
      };

      mockPrismaService.category.findFirst.mockResolvedValue({
        id: 'cat-1',
        type: 'INCOME',
      });
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'wallet-1',
        balance: 100000,
      });
      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx-1',
        ...dto,
      });

      return request(app.getHttpServer())
        .post('/transactions')
        .send(dto)
        .expect(201)
        .expect((res) => {
          expect(res.body.description).toBe('Salary');
        });
    });

    it('GET /transactions', () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          date: new Date('2026-06-10T12:00:00.000Z'),
          description: 'Payment',
          amount: 50000,
          type: 'EXPENSE',
          categoryId: '1',
          fromWalletId: '1',
          toWalletId: null,
          createdBy: 'mock-user-id',
          category: { id: '1', name: 'Food' },
          fromWallet: { id: '1', name: 'Cash' },
          toWallet: null,
        },
      ]);

      return request(app.getHttpServer())
        .get('/transactions')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0].description).toBe('Payment');
        });
    });

    it('GET /transactions/:id', () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        description: 'Payment',
        deletedAt: null,
      });

      return request(app.getHttpServer())
        .get('/transactions/tx-1')
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe('Payment');
        });
    });

    it('PATCH /transactions/:id', () => {
      const dto = { description: 'Updated Payment' };
      mockPrismaService.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        description: 'Payment',
        date: new Date('2026-06-10T12:00:00.000Z'),
        mutations: [],
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        id: 'tx-1',
        description: 'Updated Payment',
      });

      return request(app.getHttpServer())
        .patch('/transactions/tx-1')
        .send(dto)
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe('Updated Payment');
        });
    });

    it('DELETE /transactions/:id', () => {
      mockPrismaService.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        description: 'Payment',
        mutations: [],
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        id: 'tx-1',
        deletedAt: new Date(),
      });

      return request(app.getHttpServer())
        .delete('/transactions/tx-1')
        .expect(200);
    });
  });

  describe('Dashboard Controller', () => {
    it('GET /dashboard', () => {
      mockPrismaService.wallet.findMany.mockResolvedValue([
        {
          id: '1',
          name: 'Cash',
          balance: 50000,
          icon: 'cash',
          color: '#00ff00',
          createdBy: 'mock-user-id',
        },
      ]);
      mockPrismaService.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          date: new Date('2026-06-10T12:00:00.000Z'),
          description: 'Salary',
          amount: 500000,
          type: 'INCOME',
          categoryId: '1',
          fromWalletId: '1',
          toWalletId: null,
          createdBy: 'mock-user-id',
          category: { id: '1', name: 'Salary', color: '#00ff00' },
        },
      ]);

      return request(app.getHttpServer())
        .get('/dashboard')
        .expect(200)
        .expect((res) => {
          expect(res.body.wallets.totalBalance).toBe(50000);
          expect(res.body.summary.totalIncome).toBe(500000);
          expect(res.body.recentTransactions[0].description).toBe('Salary');
        });
    });
  });
});
