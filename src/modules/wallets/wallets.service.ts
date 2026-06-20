import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
      include: {
        _count: {
          select: {
            fromTransactions: true,
            toTransactions: true,
          },
        },
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

  async checkHasTransactions(id: string) {
    const count = await this.prisma.transaction.count({
      where: {
        deletedAt: null,
        OR: [{ fromWalletId: id }, { toWalletId: id }],
      },
    });
    return count > 0;
  }

  async update(id: string, updateWalletDto: UpdateWalletDto, userId: string) {
    const existing = await this.findOne(id);

    const hasTxs = await this.checkHasTransactions(id);
    if (
      hasTxs &&
      updateWalletDto.balance !== undefined &&
      updateWalletDto.balance !== existing.balance
    ) {
      throw new BadRequestException(
        'Cannot update wallet balance when it has transactions.',
      );
    }

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

    const hasTxs = await this.checkHasTransactions(id);
    if (hasTxs) {
      throw new BadRequestException(
        'Cannot delete wallet that has transactions.',
      );
    }

    return this.prisma.wallet.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
  }
}
