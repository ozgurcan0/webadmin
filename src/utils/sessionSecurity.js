import { encrypt, decrypt } from 'crypto-js/aes';
import { enc } from 'crypto-js';
import { createError, ErrorCodes } from './errorHandler';

const SESSION_KEY = 'remote_desktop_session';
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-replace-in-production';

export class SessionSecurity {
  static validateSession() {
    try {
      const session = this.getSession();
      if (!session) return false;

      const { expiry } = session;
      return new Date().getTime() < expiry;
    } catch {
      return false;
    }
  }

  static createSession(userData) {
    const session = {
      ...userData,
      expiry: new Date().getTime() + (24 * 60 * 60 * 1000), // 24 hours
      created: new Date().getTime()
    };

    const encrypted = encrypt(JSON.stringify(session), ENCRYPTION_KEY);
    localStorage.setItem(SESSION_KEY, encrypted.toString());
    return session;
  }

  static getSession() {
    try {
      const encrypted = localStorage.getItem(SESSION_KEY);
      if (!encrypted) return null;

      const decrypted = decrypt(encrypted, ENCRYPTION_KEY);
      return JSON.parse(decrypted.toString(enc.Utf8));
    } catch (error) {
      console.error('Session decryption failed:', error);
      return null;
    }
  }

  static clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  static validatePermission(permission) {
    const session = this.getSession();
    if (!session) {
      throw createError(ErrorCodes.AUTH_ERROR, 'No active session');
    }

    const { permissions = [] } = session;
    if (!permissions.includes(permission)) {
      throw createError(ErrorCodes.PERMISSION_ERROR, `Missing required permission: ${permission}`);
    }

    return true;
  }

  static encryptData(data) {
    try {
      return encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw createError(ErrorCodes.ENCRYPTION_ERROR, 'Failed to encrypt data');
    }
  }

  static decryptData(encryptedData) {
    try {
      const decrypted = decrypt(encryptedData, ENCRYPTION_KEY);
      return JSON.parse(decrypted.toString(enc.Utf8));
    } catch (error) {
      console.error('Decryption failed:', error);
      throw createError(ErrorCodes.ENCRYPTION_ERROR, 'Failed to decrypt data');
    }
  }

  static generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}