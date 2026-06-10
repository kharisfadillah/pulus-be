import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../database/prisma.service';

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
});
