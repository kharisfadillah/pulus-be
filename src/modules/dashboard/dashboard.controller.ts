import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';

@Controller('dashboard')
@UseGuards(FirebaseAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboardData(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getDashboardData(query);
  }
}
