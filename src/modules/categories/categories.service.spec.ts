import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrismaService = {
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const dto = {
        name: 'Food',
        type: 'EXPENSE' as const,
        icon: 'food',
        color: '#ff0000',
      };
      const expectedResult = { id: '1', ...dto, createdBy: 'user-1' };
      mockPrismaService.category.create.mockResolvedValue(expectedResult);

      const result = await service.create(dto, 'user-1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          createdBy: 'user-1',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all active categories', async () => {
      const expectedResult = [
        {
          id: '1',
          name: 'Food',
          type: 'EXPENSE',
          icon: 'food',
          color: '#ff0000',
          deletedAt: null,
        },
      ];
      mockPrismaService.category.findMany.mockResolvedValue(expectedResult);

      const result = await service.findAll();
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      const expectedResult = {
        id: '1',
        name: 'Food',
        type: 'EXPENSE',
        icon: 'food',
        color: '#ff0000',
        deletedAt: null,
      };
      mockPrismaService.category.findFirst.mockResolvedValue(expectedResult);

      const result = await service.findOne('1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.category.findFirst).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
      });
    });

    it('should throw NotFoundException if category is not found', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        new NotFoundException('Category with ID "999" not found.'),
      );
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const dto = {
        name: 'Groceries',
      };
      const expectedResult = {
        id: '1',
        name: 'Groceries',
        type: 'EXPENSE',
        icon: 'food',
        color: '#ff0000',
        updatedBy: 'user-1',
      };
      mockPrismaService.category.update.mockResolvedValue(expectedResult);

      const result = await service.update('1', dto, 'user-1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          ...dto,
          updatedBy: 'user-1',
        },
      });
    });
  });

  describe('remove', () => {
    it('should soft delete a category', async () => {
      const expectedResult = {
        id: '1',
        name: 'Food',
        type: 'EXPENSE',
        deletedAt: new Date(),
        deletedBy: 'user-1',
      };
      mockPrismaService.category.update.mockResolvedValue(expectedResult);

      const result = await service.remove('1', 'user-1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.category.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          deletedAt: expect.any(Date) as Date,
          deletedBy: 'user-1',
        },
      });
    });
  });
});
