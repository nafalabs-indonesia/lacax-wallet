// modules/wallet/infrastructure/WalletRepository.ts
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const KEY_MNEMONIC = "laca_wallet_mnemonic_v1";
const KEY_IS_INITIALIZED = "laca_wallet_initialized_v1";
const KEY_PIN_HASH = "laca_wallet_pin_hash_v1";

export class WalletRepository {
  // ── Internal: hash PIN dengan SHA-256 ──
  private static async hashPin(pin: string): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin,
    );
  }

  static async isInitialized(): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(KEY_IS_INITIALIZED);
      return value === "true";
    } catch (e) {
      console.error("Error checking initialization:", e);
      return false;
    }
  }

  static async createWallet(mnemonic: string, pin: string): Promise<void> {
    try {
      if (!mnemonic || mnemonic.length < 10) {
        throw new Error("Mnemonic tidak valid");
      }
      if (pin.length !== 6) {
        throw new Error("PIN harus 6 digit");
      }

      // Hash PIN lalu simpan
      const pinHash = await WalletRepository.hashPin(pin);

      await SecureStore.setItemAsync(KEY_MNEMONIC, mnemonic);
      await SecureStore.setItemAsync(KEY_PIN_HASH, pinHash);
      await SecureStore.setItemAsync(KEY_IS_INITIALIZED, "true");

      console.log("✅ Wallet berhasil disimpan ke SecureStore");
    } catch (error) {
      console.error("❌ Gagal menyimpan wallet:", error);
      throw new Error("Gagal menyimpan wallet ke perangkat aman");
    }
  }

  static async importWallet(mnemonic: string, pin: string): Promise<void> {
    try {
      if (pin.length !== 6) {
        throw new Error("PIN harus 6 digit");
      }

      const pinHash = await WalletRepository.hashPin(pin);

      await SecureStore.setItemAsync(KEY_MNEMONIC, mnemonic.trim());
      await SecureStore.setItemAsync(KEY_PIN_HASH, pinHash);
      await SecureStore.setItemAsync(KEY_IS_INITIALIZED, "true");
    } catch (error) {
      console.error("Gagal import wallet:", error);
      throw new Error("Gagal mengimpor wallet");
    }
  }

  // Verifikasi PIN — return true kalau cocok
  static async verifyPin(pin: string): Promise<boolean> {
    try {
      const storedHash = await SecureStore.getItemAsync(KEY_PIN_HASH);
      if (!storedHash) return false;

      const inputHash = await WalletRepository.hashPin(pin);
      return inputHash === storedHash;
    } catch (e) {
      console.error("Error verifying PIN:", e);
      return false;
    }
  }

  static async getMnemonic(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY_MNEMONIC);
    } catch (error) {
      return null;
    }
  }

  static async wipeWallet(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEY_MNEMONIC);
      await SecureStore.deleteItemAsync(KEY_PIN_HASH);
      await SecureStore.deleteItemAsync(KEY_IS_INITIALIZED);
    } catch (e) {
      console.error("Gagal menghapus wallet", e);
    }
  }
}
