import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn(
        'Firebase configuration is missing or incomplete. Firebase Admin SDK might not function properly.',
      );
      return;
    }

    // Handle escaped newlines in env variables
    privateKey = privateKey.replace(/\\n/g, '\n');

    const apps = getApps();
    if (apps.length === 0) {
      this.firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      this.firebaseApp = getApp();
    }
  }

  async verifyToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.firebaseApp) {
      throw new Error('Firebase Admin SDK is not initialized.');
    }
    return getAuth(this.firebaseApp).verifyIdToken(idToken);
  }
}
