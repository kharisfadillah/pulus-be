import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async authenticate(idToken: string) {
    try {
      const decodedToken = await this.firebaseService.verifyToken(idToken);
      const { uid, email } = decodedToken;

      if (!email) {
        throw new UnauthorizedException(
          'Email is required in Firebase ID Token',
        );
      }

      // Check if user exists by firebaseUid or email
      let user = await this.prisma.user.findFirst({
        where: {
          OR: [{ firebaseUid: uid }, { email: email }],
        },
      });

      if (!user) {
        throw new UnauthorizedException(
          'User is not registered in the system.',
        );
      }

      if (!user.firebaseUid) {
        // Link firebaseUid if they existed before (e.g. pre-registered via email only)
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: uid },
        });
      }

      return user;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed';
      throw new UnauthorizedException(message);
    }
  }
}
