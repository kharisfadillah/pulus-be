import { Module } from '@nestjs/common';
import { MutationsService } from './mutations.service';
import { MutationsController } from './mutations.controller';
import { PrismaModule } from '../../database/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MutationsController],
  providers: [MutationsService],
})
export class MutationsModule {}
