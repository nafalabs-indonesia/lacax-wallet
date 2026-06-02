import { ethers } from "ethers";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Flashlight,
  FlashlightOff,
  Link,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  initWalletConnect,
  pairWithURI,
  registerEventListeners,
} from "../services/WalletConnectService";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

const { width, height } = Dimensions.get("window");
const SCAN_SIZE = width * 0.72;

const MALICIOUS_DOMAINS = [
  "wallet-connect.org",
  "walletconnect.network",
  "metamask-app.io",
  "etherscan.pro",
  "uniswap.finance",
  "pancakeswap.network",
  "opensea.io.ph",
];

const TRUSTED_DAPP_DOMAINS = [
  "uniswap.org",
  "app.uniswap.org",
  "opensea.io",
  "aave.com",
  "app.aave.com",
  "compound.finance",
  "curve.fi",
  "sushiswap.com",
  "pancakeswap.finance",
  "1inch.io",
  "app.1inch.io",
  "rarible.com",
  "blur.io",
  "looksrare.org",
  "zora.co",
  "foundation.app",
];
type ScanResultType =
  | "walletconnect"
  | "eth_address"
  | "ens_name"
  | "url"
  | "malware"
  | "unknown";

interface ScanResult {
  raw: string;
  type: ScanResultType;
  safe: boolean;
  label: string;
  description: string;
  dappDomain?: string;
  isTrustedDapp?: boolean;
  address?: string;
}

type ScreenState = "scanning" | "result" | "connecting" | "success" | "error";
function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isMalicious(data: string): boolean {
  const lower = data.toLowerCase();
  for (const d of MALICIOUS_DOMAINS) {
    if (lower.includes(d)) return true;
  }
  if (/^javascript:/i.test(data)) return true;
  if (/^data:/i.test(data)) return true;
  if (data.startsWith("wc:") && data.length > 2000) return true;
  if ((data.match(/@/g) || []).length > 1) return true;
  return false;
}

function isValidWCUri(uri: string): boolean {
  return /^wc:[a-fA-F0-9]{64}@[12]\?/.test(uri);
}

function isEnsName(data: string): boolean {
  return /^[a-zA-Z0-9-]+\.(eth|xyz|crypto|nft|wallet|blockchain)$/.test(data);
}

function analyzeQR(data: string): ScanResult {
  const trimmed = data.trim();
  if (isMalicious(trimmed)) {
    return {
      raw: trimmed,
      type: "malware",
      safe: false,
      label: "Threat Detected",
      description:
        "This QR code contains malicious content or suspicious domains. Do not proceed.",
    };
  }
  if (trimmed.startsWith("wc:")) {
    if (!isValidWCUri(trimmed)) {
      return {
        raw: trimmed,
        type: "malware",
        safe: false,
        label: "Fake WalletConnect",
        description:
          "Invalid WalletConnect URI format. Possible phishing attempt.",
      };
    }
    const domain = extractDomain(trimmed.replace("wc:", "https://")) ?? "";
    const isTrusted = TRUSTED_DAPP_DOMAINS.some(
      (d) => domain.includes(d) || d.includes(domain),
    );
    return {
      raw: trimmed,
      type: "walletconnect",
      safe: true,
      label: "WalletConnect dApp",
      description:
        "Connection request from a decentralized application (dApp).",
      dappDomain: domain || undefined,
      isTrustedDapp: isTrusted,
    };
  }
  if (ethers.isAddress(trimmed)) {
    return {
      raw: trimmed,
      type: "eth_address",
      safe: true,
      label: "Ethereum Address",
      description: `Wallet address found. You can copy this address to receive assets.`,
      address: trimmed,
    };
  }
  if (isEnsName(trimmed)) {
    return {
      raw: trimmed,
      type: "ens_name",
      safe: true,
      label: "ENS Name / Web3 Domain",
      description: `Web3 domain detected: ${trimmed}`,
    };
  }
  if (/^https?:\/\//i.test(trimmed)) {
    const domain = extractDomain(trimmed);
    const isTrusted =
      domain !== null && TRUSTED_DAPP_DOMAINS.some((d) => domain.includes(d));
    return {
      raw: trimmed,
      type: "url",
      safe: true,
      label: isTrusted ? "Trusted dApp" : "URL / Website",
      description: isTrusted
        ? `Link to trusted dApp: ${domain}`
        : `Website link found. Verify before opening: ${domain}`,
      dappDomain: domain ?? undefined,
      isTrustedDapp: isTrusted,
    };
  }
  return {
    raw: trimmed,
    type: "unknown",
    safe: false,
    label: "Unrecognized",
    description:
      "This QR code is not in a recognized format. No action can be taken.",
  };
}
function ScanLine() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_SIZE - 4],
  });
  return (
    <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
  );
}
interface ResultScreenProps {
  result: ScanResult;
  screenState: ScreenState;
  errorMsg: string;
  theme: any;
  onConnect: () => void;
  onCopyAddress: () => void;
  onRetry: () => void;
  onClose: () => void;
}

