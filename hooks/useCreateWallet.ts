// hooks/useCreateWallet.ts
import { useRouter } from "expo-router";
import { useState } from "react";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";
import { KeyDerivationService } from "../services/crypto/KeyDerivation";
import { useAppStore } from "../store/appStore";

export const useCreateWallet = () => {
  const router = useRouter(); // Router tetap di-import jika dibutuhkan di fungsi lain, tapi tidak dipakai di finalizeWallet

  const [step, setStep] = useState(1);
  const [mnemonic, setMnemonic] = useState("");
  // State 'pin' di hook ini mungkin tidak lagi digunakan untuk finalisasi jika kita kirim via argumen,
  // tapi biarkan saja jika dipakai di step lain.
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const generateNewWallet = () => {
    try {
      const newMnemonic = KeyDerivationService.generateMnemonic();
      setMnemonic(newMnemonic);
      setStep(1);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Gagal membuat seed phrase.");
    }
  };

  const startVerification = () => {
    const indices: number[] = [];
    while (indices.length < 3) {
      const r = Math.floor(Math.random() * 12);
      if (!indices.includes(r)) indices.push(r);
    }
    setVerifyIndices(indices.sort((a, b) => a - b));
    setStep(2);
  };

  const handleWordSelect = (word: string) => {
    if (selectedWords.length < 3) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const verifySeedPhrase = () => {
    const words = mnemonic.split(" ");

    if (selectedWords.length < 3) return;

    const isValid = verifyIndices.every((index, i) => {
      return words[index] === selectedWords[i];
    });

    if (isValid) {
      setStep(3);
      setSelectedWords([]);
      setError(null);
    } else {
      setError("Kata kunci tidak sesuai. Coba lagi.");
      setSelectedWords([]);
    }
  };

  // PERBAIKAN DI SINI: Terima argumen inputPin dan return boolean
  const finalizeWallet = async (inputPin: string): Promise<boolean> => {
    if (inputPin.length !== 6) {
      setError("PIN harus 6 digit");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Simpan ke SecureStore menggunakan inputPin
      await WalletRepository.createWallet(mnemonic, inputPin);

      // 2. Derive Address
      const privateKey =
        KeyDerivationService.getPrivateKeyFromMnemonic(mnemonic);
      const address = KeyDerivationService.getAddressFromPrivateKey(privateKey);

      // 3. Update Global Store
      useAppStore.getState().setWalletAddress(address);
      useAppStore.getState().setUnlocked(true);
      useAppStore.getState().setMnemonic(mnemonic);

      console.log("✅ Wallet Created Successfully:", address);

      // HAPUS router.replace dari sini. Biarkan komponen yang melakukan navigasi.

      return true; // Sukses
    } catch (e: any) {
      console.error("❌ Create Wallet Error:", e);
      setError(e.message || "Gagal menyimpan wallet.");
      return false; // Gagal
    } finally {
      setIsLoading(false);
    }
  };

  return {
    step,
    mnemonic,
    pin,
    setPin,
    isLoading,
    error,
    verifyIndices,
    selectedWords,
    generateNewWallet,
    startVerification,
    handleWordSelect,
    verifySeedPhrase,
    finalizeWallet,
    setError,
  };
};
