import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async create(createWalletDto: CreateWalletDto, userId: string) {
    return this.prisma.wallet.create({
      data: {
        ...createWalletDto,
        createdBy: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.wallet.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID "${id}" not found.`);
    }

    return wallet;
  }

  async update(id: string, updateWalletDto: UpdateWalletDto, userId: string) {
    await this.findOne(id);

    return this.prisma.wallet.update({
      where: { id },
      data: {
        ...updateWalletDto,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);

    return this.prisma.wallet.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
  }
}
