import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        createdBy: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ) {
    return this.prisma.category.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        updatedBy: userId,
      },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
  }
}
