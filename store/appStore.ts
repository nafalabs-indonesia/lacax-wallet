// store/appStore.ts
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";

interface AppState {
  isDarkMode: boolean;
  toggleTheme: () => void;

  walletAddress: string | null;
  isUnlocked: boolean;
  mnemonic: string | null; // Hanya digunakan sementara saat create/unlock, tidak disimpan persisten sebagai plain text
  isStorageLoaded: boolean; // Flag bahwa SecureStore sudah selesai dibaca

  setWalletAddress: (address: string | null) => void;
  setUnlocked: (value: boolean) => void;
  setMnemonic: (mnemonic: string | null) => void;

  loadWalletFromStorage: () => Promise<void>;
  resetWallet: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: true,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  walletAddress: null,
  isUnlocked: false,
  mnemonic: null,
  isStorageLoaded: false,

  setWalletAddress: (address) => set({ walletAddress: address }),
  setUnlocked: (value) => set({ isUnlocked: value }),
  setMnemonic: (mnemonic) => set({ mnemonic }),

  // ✅ FIX: Load wallet dari SecureStore saat app dibuka
  // Karena sekarang kita pakai enkripsi password, kita TIDAK load mnemonic mentah di sini.
  // Kita hanya load alamat publik untuk identifikasi cepat.
  loadWalletFromStorage: async () => {
    try {
      // Cek apakah wallet terenkripsi ada menggunakan key baru
      const encryptedWallet = await SecureStore.getItemAsync(
        "laca_encrypted_wallet_v1",
      );
      const savedAddress = await SecureStore.getItemAsync(
        "laca_wallet_address_v1",
      );

      if (savedAddress) {
        set({
          walletAddress: savedAddress,
          mnemonic: null, // PENTING: Jangan load mnemonic mentah demi keamanan
          isStorageLoaded: true,
        });
      } else {
        set({ isStorageLoaded: true });
      }
    } catch (e) {
      console.error("Gagal load wallet dari storage", e);
      set({ isStorageLoaded: true });
    }
  },

  // ✅ FIX: Reset wallet menggunakan method wipe dari Repository
  resetWallet: async () => {
    try {
      // Gunakan method wipe dari Repository agar konsisten dan menghapus semua key (lama & baru)
      await WalletRepository.wipeWallet();
    } catch (e) {
      console.error("Gagal reset wallet dari storage", e);
    }
    set({
      walletAddress: null,
      mnemonic: null,
      isUnlocked: false,
      isStorageLoaded: true,
    });
  },
}));
