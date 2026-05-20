// services/WalletConnectService.ts
import { Core } from '@walletconnect/core';
import { IWeb3Wallet, Web3Wallet } from '@walletconnect/web3wallet';
import { createWalletClient, Hex, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc, mainnet, polygon, sepolia } from 'viem/chains';
import { useAppStore } from '../store/appStore';

const PROJECT_ID = '0e48a9edf33a440b4d2dcc976b42a4c4';

let web3Wallet: IWeb3Wallet | null = null;

const getChainById = (chainId: number) => {
  switch (chainId) {
    case 1: return mainnet;
    case 137: return polygon;
    case 56: return bsc;
    case 11155111: return sepolia;
    default: return mainnet;
  }
};

export const initWalletConnect = async () => {
  if (web3Wallet) return web3Wallet;

  try {
    const core = new Core({ projectId: PROJECT_ID });
    web3Wallet = await Web3Wallet.init({
      core: core as any, 
      metadata: {
        name: 'LacaX Wallet',
        description: 'Secure Crypto Wallet',
        url: 'https://lacaxwallet.com',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
        redirect: {
          native: 'lacaxwallet://',
          universal: 'https://lacaxwallet.com'
        }
      },
    });
    console.log('✅ WalletConnect Initialized');
  } catch (error) {
    console.error('❌ Failed to initialize WalletConnect:', error);
    throw error;
  }
  return web3Wallet;
};

export const pairWithURI = async (uri: string) => {
  if (!web3Wallet) await initWalletConnect();
  try {
    await web3Wallet?.core.pairing.pair({ uri });
    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Pairing failed');
  }
};

export const registerEventListeners = () => {
  if (!web3Wallet) return;
  
  if ((web3Wallet as any)._listenersRegistered) return;
  (web3Wallet as any)._listenersRegistered = true;

  // 1. Handle Session Proposal
  web3Wallet.on('session_proposal', async (proposal) => {
    const proposalId = (proposal as any).id || (proposal as any).proposal?.id;
    if (!proposalId) return;

    const currentAddress = useAppStore.getState().walletAddress;
    if (!currentAddress) {
      try { await web3Wallet!.rejectSession({ id: proposalId, reason: { code: 4001, message: 'No wallet' } }); } catch(e){}
      return;
    }

    try {
      await web3Wallet!.approveSession({
        id: proposalId,
        namespaces: {
          eip155: {
            accounts: [
              `eip155:1:${currentAddress}`,
              `eip155:137:${currentAddress}`,
              `eip155:56:${currentAddress}`,
              `eip155:11155111:${currentAddress}`,
            ],
            methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v4'],
            events: ['chainChanged', 'accountsChanged'],
            chains: ['eip155:1', 'eip155:137', 'eip155:56', 'eip155:11155111'],
          },
        },
      });
    } catch (error: any) {
      if (!error.message?.includes('No matching key')) {
        console.error('❌ Approval Error:', error.message);
      }
    }
  });

  // 2. Handle Session Request -> Simpan ke Store
  web3Wallet.on('session_request', async (requestEvent) => {
    const topic = (requestEvent as any).topic;
    const request = (requestEvent as any).params?.request;
    const id = (requestEvent as any).id;
    const chainIdStr = (requestEvent as any).params?.chainId || 'eip155:1';
    const chainId = parseInt(chainIdStr.replace('eip155:', ''));

    if (!topic || !request || !id) return;

    console.log('📩 Request Received:', request.method);

    useAppStore.getState().setWcRequest({
      isVisible: true,
      topic,
      id,
      method: request.method,
      params: request.params,
      chainId,
    });
  });
};

// ✅ FUNGSI APPROVE/REJECT YANG DIPERBAIKI
export const respondToWcRequest = async (isApproved: boolean) => {
  const request = useAppStore.getState().wcRequest;
  const web3WalletInstance = await initWalletConnect();
  
  if (!web3WalletInstance || !request || !request.id || !request.topic) {
    console.error('❌ No active request to respond to');
    useAppStore.getState().setWcRequest(null);
    return;
  }

  const { topic, id, method, params, chainId } = request;

  if (!isApproved) {
    // --- REJECT ---
    try {
      await web3WalletInstance.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: { code: 4001, message: 'User rejected the request' },
        },
      });
      console.log('❌ Request Rejected by User');
    } catch (e) {
      console.error('❌ Error sending rejection:', e);
    } finally {
      useAppStore.getState().setWcRequest(null);
    }
    return;
  }

  // --- APPROVE ---
  console.log('⏳ Processing Approval for:', method);
  
  try {
    const privateKey = useAppStore.getState().privateKey;
    if (!privateKey) {
      throw new Error('Wallet is locked. Please unlock first.');
    }

    const account = privateKeyToAccount(privateKey as Hex);
    const chain = getChainById(chainId || 1);
    
    const client = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    let result: string = "0x";

    // 1. Personal Sign
    if (method === 'personal_sign') {
      console.log('✍️ Signing Message...');
      // params[0] is message, params[1] is address (ignore address, use account from client)
      result = await client.signMessage({ 
        message: { raw: params?.[0] as Hex } 
      });
      console.log('✅ Signature Generated');
    } 
    
    // 2. Typed Data (Eth Sign Typed Data V4)
    else if (method === 'eth_signTypedData_v4' || method === 'eth_signTypedData') {
      console.log('✍️ Signing Typed Data...');
      // params[1] is usually the JSON string of typed data
      const data = typeof params?.[1] === 'string' ? JSON.parse(params[1]) : params?.[1];
      result = await client.signTypedData(data);
      console.log('✅ Typed Data Signed');
    }
    
    // 3. Send Transaction
    else if (method === 'eth_sendTransaction') {
      console.log('💸 Sending Transaction...');
      const tx = params?.[0];
      
      // Validasi dasar
      if (!tx.to) throw new Error('Transaction missing "to" field');

      result = await client.sendTransaction({
        to: tx.to as Hex,
        value: tx.value ? BigInt(tx.value) : undefined,
        data: tx.data as Hex | undefined,
        // gas dan nonce akan diestimasi otomatis oleh viem
      });
      console.log('✅ Transaction Sent. Hash:', result);
    } 
    else {
      throw new Error(`Method ${method} not supported yet`);
    }

    // Kirim hasil sukses ke dApp
    console.log('📤 Sending Success Response to dApp...');
    await web3WalletInstance.respondSessionRequest({
      topic,
      response: { 
        id, 
        jsonrpc: '2.0', 
        result 
      },
    });
    console.log('✅ Response Sent Successfully');

  } catch (error: any) {
    console.error('❌ Execution Error:', error.message);
    console.error('❌ Full Error:', error); // Log full error untuk debug
    
    // Kirim error ke dApp agar dApp tahu transaksi gagal
    try {
      await web3WalletInstance.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: { 
            code: 4001, 
            message: error.message || 'Execution failed' 
          },
        },
      });
    } catch (respError) {
      console.error('❌ Failed to send error response to dApp', respError);
    }
  } finally {
    // Selalu clear modal setelah proses (sukses atau gagal)
    console.log('🧹 Clearing WC Request State');
    useAppStore.getState().setWcRequest(null);
  }
};