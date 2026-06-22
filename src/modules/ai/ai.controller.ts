import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/user.decorator';

@Controller('ai')
@UseGuards(FirebaseAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() chatDto: ChatDto, @GetUser('id') userId: string) {
    return this.aiService.sendMessage(chatDto.message, userId);
  }

  @Get('chat-history')
  async getChatHistory(@GetUser('id') userId: string) {
    return this.aiService.getChatHistory(userId);
  }

  @Post('undo/:messageId')
  async undo(
    @Param('messageId') messageId: string,
    @GetUser('id') userId: string,
  ) {
    return this.aiService.undoAction(messageId, userId);
  }
}
