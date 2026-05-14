// hooks/useCreateWallet.ts
import { useRouter } from "expo-router";
import { useState } from "react";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";
import { KeyDerivationService } from "../services/crypto/KeyDerivation";
import { useAppStore } from "../store/appStore";

export const useCreateWallet = () => {
  const router = useRouter();

  // State yang masih diperlukan
  const [mnemonic, setMnemonic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hapus state pin, step, verifyIndices, selectedWords jika tidak dipakai lagi oleh UI baru
  // Karena UI reveal-seed.tsx sekarang menangani flow sendiri, hook ini hanya fokus pada create & finalize

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
    // Validasi password minimal (opsional, bisa juga divalidasi di UI)
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Simpan ke SecureStore menggunakan PASSWORD sebagai kunci enkripsi
      // Pastikan WalletRepository.createWallet menerima password, bukan pin
      await WalletRepository.createWallet(mnemonic, password);

      // 2. Derive Address (untuk ditampilkan/disimpan di store)
      const privateKey =
        KeyDerivationService.getPrivateKeyFromMnemonic(mnemonic);
      const address = KeyDerivationService.getAddressFromPrivateKey(privateKey);

      // 3. Update Global Store
      useAppStore.getState().setWalletAddress(address);
      useAppStore.getState().setMnemonic(mnemonic);

      // Catatan: isUnlocked TIDAK diset true di sini.
      // User harus melalui halaman unlock setelah restart app.

      console.log("✅ Wallet Created Successfully:", address);

      return true;
    } catch (e: any) {
      console.error("❌ Create Wallet Error:", e);
      setError(e.message || "Gagal menyimpan wallet.");
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
