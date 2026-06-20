import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { MutationsService } from './mutations.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';

@Controller('mutations')
@UseGuards(FirebaseAuthGuard)
export class MutationsController {
  constructor(private readonly mutationsService: MutationsService) {}

  @Get()
  findAll(
    @Query('walletId') walletId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const offsetNum = offset ? parseInt(offset, 10) : undefined;
    return this.mutationsService.findAll({
      walletId,
      startDate,
      endDate,
      type,
      search,
      limit: limitNum,
      offset: offsetNum,
    });
  }
}
