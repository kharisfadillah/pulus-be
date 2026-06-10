import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { GetUser } from './decorators/user.decorator';
import type { User } from 'generated/prisma/client';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  getMe(@GetUser() user: User) {
    return user;
  }
}
