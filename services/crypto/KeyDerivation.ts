// services/crypto/KeyDerivation.ts
import {
  generateMnemonic as scureGenerateMnemonic,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { Wallet } from "ethers";

export class KeyDerivationService {
  /**
   * Generate 12-word mnemonic (BIP39)
   */
  static generateMnemonic(): string {
    try {
      // ✅ Harus pakai 2 argument ini
      return scureGenerateMnemonic(wordlist, 128); // 128 = 12 words
    } catch (error) {
      console.error("Error generating mnemonic:", error);
      throw new Error("Gagal membuat seed phrase");
    }
  }

  /**
   * Validasi mnemonic
   */
  static validateMnemonic(mnemonic: string): boolean {
    try {
      return validateMnemonic(mnemonic, wordlist); // ← juga tambahkan wordlist
    } catch (error) {
      console.error("Error validating mnemonic:", error);
      return false;
    }
  }

  /**
   * Derive private key dari mnemonic
   */
  static getPrivateKeyFromMnemonic(mnemonic: string): string {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error("Invalid Mnemonic");
    }

    try {
      const wallet = Wallet.fromMnemonic(mnemonic);
      return wallet.privateKey;
    } catch (error) {
      console.error("Error deriving private key:", error);
      throw new Error("Gagal menurunkan kunci privat");
    }
  }

  /**
   * Ambil address dari private key
   */
  static getAddressFromPrivateKey(privateKey: string): string {
    try {
      const wallet = new Wallet(privateKey);
      return wallet.address;
    } catch (error) {
      console.error("Error getting address:", error);
      throw new Error("Gagal mendapatkan alamat wallet");
    }
  }
}
