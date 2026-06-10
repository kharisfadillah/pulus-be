import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { GetUser } from '../auth/decorators/user.decorator';

@Controller('wallets')
@UseGuards(FirebaseAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  create(
    @Body() createWalletDto: CreateWalletDto,
    @GetUser('id') userId: string,
  ) {
    return this.walletsService.create(createWalletDto, userId);
  }

  @Get()
  findAll() {
    return this.walletsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.walletsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWalletDto: UpdateWalletDto,
    @GetUser('id') userId: string,
  ) {
    return this.walletsService.update(id, updateWalletDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.walletsService.remove(id, userId);
  }
}
