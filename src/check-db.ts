import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in env');
    return;
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({});
    const wallets = await prisma.wallet.findMany({
      where: { deletedAt: null },
    });
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
    });
    const transactions = await prisma.transaction.findMany({
      where: { deletedAt: null },
    });
    console.log('DATA_CHECK_START');
    console.log('Users:', JSON.stringify(users));
    console.log('Wallets:', JSON.stringify(wallets));
    console.log('Categories:', JSON.stringify(categories));
    console.log('Transactions Count:', transactions.length);
    console.log('DATA_CHECK_END');
  } catch (err) {
    console.error('Database query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
