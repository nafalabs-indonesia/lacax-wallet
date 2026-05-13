// store/appStore.ts
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

interface AppState {
  isDarkMode: boolean;
  toggleTheme: () => void;

  walletAddress: string | null;
  isUnlocked: boolean;
  mnemonic: string | null;
  isStorageLoaded: boolean; // ✅ BARU: flag bahwa SecureStore sudah selesai dibaca

  setWalletAddress: (address: string | null) => void;
  setUnlocked: (value: boolean) => void;
  setMnemonic: (mnemonic: string | null) => void;

  loadWalletFromStorage: () => Promise<void>;
  resetWallet: () => Promise<void>; // ✅ FIX: ubah signature jadi async
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: true,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  walletAddress: null,
  isUnlocked: false,
  mnemonic: null,
  isStorageLoaded: false, // ✅ BARU: awalnya false, jadi routing guard tahu harus tunggu dulu

  setWalletAddress: (address) => set({ walletAddress: address }),
  setUnlocked: (value) => set({ isUnlocked: value }),
  setMnemonic: (mnemonic) => set({ mnemonic }),

  // ✅ FIX: Load wallet dari SecureStore saat app dibuka
  // Dipanggil SEKALI di _layout.tsx, sebelum routing guard aktif
  loadWalletFromStorage: async () => {
    try {
      const savedAddress = await SecureStore.getItemAsync("walletAddress");
      const savedMnemonic = await SecureStore.getItemAsync("mnemonic");

      if (savedAddress) {
        set({
          walletAddress: savedAddress,
          mnemonic: savedMnemonic,
          isStorageLoaded: true, // ✅ tandai selesai
        });
      } else {
        set({ isStorageLoaded: true }); // ✅ tetap tandai selesai meski tidak ada wallet
      }
    } catch (e) {
      console.error("Gagal load wallet dari storage", e);
      set({ isStorageLoaded: true }); // ✅ tetap lanjut agar app tidak hang
    }
  },

  // ✅ FIX: Sekarang benar-benar async dan di-await dengan benar
  resetWallet: async () => {
    try {
      await SecureStore.deleteItemAsync("walletAddress");
      await SecureStore.deleteItemAsync("mnemonic");
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
