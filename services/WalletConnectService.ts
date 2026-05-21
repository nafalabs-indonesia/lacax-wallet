// services/WalletConnectService.ts
import { Core } from "@walletconnect/core";
import { IWeb3Wallet, Web3Wallet } from "@walletconnect/web3wallet";
import { createPublicClient, createWalletClient, Hex, http, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  arbitrum,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
import { useAppStore } from "../store/appStore";

const PROJECT_ID = "0e48a9edf33a440b4d2dcc976b42a4c4";

let web3Wallet: IWeb3Wallet | null = null;

// ─── Pesan error WalletConnect yang aman diabaikan ──────────────────────────
// Error-error ini adalah noise normal dari internal WC (expired proposals,
// stale pairings, HMR reload) dan tidak perlu sampai ke user / Sentry.
const IGNORABLE_WC_ERRORS = [
  "Missing or invalid", // proposal/pairing sudah expired
  "No matching key", // session tidak ditemukan di store WC
  "Proposal expired", // proposal TTL habis
  "Record was recently deleted", // expirer cleanup
  "Pairing already exists", // URI dipakai ulang
];

const isIgnorableWcError = (msg: string): boolean =>
  IGNORABLE_WC_ERRORS.some((pattern) => msg?.includes(pattern));

// ─── Chain registry ──────────────────────────────────────────────────────────

const CHAIN_MAP: Record<number, any> = {
  1: mainnet,
  137: polygon,
  56: bsc,
  11155111: sepolia,
  42161: arbitrum,
  10: optimism,
  8453: base,
};

const getChainById = (chainId: number) => CHAIN_MAP[chainId] ?? mainnet;

const EIP155_CHAINS = Object.keys(CHAIN_MAP).map((id) => `eip155:${id}`);

// ─── Init ────────────────────────────────────────────────────────────────────

export const initWalletConnect = async (): Promise<IWeb3Wallet> => {
  if (web3Wallet) return web3Wallet;

  try {
    const core = new Core({ projectId: PROJECT_ID });
    web3Wallet = await Web3Wallet.init({
      core: core as any,
      metadata: {
        name: "LacaX Wallet",
        description: "Secure Crypto Wallet",
        url: "https://lacaxwallet.com",
        icons: ["https://avatars.githubusercontent.com/u/37784886"],
        redirect: {
          native: "lacaxwallet://",
          universal: "https://lacaxwallet.com",
        },
      },
    });

    // ── Bersihkan proposal & pairing yang sudah expired saat init ─────────
    // Ini mencegah error "Missing or invalid / Record was recently deleted"
    // yang muncul ketika WC's expirer mencoba memproses proposal lama
    // (terutama setelah HMR reload atau restart app).
    await _cleanupExpiredRecords();

    console.log("✅ WalletConnect Initialized");
  } catch (error: any) {
    // Jika error saat init sendiri adalah stale record, reset instance dan coba lagi
    if (isIgnorableWcError(error?.message ?? "")) {
      console.warn("⚠️ WC init encountered stale records, resetting...");
      web3Wallet = null;
    } else {
      console.error("❌ Failed to initialize WalletConnect:", error);
      throw error;
    }
  }
  return web3Wallet!;
};

// ─── Bersihkan records expired ───────────────────────────────────────────────
// Proposal WalletConnect punya TTL ~5 menit. Jika app di-restart / HMR
// setelah proposal masuk tapi belum di-approve/reject, proposal lama itu
// masih ada di AsyncStorage tapi sudah dianggap deleted oleh expirer WC.
// Fungsi ini secara proaktif menghapusnya.

const _cleanupExpiredRecords = async (): Promise<void> => {
  if (!web3Wallet) return;
  try {
    const pendingProposals = Object.values(
      web3Wallet.getPendingSessionProposals?.() ?? {},
    );
    const now = Math.floor(Date.now() / 1000);

    for (const proposal of pendingProposals) {
      const expiry =
        (proposal as any).expiryTimestamp ?? (proposal as any).expiry ?? 0;
      const isExpired = expiry > 0 && now > expiry;
      const id = (proposal as any).id;

      if (!id) continue;

      if (isExpired) {
        console.log(`🧹 Removing expired proposal: ${id}`);
        try {
          await web3Wallet!.rejectSession({
            id,
            reason: { code: 4001, message: "Proposal expired" },
          });
        } catch {
          // Sudah tidak ada di WC store — abaikan
        }
      }
    }
  } catch (e) {
    // Cleanup bersifat best-effort; jangan crash init karena ini
    console.warn("⚠️ _cleanupExpiredRecords encountered an issue:", e);
  }
};

// ─── Pairing ─────────────────────────────────────────────────────────────────

export const pairWithURI = async (uri: string): Promise<boolean> => {
  if (!web3Wallet) await initWalletConnect();
  try {
    await web3Wallet!.core.pairing.pair({ uri });
    return true;
  } catch (error: any) {
    // "Pairing already exists" → URI dipakai ulang, bukan error fatal
    if (isIgnorableWcError(error?.message ?? "")) {
      console.warn("⚠️ pairWithURI (ignorable):", error.message);
      return true;
    }
    throw new Error(error.message || "Pairing failed");
  }
};

// ─── Event Listeners ─────────────────────────────────────────────────────────

export const registerEventListeners = () => {
  if (!web3Wallet) return;

  if ((web3Wallet as any)._listenersRegistered) return;
  (web3Wallet as any)._listenersRegistered = true;

  // ── 1. Session Proposal ──────────────────────────────────────────────────
  web3Wallet.on("session_proposal", async (proposal) => {
    const proposalId = (proposal as any).id ?? (proposal as any).proposal?.id;
    if (!proposalId) return;

    // Cek apakah proposal ini sudah expired sebelum diproses
    const expiry =
      (proposal as any).expiryTimestamp ??
      (proposal as any).expiry ??
      (proposal as any).params?.expiryTimestamp ??
      0;
    const now = Math.floor(Date.now() / 1000);
    if (expiry > 0 && now > expiry) {
      console.warn(
        "⚠️ Received already-expired proposal, skipping:",
        proposalId,
      );
      try {
        await web3Wallet!.rejectSession({
          id: proposalId,
          reason: { code: 4001, message: "Proposal expired" },
        });
      } catch {
        /* stale — abaikan */
      }
      return;
    }

    const currentAddress = useAppStore.getState().walletAddress;
    if (!currentAddress) {
      try {
        await web3Wallet!.rejectSession({
          id: proposalId,
          reason: { code: 4001, message: "No wallet connected" },
        });
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      await web3Wallet!.approveSession({
        id: proposalId,
        namespaces: {
          eip155: {
            accounts: EIP155_CHAINS.map(
              (chain) => `${chain}:${currentAddress}`,
            ),
            methods: [
              "eth_sendTransaction",
              "eth_sendRawTransaction",
              "personal_sign",
              "eth_sign",
              "eth_signTypedData",
              "eth_signTypedData_v4",
              "wallet_switchEthereumChain",
              "wallet_addEthereumChain",
              "eth_getBalance",
              "eth_accounts",
              "eth_requestAccounts",
              "eth_chainId",
            ],
            events: ["chainChanged", "accountsChanged"],
            chains: EIP155_CHAINS,
          },
        },
      });
      console.log("✅ Session Approved");
    } catch (error: any) {
      if (isIgnorableWcError(error?.message ?? "")) {
        console.warn("⚠️ approveSession (ignorable):", error.message);
      } else {
        console.error("❌ Session Approval Error:", error.message);
      }
    }
  });

  // ── 2. Session Request ───────────────────────────────────────────────────
  web3Wallet.on("session_request", async (requestEvent) => {
    const topic = (requestEvent as any).topic;
    const request = (requestEvent as any).params?.request;
    const id = (requestEvent as any).id;
    const chainIdStr = (requestEvent as any).params?.chainId ?? "eip155:1";
    const chainId = parseInt(chainIdStr.replace("eip155:", ""), 10);

    if (!topic || !request || !id) return;

    console.log("📩 Incoming Request:", request.method);

    useAppStore.getState().setWcRequest({
      isVisible: true,
      topic,
      id,
      method: request.method,
      params: request.params,
      chainId,
    });
  });

  // ── 3. Session Delete (dApp disconnected) ────────────────────────────────
  web3Wallet.on("session_delete", ({ topic }) => {
    console.log("🔌 Session deleted by dApp:", topic);
    useAppStore.getState().setWcRequest(null);
  });
};

// ─── Respond to Request ───────────────────────────────────────────────────────
//
// BEHAVIOUR CONTRACT:
//   - Reject  → selalu resolve (tidak throw).
//   - Approve → berhasil → resolve.
//               gagal    → throw Error (setelah respond ke dApp & clear state).
// ─────────────────────────────────────────────────────────────────────────────

export const respondToWcRequest = async (
  isApproved: boolean,
): Promise<void> => {
  const request = useAppStore.getState().wcRequest;
  const instance = await initWalletConnect();

  if (!instance || !request?.id || !request?.topic) {
    console.error("❌ No active request to respond to");
    useAppStore.getState().setWcRequest(null);
    return;
  }

  const { topic, id, method, params, chainId } = request;

  // ── Reject path ──────────────────────────────────────────────────────────
  if (!isApproved) {
    try {
      await instance.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: "2.0",
          error: { code: 4001, message: "User rejected the request." },
        },
      });
      console.log("🚫 Request Rejected by User");
    } catch (e: any) {
      if (!isIgnorableWcError(e?.message ?? "")) {
        console.error("❌ Error sending rejection:", e);
      }
    } finally {
      useAppStore.getState().setWcRequest(null);
    }
    return;
  }

  // ── Approve path ─────────────────────────────────────────────────────────
  console.log("⏳ Processing:", method);

  let executionError: Error | null = null;

  try {
    const privateKey = useAppStore.getState().privateKey;
    if (!privateKey) throw new Error("Wallet is locked. Please unlock first.");

    const account = privateKeyToAccount(privateKey as Hex);
    const chain = getChainById(chainId ?? 1);
    const client = createWalletClient({ account, chain, transport: http() });

    let result: string = "0x";

    switch (method) {
      case "personal_sign": {
        result = await client.signMessage({
          message: { raw: params?.[0] as Hex },
        });
        console.log("✅ personal_sign complete");
        break;
      }

      case "eth_sign": {
        result = await client.signMessage({
          message: { raw: params?.[1] as Hex },
        });
        console.log("✅ eth_sign complete");
        break;
      }

      case "eth_signTypedData":
      case "eth_signTypedData_v4": {
        const rawData = params?.[1] ?? params?.[0];
        const typedData =
          typeof rawData === "string" ? JSON.parse(rawData) : rawData;

        result = await client.signTypedData({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        });
        console.log("✅ signTypedData complete");
        break;
      }

      case "eth_sendTransaction": {
        const tx = params?.[0];
        if (!tx) throw new Error("Missing transaction object");
        if (!tx.to) throw new Error('Transaction missing "to" field');

        result = await client.sendTransaction({
          chain,
          to: tx.to as Hex,
          value: tx.value ? BigInt(tx.value) : 0n,
          data: tx.data ? (tx.data as Hex) : undefined,
        });
        console.log("✅ eth_sendTransaction hash:", result);
        break;
      }

      case "eth_sendRawTransaction": {
        const rawTx = params?.[0];
        if (!rawTx) throw new Error("Missing raw transaction");

        const publicClient = createPublicClient({ chain, transport: http() });
        result = await publicClient.sendRawTransaction({
          serializedTransaction: rawTx as Hex,
        });
        console.log("✅ eth_sendRawTransaction hash:", result);
        break;
      }

      case "wallet_switchEthereumChain": {
        const requestedChainIdHex = params?.[0]?.chainId;
        const requestedChainId = parseInt(requestedChainIdHex, 16);
        if (!CHAIN_MAP[requestedChainId]) {
          throw new Error(`Chain ${requestedChainId} is not supported`);
        }
        result = "null";
        console.log("✅ wallet_switchEthereumChain to", requestedChainId);
        break;
      }

      case "wallet_addEthereumChain": {
        result = "null";
        console.log("✅ wallet_addEthereumChain acknowledged");
        break;
      }

      case "eth_accounts":
      case "eth_requestAccounts": {
        result = JSON.stringify([account.address]);
        break;
      }

      case "eth_chainId": {
        result = toHex(chain.id);
        break;
      }

      case "eth_getBalance": {
        const publicClient = createPublicClient({ chain, transport: http() });
        const balance = await publicClient.getBalance({
          address: params?.[0] ?? account.address,
        });
        result = toHex(balance);
        break;
      }

      default:
        throw new Error(`Method "${method}" is not supported by this wallet.`);
    }

    await instance.respondSessionRequest({
      topic,
      response: { id, jsonrpc: "2.0", result },
    });
    console.log("📤 Success response sent to dApp");
  } catch (error: any) {
    // Jika error dari WC sendiri (stale record dll), wrap pesan agar lebih jelas
    const msg: string = isIgnorableWcError(error?.message ?? "")
      ? "Session expired. Please reconnect from the dApp."
      : (error?.message ?? "Execution failed");

    console.error("❌ Execution Error:", msg);
    executionError = new Error(msg);

    try {
      await instance.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: "2.0",
          error: {
            code: error.code ?? 4001,
            message: msg,
          },
        },
      });
    } catch (respError: any) {
      if (!isIgnorableWcError(respError?.message ?? "")) {
        console.error("❌ Failed to send error response to dApp:", respError);
      }
    }
  } finally {
    useAppStore.getState().setWcRequest(null);
    console.log("🧹 WC Request State Cleared");
  }

  if (executionError) {
    throw executionError;
  }
};
