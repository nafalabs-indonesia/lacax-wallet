// store/appStore.ts
import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";

interface WcRequestData {
  isVisible: boolean;
  topic: string | null;
  id: number | null;
  method: string | null;
  params: any[] | null;
  chainId: number | null;
}

interface AppState {
  isDarkMode: boolean;
  toggleTheme: () => void;

  walletAddress: string | null;
  isUnlocked: boolean;
  mnemonic: string | null;
  privateKey: string | null;
  isStorageLoaded: boolean;

  activeChainId: string;
  setActiveChainId: (id: string) => void;

  // ✅ State untuk Konfirmasi WalletConnect
  wcRequest: WcRequestData | null;
  setWcRequest: (request: WcRequestData | null) => void;

  setWalletAddress: (address: string | null) => void;
  setUnlocked: (value: boolean) => void;
  setMnemonic: (mnemonic: string | null) => void;

  loadWalletFromStorage: () => Promise<void>;
  unlockWallet: (pin: string) => Promise<boolean>;
  resetWallet: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isDarkMode: true,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  walletAddress: null,
  isUnlocked: false,
  mnemonic: null,
  privateKey: null,
  isStorageLoaded: false,
  
  // ✅ Inisialisasi State WC Request
  wcRequest: null,
  setWcRequest: (request) => set({ wcRequest: request }),

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
      const recoveredMnemonic = await WalletRepository.getMnemonicIfValid(password);

      if (recoveredMnemonic) {
        const wallet = ethers.Wallet.fromPhrase(recoveredMnemonic);
        const derivedPrivateKey = wallet.privateKey;

        set({
          mnemonic: recoveredMnemonic,
          privateKey: derivedPrivateKey,
          isUnlocked: true,
        });
        return true;
      } else {
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
      privateKey: null,
      wcRequest: null, // Reset juga request WC jika ada
      isUnlocked: false,
      isStorageLoaded: true,
      activeChainId: "ethereum-mainnet",
    });
  },
}));