function ResultScreen({
  result,
  screenState,
  errorMsg,
  theme,
  onConnect,
  onCopyAddress,
  onRetry,
  onClose,
}: ResultScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screenState]);
  const getIconConfig = () => {
    if (screenState === "connecting")
      return { icon: null, color: "#60A5FA", bg: "#1E3A5F" };
    if (screenState === "success")
      return {
        icon: <Check size={40} color="#fff" strokeWidth={2.5} />,
        color: "#10B981",
        bg: "#064E3B",
      };
    if (screenState === "error")
      return {
        icon: <AlertCircle size={40} color="#fff" strokeWidth={2.5} />,
        color: "#EF4444",
        bg: "#450A0A",
      };
    if (result.type === "malware")
      return {
        icon: <ShieldAlert size={40} color="#fff" strokeWidth={2} />,
        color: "#EF4444",
        bg: "#450A0A",
      };
    if (result.type === "walletconnect")
      return {
        icon: <Link size={40} color="#fff" strokeWidth={2} />,
        color: "#3B82F6",
        bg: "#1E3A5F",
      };
    if (result.type === "eth_address")
      return {
        icon: <Wallet size={40} color="#fff" strokeWidth={2} />,
        color: "#8B5CF6",
        bg: "#2E1065",
      };
    if (result.type === "ens_name")
      return {
        icon: <ShieldCheck size={40} color="#fff" strokeWidth={2} />,
        color: "#10B981",
        bg: "#064E3B",
      };
    if (result.isTrustedDapp)
      return {
        icon: <ShieldCheck size={40} color="#fff" strokeWidth={2} />,
        color: "#10B981",
        bg: "#064E3B",
      };
    return {
      icon: <AlertCircle size={40} color="#fff" strokeWidth={2} />,
      color: "#F59E0B",
      bg: "#451A03",
    };
  };

  const { icon, color, bg } = getIconConfig();

  const getTitle = () => {
    if (screenState === "connecting") return "Connecting...";
    if (screenState === "success") return "Connected!";
    if (screenState === "error") return "Connection Failed";
    return result.label;
  };

  const getDesc = () => {
    if (screenState === "connecting")
      return "Establishing session with dApp, please wait.";
    if (screenState === "success")
      return "Session created successfully. You can return to the dApp now.";
    if (screenState === "error")
      return errorMsg || "An unknown error occurred.";
    return result.description;
  };
  const shortAddr =
    result.type === "eth_address" && result.address
      ? `${result.address.slice(0, 12)}...${result.address.slice(-10)}`
      : null;
  const renderActions = () => {
    if (screenState === "connecting") return null;

    if (screenState === "success") {
      return (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: color }]}
          onPress={onClose}
        >
          <Text style={styles.actionBtnText}>Done</Text>
          <ChevronRight size={20} color="#fff" />
        </TouchableOpacity>
      );
    }

    if (screenState === "error") {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: "#333" }]}
            onPress={onClose}
          >
            <Text style={[styles.actionBtnOutlineText, { color: "#aaa" }]}>
              Close
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#3B82F6", flex: 1 }]}
            onPress={onRetry}
          >
            <Text style={styles.actionBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (result.type === "malware" || result.type === "unknown") {
      return (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#374151" }]}
          onPress={onClose}
        >
          <Text style={styles.actionBtnText}>Back</Text>
        </TouchableOpacity>
      );
    }

    if (result.type === "walletconnect") {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: "#333" }]}
            onPress={onClose}
          >
            <Text style={[styles.actionBtnOutlineText, { color: "#aaa" }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: color, flex: 1 }]}
            onPress={onConnect}
          >
            <Text style={styles.actionBtnText}>Connect</Text>
            <Link size={18} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      );
    }

    if (result.type === "eth_address") {
      return (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: "#333" }]}
            onPress={onClose}
          >
            <Text style={[styles.actionBtnOutlineText, { color: "#aaa" }]}>
              Close
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: color, flex: 1 }]}
            onPress={onCopyAddress}
          >
            <Text style={styles.actionBtnText}>Copy Address</Text>
            <Copy size={18} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: "#374151" }]}
        onPress={onClose}
      >
        <Text style={styles.actionBtnText}>Back</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[
        styles.resultContainer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View
        style={[
          styles.resultIconCircle,
          { backgroundColor: bg, borderColor: color + "44" },
        ]}
      >
        {screenState === "connecting" ? (
          <ActivityIndicator size="large" color={color} />
        ) : (
          icon
        )}
      </View>

      <Text style={styles.resultTitle}>{getTitle()}</Text>

      <Text style={styles.resultDesc}>{getDesc()}</Text>

      {shortAddr && screenState === "scanning" && (
        <View style={styles.addressPill}>
          <Text style={styles.addressPillText}>{shortAddr}</Text>
        </View>
      )}

      {result.dappDomain && screenState === "scanning" && (
        <View
          style={[
            styles.domainBadge,
            { borderColor: result.isTrustedDapp ? "#10B981" : "#F59E0B" },
          ]}
        >
          {result.isTrustedDapp ? (
            <ShieldCheck size={13} color="#10B981" style={{ marginRight: 5 }} />
          ) : (
            <AlertCircle size={13} color="#F59E0B" style={{ marginRight: 5 }} />
          )}
          <Text
            style={[
              styles.domainBadgeText,
              { color: result.isTrustedDapp ? "#10B981" : "#F59E0B" },
            ]}
          >
            {result.isTrustedDapp ? "Trusted Domain" : "Verify this domain"}:{" "}
            {result.dappDomain}
          </Text>
        </View>
      )}

      {!result.safe &&
        result.type !== "malware" &&
        screenState === "scanning" && (
          <View style={styles.warningBox}>
            <AlertCircle size={15} color="#F59E0B" />
            <Text style={styles.warningBoxText}>
              Cannot verify the security of this QR code.
            </Text>
          </View>
        )}

      <View style={styles.actionsContainer}>{renderActions()}</View>
    </Animated.View>
  );
}
export default function ScanScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>("scanning");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await initWalletConnect();
        registerEventListeners();
      } catch (e) {
        console.error("Failed to init WC", e);
      }
    };
    init();
  }, []);

  const handleQRData = useCallback((data: string) => {
    const result = analyzeQR(data);
    setScanResult(result);
    setScreenState("scanning");
    setCopied(false);
  }, []);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      handleQRData(data);
    },
    [scanned, handleQRData],
  );

  const handleConnect = useCallback(async () => {
    if (!scanResult || scanResult.type !== "walletconnect") return;
    setScreenState("connecting");
    try {
      await pairWithURI(scanResult.raw);
      setScreenState("success");
    } catch (error: any) {
      setErrorMsg(
        error?.message ||
          "Connection failed. Try scanning the QR from the dApp again.",
      );
      setScreenState("error");
    }
  }, [scanResult]);

  const handleCopyAddress = useCallback(() => {
    if (!scanResult?.address) return;
    Clipboard.setString(scanResult.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [scanResult]);

  const handleRetry = useCallback(() => {
    setScanResult(null);
    setScanned(false);
    setErrorMsg("");
    setScreenState("scanning");
    setCopied(false);
  }, []);

  const handleClose = useCallback(() => {
    setScanResult(null);
    setScanned(false);
    setErrorMsg("");
    setScreenState("scanning");
    setCopied(false);
    router.back();
  }, [router]);

  const handleScanAgain = useCallback(() => {
    setScanResult(null);
    setScanned(false);
    setErrorMsg("");
    setScreenState("scanning");
    setCopied(false);
  }, []);
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.permissionSubText}>Loading...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionIconCircle}>
          <Flashlight size={36} color="#3B82F6" />
        </View>
        <Text style={styles.permissionTitle}>Camera Permission</Text>
        <Text style={styles.permissionSubText}>
          To scan QR codes, the app needs access to your camera.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.permissionBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permissionBtnOutline}
          onPress={() => router.back()}
        >
          <Text style={styles.permissionBtnOutlineText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showResult = scanned && scanResult !== null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={showResult ? undefined : handleBarcodeScanned}
      />

      {showResult && (
        <View style={[StyleSheet.absoluteFillObject, styles.resultOverlay]} />
      )}

      {!showResult && (
        <View style={styles.scanOverlay}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.back()}
            >
              <X size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Scan QR</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setTorch((t) => !t)}
            >
              {torch ? (
                <FlashlightOff size={22} color="#fff" />
              ) : (
                <Flashlight size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.frameContainer}>
            <View
              style={[
                styles.scanFrame,
                { width: SCAN_SIZE, height: SCAN_SIZE },
              ]}
            >
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <ScanLine />
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.scanHint}>Point camera at QR code</Text>
          </View>
        </View>
      )}

      {showResult && scanResult && (
        <View style={styles.resultFullScreen}>
          <TouchableOpacity
            style={styles.resultCloseBtn}
            onPress={handleScanAgain}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>

          <ResultScreen
            result={scanResult}
            screenState={screenState}
            errorMsg={errorMsg}
            theme={theme}
            onConnect={handleConnect}
            onCopyAddress={handleCopyAddress}
            onRetry={handleRetry}
            onClose={handleClose}
          />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  permissionIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#1E3A5F",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
  },
  permissionTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  permissionSubText: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  permissionBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    marginBottom: 12,
  },
  permissionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  permissionBtnOutline: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: "center",
  },
  permissionBtnOutlineText: {
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "600",
  },
  scanOverlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 44,
    paddingBottom: 12,
  },
  topBarTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  frameContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    borderRadius: 15,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#fff",
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(59,130,246,0.9)",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomSection: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === "ios" ? 48 : 36,
    alignItems: "center",
    gap: 8,
  },
  scanHint: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  scanSubHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 6,
  },
  resultOverlay: {
    backgroundColor: "rgba(0,0,0,0.88)",
  },
  resultFullScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  resultCloseBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 40,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  resultIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1.5,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  resultDesc: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  addressPill: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#1F2937",
    marginBottom: 16,
  },
  addressPillText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"],
  },
  domainBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    marginBottom: 14,
  },
  domainBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#1C1400",
    borderWidth: 1,
    borderColor: "#92400E",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 14,
  },
  warningBoxText: {
    color: "#F59E0B",
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  actionsContainer: {
    width: "100%",
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 999,
    marginBottom: 4,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  actionBtnOutline: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnOutlineText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
