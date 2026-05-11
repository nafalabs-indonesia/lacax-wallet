// modules/wallet/infrastructure/WalletRepository.ts
import * as SecureStore from "expo-secure-store";

const KEY_MNEMONIC = "laca_wallet_mnemonic_v1";
const KEY_IS_INITIALIZED = "laca_wallet_initialized_v1";

export class WalletRepository {
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
      // Validasi input sebelum simpan
      if (!mnemonic || mnemonic.length < 10) {
        throw new Error("Mnemonic tidak valid");
      }

      // Simpan Mnemonic
      await SecureStore.setItemAsync(KEY_MNEMONIC, mnemonic);

      // Set Flag Initialized
      await SecureStore.setItemAsync(KEY_IS_INITIALIZED, "true");

      console.log("✅ Wallet berhasil disimpan ke SecureStore");
    } catch (error) {
      console.error("❌ Gagal menyimpan wallet:", error);
      throw new Error("Gagal menyimpan wallet ke perangkat aman");
    }
  }

  static async importWallet(mnemonic: string, pin: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(KEY_MNEMONIC, mnemonic.trim());
      await SecureStore.setItemAsync(KEY_IS_INITIALIZED, "true");
    } catch (error) {
      console.error("Gagal import wallet:", error);
      throw new Error("Gagal mengimpor wallet");
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
      await SecureStore.deleteItemAsync(KEY_IS_INITIALIZED);
    } catch (e) {
      console.error("Gagal menghapus wallet", e);
    }
  }
}
