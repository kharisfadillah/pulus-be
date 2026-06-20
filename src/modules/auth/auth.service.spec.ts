jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  cert: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockFirebaseService = {
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authenticate', () => {
    it('should successfully authenticate user with matching firebaseUid', async () => {
      const idToken = 'valid-token';
      const decodedToken = { uid: 'uid-123', email: 'user@example.com' };
      const dbUser = {
        id: 'user-1',
        email: 'user@example.com',
        firebaseUid: 'uid-123',
      };

      mockFirebaseService.verifyToken.mockResolvedValue(decodedToken);
      mockPrismaService.user.findFirst.mockResolvedValue(dbUser);

      const result = await service.authenticate(idToken);

      expect(result).toEqual(dbUser);
      expect(mockFirebaseService.verifyToken).toHaveBeenCalledWith(idToken);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ firebaseUid: 'uid-123' }, { email: 'user@example.com' }],
        },
      });
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should link firebaseUid if user exists with matching email but has no firebaseUid', async () => {
      const idToken = 'valid-token';
      const decodedToken = { uid: 'uid-123', email: 'user@example.com' };
      const dbUser = {
        id: 'user-1',
        email: 'user@example.com',
        firebaseUid: null,
      };
      const updatedUser = {
        id: 'user-1',
        email: 'user@example.com',
        firebaseUid: 'uid-123',
      };

      mockFirebaseService.verifyToken.mockResolvedValue(decodedToken);
      mockPrismaService.user.findFirst.mockResolvedValue(dbUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.authenticate(idToken);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firebaseUid: 'uid-123' },
      });
    });

    it('should throw UnauthorizedException if email is missing in firebase token', async () => {
      const idToken = 'valid-token';
      const decodedToken = { uid: 'uid-123', email: null };

      mockFirebaseService.verifyToken.mockResolvedValue(decodedToken);

      await expect(service.authenticate(idToken)).rejects.toThrow(
        new UnauthorizedException('Email is required in Firebase ID Token'),
      );
    });

    it('should throw UnauthorizedException if user is not registered in the system', async () => {
      const idToken = 'valid-token';
      const decodedToken = { uid: 'uid-123', email: 'notreg@example.com' };

      mockFirebaseService.verifyToken.mockResolvedValue(decodedToken);
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.authenticate(idToken)).rejects.toThrow(
        new UnauthorizedException('User is not registered in the system.'),
      );
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      const idToken = 'invalid-token';
      mockFirebaseService.verifyToken.mockRejectedValue(
        new Error('Invalid token signature'),
      );

      await expect(service.authenticate(idToken)).rejects.toThrow(
        new UnauthorizedException('Invalid token signature'),
      );
    });
  });
});
