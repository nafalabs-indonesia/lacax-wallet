// app/wallet-address.tsx
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Copy,
  QrCode,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChainConfig, SUPPORTED_CHAINS } from "../config/chains";
import { WalletRepository } from "../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

// --- Types ---
interface WalletListItem {
  address: string;
  chain: ChainConfig;
}

// --- Helper: Map Chain ID to Local Image Require ---
// Karena chains.ts menggunakan string path, kita perlu mapping ke require() statis
// agar React Native bisa membundel asset tersebut.
const getChainIconSource = (chainId: number) => {
  switch (chainId) {
    case 1:
      return require("../assets/chains/eth.png");
    case 137:
      return require("../assets/chains/polygon.png");
    case 56:
      return require("../assets/chains/bnb.png");
    case 1404:
    case 1043:
      return require("../assets/chains/bdag.png");
    case 11155111:
      return require("../assets/chains/eth-sepolia.png");
    case 80002:
      return require("../assets/chains/polygon.png"); // Using same icon for amoy
    case 97:
      return require("../assets/chains/bnb.png"); // Using same icon for bnb test
    case 42161:
    case 421614:
      return require("../assets/chains/arbitrum.png");
    case 143:
    case 10143:
      return require("../assets/chains/monad.png");
    default:
      return require("../assets/chains/eth.png"); // Fallback
  }
};

// --- Custom Notification Modal ---
interface NotificationModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: "info" | "error" | "success";
  onClose: () => void;
  theme: any;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  title,
  message,
  type = "info",
  onClose,
  theme,
}) => {
  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertTriangle size={48} color="#FF453A" />;
      case "success":
        return <CheckCircle size={48} color={theme.text || "#4CAF50"} />;
      default:
        return <AlertTriangle size={48} color={theme.primary} />;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalIconContainer}>{getIcon()}</View>
          <Text style={[styles.modalTitle, { color: theme.text }]}>
            {title}
          </Text>
          <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: theme.primary }]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- QR Code Modal ---
interface QRModalProps {
  visible: boolean;
  address: string;
  chainName: string;
  onClose: () => void;
  theme: any;
}

const QRModal: React.FC<QRModalProps> = ({
  visible,
  address,
  chainName,
  onClose,
  theme,
}) => {
  const shortAddress = address
    ? `${address.slice(0, 7)}...${address.slice(-5)}`
    : "";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.qrModalOverlay}>
        <View style={[styles.qrModalContent, { backgroundColor: theme.card }]}>
          <View style={styles.qrHeader}>
            <Text style={[styles.qrTitle, { color: theme.text }]}>
              {chainName}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.text, fontWeight: "600" }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.qrFrame,
              {
                backgroundColor: "#fff",
                borderColor: theme.border || "#ddd",
              },
            ]}
          >
            {address ? (
              <QRCode
                value={address}
                size={220}
                color="#000"
                backgroundColor="#fff"
              />
            ) : (
              <ActivityIndicator size="large" color="#000" />
            )}
          </View>

          <Text style={[styles.qrAddressLabel, { color: theme.textSecondary }]}>
            {shortAddress}
          </Text>

          <TouchableOpacity
            style={[styles.qrShareButton, { backgroundColor: theme.primary }]}
            onPress={async () => {
              await Clipboard.setStringAsync(address);
              onClose();
            }}
          >
            <Copy size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.qrShareText}>Copy Address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function WalletAddressScreen() {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [walletList, setWalletList] = useState<WalletListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAddress, setCurrentAddress] = useState<string>("");

  // Modal States
  const [qrModalData, setQrModalData] = useState<{
    visible: boolean;
    address: string;
    chainName: string;
  }>({ visible: false, address: "", chainName: "" });

  const [notification, setNotification] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "error" | "success";
  }>({ visible: false, title: "", message: "" });

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      // Ambil address utama dari repository/store
      const addr = await WalletRepository.getAddress();

      if (!addr) {
        throw new Error("No wallet found");
      }

      setCurrentAddress(addr);

      // Buat list wallet berdasarkan SUPPORTED_CHAINS
      // Filter chain yang tidak disabled
      const activeChains = SUPPORTED_CHAINS.filter((chain) => !chain.disabled);

      const list: WalletListItem[] = activeChains.map((chain) => ({
        address: addr, // EVM address sama untuk semua chain
        chain: chain,
      }));

      setWalletList(list);
    } catch (error) {
      console.error("Failed to load wallets", error);
      showNotification("Error", "Failed to load wallet data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (
    title: string,
    message: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    setNotification({ visible: true, title, message, type });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  const handleCopy = async (address: string) => {
    await Clipboard.setStringAsync(address);
    showNotification("Success", "Address copied to clipboard", "success");
  };

  const openQR = (address: string, chainName: string) => {
    setQrModalData({ visible: true, address, chainName });
  };

  const closeQR = () => {
    setQrModalData((prev) => ({ ...prev, visible: false }));
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={theme.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          My Wallets
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          Select Network to Receive
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : walletList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No networks available.
            </Text>
          </View>
        ) : (
          walletList.map((item, index) => (
            <View
              key={`${item.chain.id}-${index}`}
              style={[
                styles.walletCard,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* LEFT SIDE: Icon, Network Name, Address */}
              <View style={styles.leftContent}>
                {/* Chain Icon */}
                <View style={styles.chainIconContainer}>
                  <Image
                    source={getChainIconSource(item.chain.chainId)}
                    resizeMode="contain"
                    style={styles.chainIcon}
                  />
                </View>

                <View style={styles.textContainer}>
                  <Text
                    style={[styles.networkName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.chain.name}
                  </Text>

                  <Text
                    style={[styles.addressFull, { color: theme.textSecondary }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {item.address}
                  </Text>
                </View>
              </View>

              {/* RIGHT SIDE: Actions */}
              <View style={styles.rightActions}>
                <TouchableOpacity
                  style={[styles.actionBtn]}
                  onPress={() => handleCopy(item.address)}
                >
                  <Copy size={20} color={theme.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn]}
                  onPress={() => openQR(item.address, item.chain.name)}
                >
                  <QrCode size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            Important Notice
          </Text>
          <Text style={[styles.infoDesc, { color: theme.textSecondary }]}>
            Ensure you select the correct network when receiving funds. Sending
            assets via the wrong network may result in permanent loss.
          </Text>
        </View>
      </ScrollView>

      {/* --- Modals --- */}
      <QRModal
        visible={qrModalData.visible}
        address={qrModalData.address}
        chainName={qrModalData.chainName}
        onClose={closeQR}
        theme={theme}
      />

      <NotificationModal
        visible={notification.visible}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  scrollContent: { padding: 16 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },

  // Wallet Card Item
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  chainIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(128,128,128,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  chainIcon: {
    width: 40,
    height: 40,
  },
  textContainer: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  addressFull: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  rightActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Info Box
  infoBox: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.2)",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 14,
    lineHeight: 20,
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalIconContainer: { marginBottom: 16 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    width: "100%",
    height: 48,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
  },

  // --- QR Modal Specific Styles ---
  qrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  qrModalContent: {
    width: "100%",
    maxWidth: 350,
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
  },
  qrHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  qrFrame: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  qrAddressLabel: {
    fontSize: 14,
    fontFamily: "monospace",
    marginBottom: 24,
    textAlign: "center",
  },
  qrShareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    width: "100%",
  },
  qrShareText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
