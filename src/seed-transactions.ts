import { PrismaClient, TransType } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const userId = '01KTPATVBA3RPEJGZ98A4B5G05';

const WALLETS = {
  BNI: '01KTZKE1AVMCD27NA9Y71G0MCZ',
  CASH: '01KTZKFE9DQ6VV803C5WYD2N9H',
  JAGO: '01KTZKG6XA1ATH6HPAKSTDCVGS',
};

const CATEGORIES = {
  FOOD: '01KTXZ7MTG201NV48GGDH92S3Y', // EXPENSE
  TRANSPORT: '01KTY4GT9W7PZ2E8FEJPQDB0XN', // EXPENSE
  SALARY: '01KTY4K8H9H8MJSAEM4CMVKNV8', // INCOME
  TRANSFER: '01KTY4WVAVRNQD36PS9DB9H8YJ', // TRANSFER
  INVESTMENT: '01KTY4XN4RY2FHF7X6T46FJM5B', // EXPENSE
};

const INITIAL_BALANCES = {
  [WALLETS.BNI]: 10000000,
  [WALLETS.CASH]: 1000000,
  [WALLETS.JAGO]: 5000000,
};

function getRelativeDate(daysAgo: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const transactionsToSeed = [
  // Today
  {
    date: getRelativeDate(0, 12, 30),
    description: 'Makan Siang di Warteg',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 25000,
  },
  {
    date: getRelativeDate(0, 14, 15),
    description: 'Kopi Susu Kopi Kenangan',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 18000,
  },
  {
    date: getRelativeDate(0, 17, 0),
    description: 'GrabBike ke Stasiun',
    categoryId: CATEGORIES.TRANSPORT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 12000,
  },
  {
    date: getRelativeDate(0, 19, 30),
    description: 'Cashback Gopay',
    categoryId: CATEGORIES.SALARY,
    type: TransType.INCOME,
    fromWalletId: WALLETS.JAGO,
    amount: 5000,
  },
  {
    date: getRelativeDate(0, 20, 15),
    description: 'Makan Malam Pecel Lele',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 20000,
  },
  // Yesterday
  {
    date: getRelativeDate(1, 8, 30),
    description: 'MRT Jakarta',
    categoryId: CATEGORIES.TRANSPORT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 8000,
  },
  {
    date: getRelativeDate(1, 13, 0),
    description: 'McD Burger & Fries',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.JAGO,
    amount: 55000,
  },
  {
    date: getRelativeDate(1, 15, 0),
    description: 'Beli Reksa Dana Bibit',
    categoryId: CATEGORIES.INVESTMENT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.BNI,
    amount: 100000,
  },
  {
    date: getRelativeDate(1, 16, 30),
    description: 'Tarik Tunai BNI ke Cash',
    categoryId: CATEGORIES.TRANSFER,
    type: TransType.TRANSFER,
    fromWalletId: WALLETS.BNI,
    toWalletId: WALLETS.CASH,
    amount: 200000,
  },
  {
    date: getRelativeDate(1, 19, 0),
    description: 'Starbucks Coffee',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.BNI,
    amount: 62000,
  },
  // 2 days ago
  {
    date: getRelativeDate(2, 9, 0),
    description: 'Bensin Pertamax',
    categoryId: CATEGORIES.TRANSPORT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 50000,
  },
  {
    date: getRelativeDate(2, 12, 30),
    description: 'Soto Ayam Lamongan',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 18000,
  },
  {
    date: getRelativeDate(2, 15, 0),
    description: 'Freelance UI Design Project',
    categoryId: CATEGORIES.SALARY,
    type: TransType.INCOME,
    fromWalletId: WALLETS.JAGO,
    amount: 1500000,
  },
  {
    date: getRelativeDate(2, 18, 0),
    description: 'Cemilan Indomaret',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 32000,
  },
  // 3 days ago
  {
    date: getRelativeDate(3, 7, 0),
    description: 'GrabCar Bandara',
    categoryId: CATEGORIES.TRANSPORT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.BNI,
    amount: 150000,
  },
  {
    date: getRelativeDate(3, 12, 15),
    description: 'Bakso Pak Joko',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 22000,
  },
  {
    date: getRelativeDate(3, 14, 0),
    description: 'Transfer BNI ke Bank Jago',
    categoryId: CATEGORIES.TRANSFER,
    type: TransType.TRANSFER,
    fromWalletId: WALLETS.BNI,
    toWalletId: WALLETS.JAGO,
    amount: 500000,
  },
  {
    date: getRelativeDate(3, 16, 0),
    description: 'Top Up Saham BBRI',
    categoryId: CATEGORIES.INVESTMENT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.BNI,
    amount: 250000,
  },
  // 4 days ago
  {
    date: getRelativeDate(4, 13, 0),
    description: 'Makan Malam KFC',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.JAGO,
    amount: 45000,
  },
  {
    date: getRelativeDate(4, 15, 30),
    description: 'Kopi Susu Senja',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 20000,
  },
  {
    date: getRelativeDate(4, 18, 0),
    description: 'Tiket Commuter Line',
    categoryId: CATEGORIES.TRANSPORT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 6000,
  },
  // 5 days ago
  {
    date: getRelativeDate(5, 9, 0),
    description: 'Gaji Bulanan Utama',
    categoryId: CATEGORIES.SALARY,
    type: TransType.INCOME,
    fromWalletId: WALLETS.BNI,
    amount: 8500000,
  },
  {
    date: getRelativeDate(5, 11, 0),
    description: 'Belanja Bulanan Supermarket',
    categoryId: CATEGORIES.FOOD,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.BNI,
    amount: 450000,
  },
  {
    date: getRelativeDate(5, 14, 0),
    description: 'Servis Motor Rutin',
    categoryId: CATEGORIES.TRANSPORT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.CASH,
    amount: 180000,
  },
  {
    date: getRelativeDate(5, 16, 30),
    description: 'Beli Emas Pegadaian',
    categoryId: CATEGORIES.INVESTMENT,
    type: TransType.EXPENSE,
    fromWalletId: WALLETS.JAGO,
    amount: 500000,
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in env');
    return;
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Seeding transaction data...');

    // 1. Clear existing mutations and transactions
    await prisma.mutation.deleteMany({});
    await prisma.transaction.deleteMany({});
    console.log('Cleared existing mutations and transactions.');

    // 2. Set wallet balances to initial state
    for (const [walletId, balance] of Object.entries(INITIAL_BALANCES)) {
      await prisma.wallet.update({
        where: { id: walletId },
        data: { balance },
      });
    }
    console.log('Reset wallet balances to initial seed values.');

    // 3. Create transactions and mutations sequentially
    for (const txData of transactionsToSeed) {
      const { date, description, categoryId, type, fromWalletId, toWalletId, amount } = txData;

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          date,
          description,
          categoryId,
          type,
          fromWalletId,
          toWalletId: type === TransType.TRANSFER ? toWalletId : null,
          amount,
          createdBy: userId,
        },
      });

      // Create mutations and adjust balances
      if (type === TransType.INCOME) {
        await prisma.mutation.create({
          data: {
            transactionId: transaction.id,
            walletId: fromWalletId,
            amount,
            createdBy: userId,
          },
        });

        await prisma.wallet.update({
          where: { id: fromWalletId },
          data: { balance: { increment: amount } },
        });
      } else if (type === TransType.EXPENSE) {
        await prisma.mutation.create({
          data: {
            transactionId: transaction.id,
            walletId: fromWalletId,
            amount: -amount,
            createdBy: userId,
          },
        });

        await prisma.wallet.update({
          where: { id: fromWalletId },
          data: { balance: { decrement: amount } },
        });
      } else if (type === TransType.TRANSFER) {
        // Source wallet
        await prisma.mutation.create({
          data: {
            transactionId: transaction.id,
            walletId: fromWalletId,
            amount: -amount,
            createdBy: userId,
          },
        });

        await prisma.wallet.update({
          where: { id: fromWalletId },
          data: { balance: { decrement: amount } },
        });

        // Target wallet
        await prisma.mutation.create({
          data: {
            transactionId: transaction.id,
            walletId: toWalletId!,
            amount,
            createdBy: userId,
          },
        });

        await prisma.wallet.update({
          where: { id: toWalletId! },
          data: { balance: { increment: amount } },
        });
      }
    }

    console.log(`Successfully seeded ${transactionsToSeed.length} transactions!`);

    // Let's print final balances to verify
    const finalWallets = await prisma.wallet.findMany();
    console.log('Final Wallet Balances:');
    finalWallets.forEach((w) => {
      console.log(`- ${w.name}: ${w.balance}`);
    });

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
