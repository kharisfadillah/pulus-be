/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

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
  });

  afterEach(async () => {
    await app.close();
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
