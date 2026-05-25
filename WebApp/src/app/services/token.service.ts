import { Injectable } from '@angular/core';
import { User, getAuth, onAuthStateChanged } from '@angular/fire/auth';
import { UserData } from '@app-types/components';
import { userPlaceholderImage } from '@utils/constants';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private token: string | null = null;
  private user: User | null = null;
  private testBypass = false;
  public authReady: Promise<void>;
  private resolveAuthReady: (() => void) | null = null;

  constructor() {
    const auth = getAuth();

    this.authReady = new Promise(resolve => {
      this.resolveAuthReady = resolve;
    });

    onAuthStateChanged(auth, async (user) => {
      // Don't let Firebase overwrite the test token set by Cypress bypass
      if (this.testBypass) return;

      this.user = user;
      if (user) {
        this.token = await user.getIdToken();
      } else {
        this.token = null;
      }

      if (this.resolveAuthReady) {
        this.resolveAuthReady();
        // Ensure it resolves only once for the initial load
        this.resolveAuthReady = null;
      }
    });
  }

  async getToken(): Promise<string | null> {
    // Wait for initial auth state to resolve
    await this.authReady;

    if (this.token && await this.isTokenValid(this.token)) {
      return this.token;
    }

    if (this.user) {
      // Force refresh the token and return it
      this.token = await this.user.getIdToken(true);
      console.log(this.token, 'token in service');
      return this.token;
    }

    return null;
  }

  private async isTokenValid(token: string): Promise<boolean> {
    try {
      // Assuming the token is a JWT, decode it
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = decodedToken.exp;
      const currentTime = Math.floor(Date.now() / 1000); // Get current time in seconds

      return expirationTime > currentTime; // Token is valid if expiration is in the future
    } catch (error) {
      console.error('Failed to decode token for validity check:', error);
      return false; // If the token can't be decoded, it's invalid
    }
  }

  // force refresh
  async refreshToken(): Promise<string | null> {
    await this.authReady; // Optional, but ensures auth is ready

    if (this.user) {
      this.token = await this.user.getIdToken(true);
      return this.token;
    }
    return null;
  }

  /** Set a test token directly, bypassing Firebase auth (used by Cypress e2e bypass). */
  setTestToken(token: string): void {
    this.testBypass = true;
    this.token = token;
    if (this.resolveAuthReady) {
      this.resolveAuthReady();
      this.resolveAuthReady = null;
    }
  }

  clearToken(): void {
    this.token = null;
    this.user = null;
  }

  getCurrentUserObj(): UserData | null{
    let userObj: UserData | null = null;
    if (this.user) {
      userObj = {
        displayName: this.user?.displayName || '',
        email: this.user?.email || '',
        photoURL: this.user?.photoURL || userPlaceholderImage
      }
    }
    return userObj;
  }
}
