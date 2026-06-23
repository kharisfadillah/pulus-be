import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { Telegraf } from 'telegraf';
import * as crypto from 'crypto';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private aiService: AiService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (token && token !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
      this.bot = new Telegraf(token);
    }
  }

  onModuleInit() {
    if (!this.bot) {
      console.warn(
        'Telegram bot is not initialized because TELEGRAM_BOT_TOKEN is not set or is using placeholder.',
      );
      return;
    }

    // 1. Handle /start command (deep linking pairing logic)
    this.bot.start(async (ctx) => {
      const payload = ctx.payload; // Extract the token parameter from /start <token>
      const chatId = ctx.chat.id.toString();

      if (!payload) {
        // Simple start message
        await ctx.reply(
          'Halo! Saya adalah Asisten Keuangan Pulus. Silakan hubungkan akun Anda dari aplikasi web Pulus untuk mulai mencatat keuangan lewat Telegram.',
        );
        return;
      }

      try {
        // Search user with the pairing token
        const user = await this.prisma.user.findFirst({
          where: {
            telegramPairingToken: payload,
            telegramPairingExpires: { gte: new Date() },
          },
        });

        if (!user) {
          await ctx.reply(
            '⚠️ Kode pairing tidak valid atau telah kedaluwarsa. Silakan minta kode pairing baru dari aplikasi web Pulus.',
          );
          return;
        }

        // Link the user with this Telegram chatId
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            telegramChatId: chatId,
            telegramPairingToken: null,
            telegramPairingExpires: null,
          },
        });

        await ctx.reply(
          `✅ Akun berhasil terhubung! Selamat datang, ${user.name}. Sekarang Anda bisa mencatat transaksi langsung dari sini. Coba ketik: "beli nasi goreng 15rb pakai dompet Cash"`,
        );
      } catch (err) {
        console.error('Error linking Telegram account:', err);
        await ctx.reply(
          '⚠️ Terjadi kesalahan saat menghubungkan akun Anda. Silakan coba lagi.',
        );
      }
    });

    // 2. Handle all text messages (financial assistant tracking flow)
    this.bot.on('text', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const text = ctx.message.text;

      // Skip commands
      if (text.startsWith('/')) return;

      try {
        const user = await this.prisma.user.findFirst({
          where: { telegramChatId: chatId },
        });

        if (!user) {
          await ctx.reply(
            '⚠️ Akun Anda belum terhubung. Silakan buka aplikasi web Pulus, masuk ke Pengaturan, lalu klik "Hubungkan ke Telegram".',
          );
          return;
        }

        // Show typing indicator
        await ctx.sendChatAction('typing');

        // Send message to AiService
        const res = await this.aiService.sendMessage(text, user.id);

        // Send explanation reply
        await ctx.reply(res.explanation);
      } catch (err) {
        console.error('Error processing Telegram message:', err);
        await ctx.reply(
          '⚠️ Terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.',
        );
      }
    });

    // Start bot in polling mode in background
    this.bot
      .launch()
      .then(() => {
        console.log('Telegram bot successfully launched.');
      })
      .catch((err) => {
        console.error('Failed to launch Telegram bot:', err);
      });
  }

  onModuleDestroy() {
    if (this.bot) {
      this.bot.stop();
    }
  }

  // Generate a pairing token for web UI
  async generatePairingToken(userId: string) {
    const token = crypto.randomBytes(16).toString('hex');
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 10); // Code valid for 10 minutes

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramPairingToken: token,
        telegramPairingExpires: expires,
      },
    });

    const botUsername =
      this.configService.get<string>('TELEGRAM_BOT_USERNAME') || 'pulus_bot';
    return {
      token,
      botUrl: `https://t.me/${botUsername}?start=${token}`,
    };
  }

  // Check linking status
  async getLinkingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    return {
      isLinked: !!user?.telegramChatId,
    };
  }

  // Unlink/remove Telegram association
  async unlinkTelegram(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: null,
        telegramPairingToken: null,
        telegramPairingExpires: null,
      },
    });

    return { success: true };
  }
}
