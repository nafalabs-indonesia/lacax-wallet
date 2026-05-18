// modules/wallet/infrastructure/WalletRepository.ts
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";

// @noble/hashes v2 — semua import pakai path .js dan sha256 ada di sha2.js
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const bytesToUtf8 = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

// @noble/ciphers v2 — aes256gcm diganti gcm, utils terpisah
import { gcm } from "@noble/ciphers/aes.js";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";

// ====================== SECURITY CONFIGURATION ======================
const PBKDF2_ITERATIONS = 30_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const NONCE_LENGTH = 12;

const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 3_600_000;

// ====================== SESSION CACHE ======================

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 menit

const KEYS = {
  ENCRYPTED_PAYLOAD: "lacax_encrypted_wallet_v1",
  IS_INITIALIZED: "lacax_wallet_initialized_v1",
  WALLET_ADDRESS: "lacax_wallet_address_v1",
  RATE_LIMIT: "lacax_rate_limit_v1",
} as const;

// ====================== TYPES ======================
interface EncryptedPayload {
  ciphertext: string;
  salt: string;
  iterations: number;
}

interface RateLimitState {
  attempts: number;
  lockedUntil: number;
}

// ====================== RATE LIMITING ======================

async function getRateLimit(): Promise<RateLimitState> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.RATE_LIMIT);
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

async function saveRateLimit(state: RateLimitState): Promise<void> {
  await SecureStore.setItemAsync(KEYS.RATE_LIMIT, JSON.stringify(state));
}

async function assertNotRateLimited(): Promise<void> {
  const state = await getRateLimit();

  if (state.lockedUntil > Date.now()) {
    const remaining = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    throw new Error(`RATE_LIMITED:${remaining}`);
  }
}

async function recordFailedAttempt(): Promise<void> {
  const state = await getRateLimit();

  state.attempts += 1;

  if (state.attempts >= MAX_ATTEMPTS) {
    const multiplier = Math.pow(2, state.attempts - MAX_ATTEMPTS);

    const lockTime = Math.min(BASE_LOCKOUT_MS * multiplier, MAX_LOCKOUT_MS);

    state.lockedUntil = Date.now() + lockTime;
  }

  await saveRateLimit(state);
}

async function resetRateLimit(): Promise<void> {
  await saveRateLimit({ attempts: 0, lockedUntil: 0 });
}

// ====================== CRYPTO HELPERS ======================

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  const passwordBytes = utf8ToBytes(password);

  return pbkdf2Async(sha256, passwordBytes, salt, {
    c: iterations,
    dkLen: KEY_LENGTH,
  });
}

async function encryptMnemonic(
  mnemonic: string,
  key: Uint8Array,
): Promise<string> {
  const nonce = randomBytes(NONCE_LENGTH);

  const cipher = gcm(key, nonce);

  const plaintextBytes = utf8ToBytes(mnemonic);

  const ciphertextWithTag = cipher.encrypt(plaintextBytes);

  const combined = new Uint8Array(nonce.length + ciphertextWithTag.length);

  combined.set(nonce, 0);

  combined.set(ciphertextWithTag, nonce.length);

  return bytesToHex(combined);
}

async function decryptMnemonic(
  encryptedHex: string,
  key: Uint8Array,
): Promise<string | null> {
  const combined = hexToBytes(encryptedHex);

  const nonce = combined.slice(0, NONCE_LENGTH);

  const ciphertextWithTag = combined.slice(NONCE_LENGTH);

  try {
    const cipher = gcm(key, nonce);

    const plaintextBytes = cipher.decrypt(ciphertextWithTag);

    return bytesToUtf8(plaintextBytes);
  } catch {
    return null;
  }
}

async function verifyKey(
  encryptedHex: string,
  key: Uint8Array,
): Promise<boolean> {
  const combined = hexToBytes(encryptedHex);

  const nonce = combined.slice(0, NONCE_LENGTH);

  const ciphertextWithTag = combined.slice(NONCE_LENGTH);

  try {
    gcm(key, nonce).decrypt(ciphertextWithTag);

    return true;
  } catch {
    return false;
  }
}

// ====================== WALLET REPOSITORY ======================

export class WalletRepository {
  private static sessionKey: Uint8Array | null = null;

  private static sessionExpiresAt = 0;

  static async isInitialized(): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(KEYS.IS_INITIALIZED);

