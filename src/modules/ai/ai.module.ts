import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { GeminiProvider } from './providers/gemini.provider';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CategoriesModule } from '../categories/categories.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TransactionsModule,
    CategoriesModule,
    WalletsModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'AI_PROVIDER',
      useClass: GeminiProvider,
    },
  ],
  exports: [AiService],
})
export class AiModule {}
