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

  // ✅ TAMBAHKAN INI
  activeChainId: string;
  setActiveChainId: (id: string) => void;

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

  // ✅ DEFAULT VALUE: Ethereum Mainnet
  activeChainId: "ethereum-mainnet",
  setActiveChainId: (id) => set({ activeChainId: id }),

  setWalletAddress: (address) => set({ walletAddress: address }),
  setUnlocked: (value) => set({ isUnlocked: value }),
  setMnemonic: (mnemonic) => set({ mnemonic }),

  loadWalletFromStorage: async () => {
    try {
      const encryptedWallet = await SecureStore.getItemAsync(
        "laca_encrypted_wallet_v1",
      );
      const savedAddress = await SecureStore.getItemAsync(
        "laca_wallet_address_v1",
      );

      if (savedAddress) {
        set({
          walletAddress: savedAddress,
          mnemonic: null,
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

  resetWallet: async () => {
    try {
      await WalletRepository.wipeWallet();
    } catch (e) {
      console.error("Gagal reset wallet dari storage", e);
    }
    set({
      walletAddress: null,
      mnemonic: null,
      isUnlocked: false,
      isStorageLoaded: true,
      activeChainId: "ethereum-mainnet", // Reset ke default
    });
  },
}));