      return value === "true";
    } catch {
      return false;
    }
  }

  // ====================== SESSION CACHE ======================

  private static getCachedKey(): Uint8Array | null {
    if (this.sessionKey && Date.now() < this.sessionExpiresAt) {
      return this.sessionKey;
    }

    this.clearSession();

    return null;
  }

  private static cacheKey(key: Uint8Array): void {
    this.sessionKey = key;

    this.sessionExpiresAt = Date.now() + SESSION_DURATION_MS;
  }

  static clearSession(): void {
    if (this.sessionKey) {
      this.sessionKey.fill(0);
    }

    this.sessionKey = null;

    this.sessionExpiresAt = 0;
  }

  static async createWallet(mnemonic: string, password: string): Promise<void> {
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error(
        "Invalid mnemonic. Use a valid 12 or 24-word BIP39 phrase.",
      );
    }

    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const wallet = ethers.Wallet.fromMnemonic(mnemonic);

    const address = wallet.address;

    const salt = randomBytes(SALT_LENGTH);

    const encryptionKey = await deriveKey(password, salt);

    const encryptedData = await encryptMnemonic(mnemonic, encryptionKey);

    const payload: EncryptedPayload = {
      ciphertext: encryptedData,
      salt: bytesToHex(salt),
      iterations: PBKDF2_ITERATIONS,
    };

    await SecureStore.setItemAsync(
      KEYS.ENCRYPTED_PAYLOAD,
      JSON.stringify(payload),
    );

    await SecureStore.setItemAsync(KEYS.WALLET_ADDRESS, address);

    await SecureStore.setItemAsync(KEYS.IS_INITIALIZED, "true");

    await resetRateLimit();

    console.log(
      "✅ Wallet successfully created and encrypted with AES-256-GCM + PBKDF2.",
    );
  }

  static async verifyPassword(password: string): Promise<boolean> {
    await assertNotRateLimited();

    try {
      const raw = await SecureStore.getItemAsync(KEYS.ENCRYPTED_PAYLOAD);

      if (!raw) return false;

      const {
        ciphertext,
        salt: saltHex,
        iterations,
      }: EncryptedPayload = JSON.parse(raw);

      // ======================
      // CHECK CACHE
      // ======================

      const cachedKey = this.getCachedKey();

      if (cachedKey) {
        const isValidCached = await verifyKey(ciphertext, cachedKey);

        if (isValidCached) {
          await resetRateLimit();

          return true;
        }
      }

      // ======================
      // DERIVE NEW KEY
      // ======================

      const salt = hexToBytes(saltHex);

      const key = await deriveKey(password, salt, iterations);

      const isValid = await verifyKey(ciphertext, key);

      if (isValid) {
        this.cacheKey(key);

        await resetRateLimit();
      } else {
        key.fill(0);

        await recordFailedAttempt();
      }

      return isValid;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("RATE_LIMITED")) {
        throw e;
      }

      await recordFailedAttempt();

      return false;
    }
  }

  static async getMnemonicIfValid(password: string): Promise<string | null> {
    await assertNotRateLimited();

    try {
      const raw = await SecureStore.getItemAsync(KEYS.ENCRYPTED_PAYLOAD);

      if (!raw) return null;

      const {
        ciphertext,
        salt: saltHex,
        iterations,
      }: EncryptedPayload = JSON.parse(raw);

      // ======================
      // TRY CACHED KEY FIRST
      // ======================

      const cachedKey = this.getCachedKey();

      if (cachedKey) {
        const mnemonic = await decryptMnemonic(ciphertext, cachedKey);

        if (mnemonic !== null) {
          await resetRateLimit();

          return mnemonic;
        }
      }

      // ======================
      // DERIVE NEW KEY
      // ======================

      const salt = hexToBytes(saltHex);

      const key = await deriveKey(password, salt, iterations);

      const mnemonic = await decryptMnemonic(ciphertext, key);

      if (mnemonic !== null) {
        this.cacheKey(key);

        await resetRateLimit();

        return mnemonic;
      } else {
        key.fill(0);

        await recordFailedAttempt();

        return null;
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("RATE_LIMITED")) {
        throw e;
      }

      console.error("❌ Failed to decrypt wallet. Data may be corrupted:", e);

      await recordFailedAttempt();

      return null;
    }
  }

  static async getAddress(): Promise<string | null> {
    return await SecureStore.getItemAsync(KEYS.WALLET_ADDRESS);
  }

  static async wipeWallet(): Promise<void> {
    this.clearSession();

    await Promise.allSettled([
      SecureStore.deleteItemAsync(KEYS.ENCRYPTED_PAYLOAD),

      SecureStore.deleteItemAsync(KEYS.WALLET_ADDRESS),

      SecureStore.deleteItemAsync(KEYS.IS_INITIALIZED),

      SecureStore.deleteItemAsync(KEYS.RATE_LIMIT),
    ]);
  }

  static async getLockoutRemainingSeconds(): Promise<number> {
    const state = await getRateLimit();

    if (state.lockedUntil <= Date.now()) {
      return 0;
    }

    return Math.ceil((state.lockedUntil - Date.now()) / 1000);
  }

  static async getFailedAttemptCount(): Promise<number> {
    const state = await getRateLimit();

    return state.attempts;
  }
}
