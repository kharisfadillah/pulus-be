import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException } from '@nestjs/common';

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

  describe('findOne', () => {
    it('should return a wallet by id', async () => {
      const expectedResult = {
        id: '1',
        name: 'Cash',
        balance: 50000,
        icon: 'cash',
        color: '#00ff00',
        deletedAt: null,
      };
      mockPrismaService.wallet.findFirst.mockResolvedValue(expectedResult);

      const result = await service.findOne('1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.wallet.findFirst).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
      });
    });

    it('should throw NotFoundException if wallet is not found', async () => {
      mockPrismaService.wallet.findFirst.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        new NotFoundException('Wallet with ID "999" not found.'),
      );
    });
  });

  describe('update', () => {
    it('should update a wallet', async () => {
      const dto = {
        name: 'Bank Account',
      };
      const existingWallet = {
        id: '1',
        name: 'Cash',
        balance: 50000,
        icon: 'cash',
        color: '#00ff00',
        deletedAt: null,
      };
      const expectedResult = {
        ...existingWallet,
        name: 'Bank Account',
        updatedBy: 'user-1',
      };
      mockPrismaService.wallet.findFirst.mockResolvedValue(existingWallet);
      mockPrismaService.wallet.update.mockResolvedValue(expectedResult);

      const result = await service.update('1', dto, 'user-1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          ...dto,
          updatedBy: 'user-1',
        },
      });
    });
  });

  describe('remove', () => {
    it('should soft delete a wallet', async () => {
      const existingWallet = {
        id: '1',
        name: 'Cash',
        balance: 50000,
        icon: 'cash',
        color: '#00ff00',
        deletedAt: null,
      };
      const expectedResult = {
        ...existingWallet,
        deletedAt: new Date(),
        deletedBy: 'user-1',
      };
      mockPrismaService.wallet.findFirst.mockResolvedValue(existingWallet);
      mockPrismaService.wallet.update.mockResolvedValue(expectedResult);

      const result = await service.remove('1', 'user-1');
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          deletedAt: expect.any(Date) as Date,
          deletedBy: 'user-1',
        },
      });
    });
  });
});
