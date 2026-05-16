// app/receive.tsx
import { ChainConfig, SUPPORTED_CHAINS } from "@/config/chains";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Share2,
  X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

const { width } = Dimensions.get("window");

// Mapping Logo Chain untuk QR Code & UI
const CHAIN_LOGO_MAP: Record<string, any> = {
  "ethereum-mainnet": require("../assets/chains/eth.png"),
  "ethereum-sepolia": require("../assets/chains/eth-sepolia.png"),
  "blockdag-mainnet": require("../assets/chains/bdag.png"),
  "blockdag-testnet": require("../assets/chains/bdag.png"),
};

export default function ReceiveScreen() {
  const { walletAddress, isDarkMode, activeChainId, setActiveChainId } =
    useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // State
  const [copied, setCopied] = useState(false);
  const [showNetworkSheet, setShowNetworkSheet] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [qrHeight, setQrHeight] = useState(300); // default height

  // Animation for Scan Line
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Get Current Chain Config
  const currentChain =
    SUPPORTED_CHAINS.find((c) => c.id === activeChainId) || SUPPORTED_CHAINS[0];
  const chainLogo =
    CHAIN_LOGO_MAP[currentChain.id] || require("../assets/chains/eth.png");

  // Start Scan Line Animation - Full movement
  useEffect(() => {
    const startAnimation = () => {
      scanAnim.setValue(0);
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }).start(() => startAnimation());
    };
    startAnimation();
  }, []);

  if (!walletAddress) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary }}>
          Wallet not initialized.
        </Text>
      </View>
    );
  }

  const handleCopy = async () => {
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My ${currentChain.symbol} Address:\n${walletAddress}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleNetworkSelect = (chain: ChainConfig) => {
    setActiveChainId(chain.id);
    setShowNetworkSheet(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Receive Crypto
        </Text>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowInfoModal(true)}
        >
          <AlertCircle size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code Section */}
        <View
          style={[
            styles.qrCard,
            {
              backgroundColor: "transparent",
              borderColor: theme.border,
            },
          ]}
        >
          {/* Network Selector Button */}
          <TouchableOpacity
            style={[styles.networkBtn, { borderColor: theme.border }]}
            onPress={() => setShowNetworkSheet(true)}
          >
            <Text style={[styles.networkBtnText, { color: theme.text }]}>
              {currentChain.name}
            </Text>
            <ChevronDown size={16} color={theme.textSecondary} />
          </TouchableOpacity>

          {/* QR Code Wrapper */}
          <View
            style={styles.qrWrapper}
            onLayout={(e) => setQrHeight(e.nativeEvent.layout.height)}
          >
            <QRCode
              value={walletAddress}
              size={width - 180}
              color="#000"
              backgroundColor="#FFFFFF"
              logo={chainLogo}
              logoSize={50}
              logoBackgroundColor="#FFFFFF"
              logoBorderRadius={25}
              quietZone={10}
            />

            {/* Animated Scan Line - Full movement */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, qrHeight + 20],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>

          <Text style={[styles.qrHint, { color: theme.textSecondary }]}>
            Receive {currentChain.symbol} from anyone, just scan
          </Text>
        </View>

        {/* Wallet Address Section */}
        <View
          style={[
            styles.addressCard,
            {
              backgroundColor: "transparent",
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.addressLabel, { color: theme.textSecondary }]}>
            Your Wallet Address
          </Text>

          <Text style={[styles.addressText, { color: theme.text }]}>
            {walletAddress}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: copied
                    ? "#10B98120"
                    : "rgba(128,128,128,0.1)",
                },
              ]}
              onPress={handleCopy}
            >
              {copied ? (
                <Check size={20} color="#10B981" />
              ) : (
                <Copy size={20} color={theme.text} />
              )}
              <Text
                style={[
                  styles.actionBtnText,
                  { color: copied ? "#10B981" : theme.text },
                ]}
              >
                {copied ? "Copied" : "Copy"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: "rgba(128,128,128,0.1)" },
              ]}
              onPress={handleShare}
            >
              <Share2 size={20} color={theme.text} />
              <Text style={[styles.actionBtnText, { color: theme.text }]}>
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <AlertCircle
            size={16}
            color={theme.textSecondary}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
            Only receive assets on the{" "}
            <Text style={{ fontWeight: "bold" }}>{currentChain.name}</Text>{" "}
            network. Sending funds via other networks may result in permanent
            loss.
          </Text>
        </View>
      </ScrollView>

      {/* Network Bottom Sheet */}
      <Modal
        visible={showNetworkSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNetworkSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowNetworkSheet(false)}
          />
          <View style={[styles.sheetContent, { backgroundColor: theme.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Select Network
              </Text>
              <TouchableOpacity onPress={() => setShowNetworkSheet(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetList}>
              {SUPPORTED_CHAINS.map((chain) => {
                const isSelected = activeChainId === chain.id;
                return (
                  <TouchableOpacity
                    key={chain.id}
                    style={styles.networkItem}
                    onPress={() => handleNetworkSelect(chain)}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Image
                        source={CHAIN_LOGO_MAP[chain.id]}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          marginRight: 12,
                        }}
                      />
                      <View>
                        <Text
                          style={[
                            styles.networkItemName,
                            { color: theme.text },
                          ]}
                        >
                          {chain.name}
                        </Text>
                        <Text
                          style={[
                            styles.networkItemId,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Chain ID: {chain.chainId}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Check size={20} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowInfoModal(false)}
          />
          <View
            style={[styles.infoModalContent, { backgroundColor: theme.card }]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                Important Information
              </Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.infoText, { color: theme.text }]}>
              • Only receive assets on the{" "}
              <Text style={{ fontWeight: "bold" }}>{currentChain.name}</Text>{" "}
              network.{"\n\n"}• Recieving tokens from other networks may result
              in permanent loss of funds.{"\n\n"}• Always double-check the
              network before making a transfer.
            </Text>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.primary }]}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 5,
  },
  iconBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    padding: 20,
    alignItems: "center",
    paddingBottom: 40,
  },
  qrCard: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
  },
  networkBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    gap: 6,
  },
  networkBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  qrWrapper: {
    position: "relative",
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 10,
  },
  qrHint: {
    marginTop: 16,
    fontSize: 13,
    textAlign: "center",
  },
  addressCard: {
    width: "100%",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 10,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
    textAlign: "center",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
  },
  infoModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "65%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  sheetList: {
    maxHeight: 400,
  },
  networkItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.1)",
  },
  networkItemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  networkItemId: {
    fontSize: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 15,
    lineHeight: 24,
    marginVertical: 16,
  },
  closeBtn: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 10,
  },
});
