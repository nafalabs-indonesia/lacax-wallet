// store/appStore.ts
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

interface AppState {
  isDarkMode: boolean;
  toggleTheme: () => void;

  walletAddress: string | null;
  isUnlocked: boolean;
  mnemonic: string | null; // opsional

  setWalletAddress: (address: string | null) => void;
  setUnlocked: (value: boolean) => void;
  setMnemonic: (mnemonic: string | null) => void;

  loadWalletFromStorage: () => Promise<void>;
  resetWallet: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isDarkMode: false,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  walletAddress: null,
  isUnlocked: false,
  mnemonic: null,

  setWalletAddress: (address) => set({ walletAddress: address }),
  setUnlocked: (value) => set({ isUnlocked: value }),
  setMnemonic: (mnemonic) => set({ mnemonic }),

  // Load wallet dari SecureStore saat app dibuka
  loadWalletFromStorage: async () => {
    try {
      const savedAddress = await SecureStore.getItemAsync("walletAddress");
      const savedMnemonic = await SecureStore.getItemAsync("mnemonic");

      if (savedAddress) {
        set({
          walletAddress: savedAddress,
          mnemonic: savedMnemonic,
        });
      }
    } catch (e) {
      console.error("Gagal load wallet dari storage", e);
    }
  },

  resetWallet: async () => {
    await SecureStore.deleteItemAsync("walletAddress");
    await SecureStore.deleteItemAsync("mnemonic");
    set({
      walletAddress: null,
      mnemonic: null,
      isUnlocked: false,
    });
  },
}));
