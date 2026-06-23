import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/user.decorator';

@Controller('telegram')
@UseGuards(FirebaseAuthGuard)
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Post('pairing-token')
  async getPairingToken(@GetUser('id') userId: string) {
    return this.telegramService.generatePairingToken(userId);
  }

  @Get('status')
  async getStatus(@GetUser('id') userId: string) {
    return this.telegramService.getLinkingStatus(userId);
  }

  @Post('unlink')
  async unlink(@GetUser('id') userId: string) {
    return this.telegramService.unlinkTelegram(userId);
  }
}
