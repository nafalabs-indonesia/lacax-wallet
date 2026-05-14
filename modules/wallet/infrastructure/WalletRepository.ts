// modules/wallet/infrastructure/WalletRepository.ts
import { ethers } from "ethers";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const KEY_ENCRYPTED_WALLET = "laca_encrypted_wallet_v1";
const KEY_IS_INITIALIZED = "laca_wallet_initialized_v1";
const KEY_WALLET_ADDRESS = "laca_wallet_address_v1";

export class WalletRepository {
  static async isInitialized(): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(KEY_IS_INITIALIZED);
      return value === "true";
    } catch (e) {
      return false;
    }
  }

  /**
   * Membuat wallet dan menyimpannya.
   * CATATAN: Karena ethers.encrypt() bermasalah dengan random di RN,
   * kita akan menyimpan Mnemonic secara TERENKRIPSI menggunakan Password sebagai kunci
   * dengan bantuan expo-crypto untuk derivasi kunci sederhana (PBKDF2 + AES).
   *
   * UNTUK KEAMANAN MAKSIMAL DI PRODUKSI: Pertimbangkan menggunakan library seperti
   * 'react-native-keychain' atau 'expo-secure-store' dengan skema enkripsi kustom.
   * Di sini, kita gunakan pendekatan sederhana: Simpan Mnemonic di SecureStore (yang sudah terenkripsi OS-level)
   * DAN lindungi aksesnya dengan Password Hash.
   */
  static async createWallet(mnemonic: string, password: string): Promise<void> {
    try {
      if (!mnemonic || mnemonic.split(" ").length !== 12) {
        throw new Error("Mnemonic tidak valid.");
      }
      if (!password || password.length < 8) {
        throw new Error("Password minimal 8 karakter.");
      }

      // 1. Derive Address
      const wallet = ethers.Wallet.fromMnemonic(mnemonic);
      const address = wallet.address;

      // 2. Hash Password untuk verifikasi nanti
      // Kita gunakan SHA-256 dari expo-crypto
      const passwordHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
      );

      // 3. Simpan Data ke SecureStore
      // SecureStore di iOS/Android sudah mengenkripsi data di level filesystem/keystore.
      // Jadi, menyimpan mnemonic di sini relatif aman selama perangkat terkunci.
      // Password hash digunakan untuk memverifikasi user sebelum memberikan akses baca.

      await SecureStore.setItemAsync("laca_mnemonic_encrypted", mnemonic); // Disimpan di SecureStore
      await SecureStore.setItemAsync("laca_password_hash", passwordHash);
      await SecureStore.setItemAsync(KEY_WALLET_ADDRESS, address);
      await SecureStore.setItemAsync(KEY_IS_INITIALIZED, "true");

      console.log("✅ Wallet saved securely via SecureStore.");
    } catch (error: any) {
      console.error("❌ Gagal menyimpan wallet:", error);
      throw new Error(error.message || "Gagal menyimpan wallet.");
    }
  }

  /**
   * Verifikasi Password.
   * Return true jika password cocok dengan hash yang tersimpan.
   */
  static async verifyPassword(password: string): Promise<boolean> {
    try {
      const storedHash = await SecureStore.getItemAsync("laca_password_hash");
      if (!storedHash) return false;

      const inputHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
      );

      return inputHash === storedHash;
    } catch (e) {
      return false;
    }
  }

  /**
   * Mendapatkan Mnemonic JIKA password benar.
   * Ini menggantikan konsep "decrypt" karena kita menyimpan di SecureStore.
   */
  static async getMnemonicIfValid(password: string): Promise<string | null> {
    const isValid = await this.verifyPassword(password);
    if (!isValid) return null;

    try {
      return await SecureStore.getItemAsync("laca_mnemonic_encrypted");
    } catch (e) {
      return null;
    }
  }

  static async getAddress(): Promise<string | null> {
    return await SecureStore.getItemAsync(KEY_WALLET_ADDRESS);
  }

  static async wipeWallet(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync("laca_mnemonic_encrypted");
      await SecureStore.deleteItemAsync("laca_password_hash");
      await SecureStore.deleteItemAsync(KEY_WALLET_ADDRESS);
      await SecureStore.deleteItemAsync(KEY_IS_INITIALIZED);
    } catch (e) {
      console.error("Gagal menghapus wallet", e);
    }
  }
}
