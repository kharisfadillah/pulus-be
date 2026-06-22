import { Module } from '@nestjs/common';
import { PrismaModule } from './database/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MutationsModule } from './modules/mutations/mutations.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FirebaseModule,
    AuthModule,
    CategoriesModule,
    WalletsModule,
    TransactionsModule,
    DashboardModule,
    MutationsModule,
    AiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
