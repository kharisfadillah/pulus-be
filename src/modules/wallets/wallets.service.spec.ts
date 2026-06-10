import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../../database/prisma.service';

describe('WalletsService', () => {
  let service: WalletsService;

  const mockPrismaService = {
    wallet: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a wallet', async () => {
      const dto = {
        name: 'Cash',
        balance: 50000,
        icon: 'cash',
        color: '#00ff00',
      };
      const expectedResult = { id: '1', ...dto, createdBy: 'user-1' };
      mockPrismaService.wallet.create.mockResolvedValue(expectedResult);

      const result = await service.create(dto, 'user-1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.wallet.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          createdBy: 'user-1',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return active wallets', async () => {
      const expectedResult = [
        {
          id: '1',
          name: 'Cash',
          balance: 50000,
          icon: 'cash',
          color: '#00ff00',
          deletedAt: null,
        },
      ];
      mockPrismaService.wallet.findMany.mockResolvedValue(expectedResult);

      const result = await service.findAll();
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.wallet.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
