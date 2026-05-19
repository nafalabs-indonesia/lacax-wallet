// store/appStore.ts
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";

interface AppState {
  isDarkMode: boolean;
  toggleTheme: () => void;

  walletAddress: string | null;
  isUnlocked: boolean;
  mnemonic: string | null;
  isStorageLoaded: boolean;

  activeChainId: string;
  setActiveChainId: (id: string) => void;

  setWalletAddress: (address: string | null) => void;
  setUnlocked: (value: boolean) => void;
  setMnemonic: (mnemonic: string | null) => void;

  loadWalletFromStorage: () => Promise<void>;

  // ✅ Gunakan nama fungsi yang sesuai dengan Repository
  unlockWallet: (pin: string) => Promise<boolean>;

  resetWallet: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isDarkMode: true,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  walletAddress: null,
  isUnlocked: false,
  mnemonic: null,
  isStorageLoaded: false,

  activeChainId: "ethereum-mainnet",
  setActiveChainId: (id) => set({ activeChainId: id }),

  setWalletAddress: (address) => set({ walletAddress: address }),
  setUnlocked: (value) => set({ isUnlocked: value }),
  setMnemonic: (mnemonic) => set({ mnemonic }),

  loadWalletFromStorage: async () => {
    try {
      const savedAddress = await SecureStore.getItemAsync(
        "lacax_wallet_address_v1",
      );

      if (savedAddress) {
        set({
          walletAddress: savedAddress,
          isStorageLoaded: true,
          // mnemonic TETAP null di sini (belum di-unlock)
        });
      } else {
        set({ isStorageLoaded: true });
      }
    } catch (e) {
      console.error("Failed to load wallet from storage", e);
      set({ isStorageLoaded: true });
    }
  },

  unlockWallet: async (password: string): Promise<boolean> => {
    try {
      // 1. Verifikasi password dan ambil Mnemonic sekaligus
      // Fungsi ini akan return null jika password salah
      const recoveredMnemonic = await WalletRepository.getMnemonicIfValid(password);

      if (recoveredMnemonic) {
        // 2. Jika berhasil, simpan mnemonic ke State (Memory)
        //    dan update status unlocked
        set({
          mnemonic: recoveredMnemonic,
          isUnlocked: true,
        });
        return true;
      } else {
        // password Salah
        return false;
      }
    } catch (error) {
      console.error("Unlock failed:", error);
      return false;
    }
  },

  resetWallet: async () => {
    try {
      await WalletRepository.wipeWallet();
    } catch (e) {
      console.error("Failed to reset wallet", e);
    }
    set({
      walletAddress: null,
      mnemonic: null,
      isUnlocked: false,
      isStorageLoaded: true,
      activeChainId: "ethereum-mainnet",
    });
  },
}));
