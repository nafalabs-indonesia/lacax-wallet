import {
  generateMnemonic as scureGenerateMnemonic,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { Wallet } from "ethers";

export class KeyDerivationService {
  static generateMnemonic(): string {
    try {
      return scureGenerateMnemonic(wordlist, 128);
    } catch (error) {
      console.error("Error generating mnemonic:", error);
      throw new Error("Gagal membuat seed phrase");
    }
  }

  static validateMnemonic(mnemonic: string): boolean {
    try {
      return validateMnemonic(mnemonic, wordlist);
    } catch (error) {
      console.error("Error validating mnemonic:", error);
      return false;
    }
  }

  static getPrivateKeyFromMnemonic(mnemonic: string): string {
    if (!this.validateMnemonic(mnemonic)) {
      throw new Error("Invalid Mnemonic");
    }

    try {
      const wallet = Wallet.fromPhrase(mnemonic);
      return wallet.privateKey;
    } catch (error) {
      console.error("Error deriving private key:", error);
      throw new Error("Gagal menurunkan kunci privat");
    }
  }

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
