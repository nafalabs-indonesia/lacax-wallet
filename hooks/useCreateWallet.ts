import { useRouter } from "expo-router";
import { useState } from "react";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";
import { KeyDerivationService } from "../services/crypto/KeyDerivation";
import { useAppStore } from "../store/appStore";

export const useCreateWallet = () => {
  const router = useRouter();

  const [mnemonic, setMnemonic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateNewWallet = () => {
    try {
      const newMnemonic = KeyDerivationService.generateMnemonic();
      setMnemonic(newMnemonic);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Gagal membuat seed phrase.");
    }
  };

  const finalizeWallet = async (password: string): Promise<boolean> => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await WalletRepository.createWallet(mnemonic, password);

      const privateKey =
        KeyDerivationService.getPrivateKeyFromMnemonic(mnemonic);
      const address = KeyDerivationService.getAddressFromPrivateKey(privateKey);

      useAppStore.getState().setWalletAddress(address);
      useAppStore.getState().setMnemonic(mnemonic);

      return true;
    } catch (e: any) {
      console.error("❌ Create Wallet Error:", e);
      setError(e.message || "Failed to save wallet.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mnemonic,
    isLoading,
    error,
    generateNewWallet,
    finalizeWallet,
    setError,
  };
};
