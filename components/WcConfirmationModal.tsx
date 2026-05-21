// components/WcConfirmationModal.tsx
import {
    AlertTriangle,
    ArrowLeftRight,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Coins,
    FileSignature,
    Layers,
    Send,
    X,
    Zap,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { respondToWcRequest } from "../services/WalletConnectService";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

// ─── Method metadata ────────────────────────────────────────────────────────

type MethodMeta = {
  label: string;
  description: string;
  icon: React.ReactNode;
  risk: "low" | "medium" | "high";
};

const getMethodMeta = (
  method: string,
  primaryColor: string,
  errorColor: string,
): MethodMeta => {
  const size = 26;
  const map: Record<string, MethodMeta> = {
    personal_sign: {
      label: "Sign Message",
      description:
        "The dApp is asking you to sign a message. This does NOT cost gas.",
      icon: <FileSignature size={size} color={primaryColor} />,
      risk: "low",
    },
    eth_sign: {
      label: "Sign Message",
      description:
        "Raw message signing. Be cautious — only approve from trusted dApps.",
      icon: <FileSignature size={size} color={errorColor} />,
      risk: "medium",
    },
    eth_signTypedData: {
      label: "Sign Typed Data",
      description: "Signing structured data (EIP-712). This does NOT cost gas.",
      icon: <FileSignature size={size} color={primaryColor} />,
      risk: "low",
    },
    eth_signTypedData_v4: {
      label: "Sign Typed Data v4",
      description:
        "Signing structured data (EIP-712 v4). This does NOT cost gas.",
      icon: <FileSignature size={size} color={primaryColor} />,
      risk: "low",
    },
    eth_sendTransaction: {
      label: "Send Transaction",
      description: "A blockchain transaction will be sent. This WILL cost gas.",
      icon: <Send size={size} color={errorColor} />,
      risk: "high",
    },
    eth_sendRawTransaction: {
      label: "Send Raw Transaction",
      description:
        "A pre-signed raw transaction will be broadcast. This WILL cost gas.",
      icon: <Send size={size} color={errorColor} />,
      risk: "high",
    },
    wallet_switchEthereumChain: {
      label: "Switch Network",
      description: "The dApp wants to switch your active network.",
      icon: <ArrowLeftRight size={size} color={primaryColor} />,
      risk: "low",
    },
    wallet_addEthereumChain: {
      label: "Add Network",
      description: "The dApp wants to add a new network to your wallet.",
      icon: <Layers size={size} color={primaryColor} />,
      risk: "low",
    },
    swap: {
      label: "Token Swap",
      description: "You are about to swap tokens. This WILL cost gas.",
      icon: <ArrowLeftRight size={size} color={errorColor} />,
      risk: "high",
    },
    stake: {
      label: "Stake Tokens",
      description: "You are about to stake tokens. This WILL cost gas.",
      icon: <Coins size={size} color={errorColor} />,
      risk: "high",
    },
  };

  return (
    map[method] ?? {
      label: method,
      description:
        "An unknown request was received. Only approve if you trust the dApp.",
      icon: <Zap size={size} color={errorColor} />,
      risk: "medium",
    }
  );
};

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  137: "Polygon",
  56: "BNB Smart Chain",
  11155111: "Sepolia Testnet",
  42161: "Arbitrum One",
  10: "Optimism",
  8453: "Base",
};

const getRiskConfig = (
  risk: "low" | "medium" | "high",
  primaryColor: string,
  errorColor: string,
) => {
  return {
    low: { label: "Low Risk", color: primaryColor },
    medium: { label: "Medium Risk", color: errorColor + "cc" },
    high: { label: "High Risk", color: errorColor },
  }[risk];
};

// ─── Component ───────────────────────────────────────────────────────────────

export const WcConfirmationModal = () => {
  const { isDarkMode, wcRequest } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [showRawData, setShowRawData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // "idle" | "success" | "rejected" | "error"
  const [resultState, setResultState] = useState<
    "idle" | "success" | "rejected" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Reset & animate in ketika request baru muncul ──────────────────────
  useEffect(() => {
    if (wcRequest?.isVisible) {
      setResultState("idle");
      setIsLoading(false);
      setShowRawData(false);
      setErrorMessage("");
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [wcRequest?.isVisible]);

  // ── Auto-dismiss overlay success / rejected setelah 2 detik ───────────
  useEffect(() => {
    if (resultState === "success" || resultState === "rejected") {
      const timer = setTimeout(() => {
        setResultState("idle");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [resultState]);

  // ── Pulse animasi untuk risk badge ────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  if (!wcRequest || !wcRequest.isVisible) return null;

  const meta = getMethodMeta(
    wcRequest.method ?? "",
    theme.primary,
    theme.error,
  );
  const risk = getRiskConfig(meta.risk, theme.primary, theme.error);
  const chainName =
    CHAIN_NAMES[wcRequest.chainId ?? 1] ?? `Chain ${wcRequest.chainId}`;
  const rawData = wcRequest.params
    ? JSON.stringify(wcRequest.params, null, 2)
    : "No payload data";

  // ── Handler Approve ────────────────────────────────────────────────────
  // respondToWcRequest(true) sekarang benar-benar mengeksekusi signing /
  // transaksi dan MELEMPAR error jika gagal, sehingga kita bisa membedakan
  // antara "benar-benar berhasil" dan "gagal eksekusi".
  const handleApprove = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      await respondToWcRequest(true);
      // Hanya sampai sini jika eksekusi BENAR-BENAR berhasil
      setResultState("success");
    } catch (err: any) {
      // Eksekusi gagal (wallet locked, RPC error, method tidak support, dll.)
      const msg: string =
        err?.message ?? "An unknown error occurred. Please try again.";
      setErrorMessage(msg);
      setResultState("error");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handler Reject ─────────────────────────────────────────────────────
  const handleReject = async () => {
    await respondToWcRequest(false);
    setResultState("rejected");
  };

  // ── Result overlays ────────────────────────────────────────────────────

  if (resultState === "success") {
    return (
      <Modal visible transparent animationType="fade">
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={[s.fullScreen, { backgroundColor: theme.background }]}>
          <View style={s.resultContainer}>
            <CheckCircle2 size={72} color={theme.primary} strokeWidth={1.5} />
            <Text style={[s.resultTitle, { color: theme.text }]}>
              Approved!
            </Text>
            <Text style={[s.resultSub, { color: theme.textSecondary }]}>
              Your request has been sent to the dApp.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (resultState === "rejected") {
    return (
      <Modal visible transparent animationType="fade">
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={[s.fullScreen, { backgroundColor: theme.background }]}>
          <View style={s.resultContainer}>
            <X size={72} color={theme.error} strokeWidth={1.5} />
            <Text style={[s.resultTitle, { color: theme.text }]}>Rejected</Text>
            <Text style={[s.resultSub, { color: theme.textSecondary }]}>
              The request has been cancelled.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Main modal ──────────────────────────────────────────────────────────
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[s.fullScreen, { backgroundColor: theme.background }]}>
        <Animated.View
          style={[
            s.innerContainer,
            { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
          ]}
        >
          {/* ── Top bar ── */}
          <View style={[s.topBar, { borderBottomColor: theme.border }]}>
            <Text style={[s.topBarText, { color: theme.textSecondary }]}>
              WalletConnect Request
            </Text>
            <TouchableOpacity
              onPress={handleReject}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Icon + Title ── */}
            <View style={s.heroSection}>
              <View
                style={[
                  s.iconRing,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                {meta.icon}
              </View>
              <Text style={[s.methodTitle, { color: theme.text }]}>
                {meta.label}
              </Text>

              {/* Risk badge */}
              <Animated.View
                style={[
                  s.riskBadge,
                  {
                    backgroundColor: risk.color + "1a",
                    borderColor: risk.color + "40",
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <AlertTriangle size={12} color={risk.color} />
                <Text style={[s.riskText, { color: risk.color }]}>
                  {risk.label}
                </Text>
              </Animated.View>

              <Text style={[s.methodDesc, { color: theme.textSecondary }]}>
                {meta.description}
              </Text>
            </View>

            {/* ── Error banner (tampil jika eksekusi gagal) ── */}
            {resultState === "error" && errorMessage.length > 0 && (
              <View
                style={[
                  s.errorBanner,
                  {
                    backgroundColor: theme.error + "18",
                    borderColor: theme.error + "50",
                  },
                ]}
              >
                <AlertTriangle size={16} color={theme.error} />
                <Text style={[s.errorBannerText, { color: theme.error }]}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* ── Info card ── */}
            <View
              style={[
                s.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <InfoRow
                label="Method"
                value={wcRequest.method ?? "—"}
                theme={theme}
                isLast={false}
              />
              <InfoRow
                label="Network"
                value={chainName}
                theme={theme}
                isLast={true}
              />
            </View>

            {/* ── Transaction details ── */}
            {wcRequest.method === "eth_sendTransaction" &&
              wcRequest.params?.[0] && (
                <TxCard tx={wcRequest.params[0]} theme={theme} />
              )}

            {/* ── Typed data preview ── */}
            {(wcRequest.method === "eth_signTypedData_v4" ||
              wcRequest.method === "eth_signTypedData") &&
              wcRequest.params?.[1] && (
                <TypedDataCard data={wcRequest.params[1]} theme={theme} />
              )}

            {/* ── Personal sign message ── */}
            {wcRequest.method === "personal_sign" && wcRequest.params?.[0] && (
              <MessageCard hex={wcRequest.params[0]} theme={theme} />
            )}

            {/* ── Raw payload (collapsible) ── */}
            <TouchableOpacity
              style={[s.rawToggle, { borderColor: theme.border }]}
              onPress={() => setShowRawData((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={[s.rawToggleText, { color: theme.textSecondary }]}>
                Raw Payload
              </Text>
              {showRawData ? (
                <ChevronUp size={16} color={theme.textSecondary} />
              ) : (
                <ChevronDown size={16} color={theme.textSecondary} />
              )}
            </TouchableOpacity>

            {showRawData && (
              <View
                style={[
                  s.rawBox,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={[s.rawText, { color: theme.textSecondary }]}>
                    {rawData}
                  </Text>
                </ScrollView>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* ── Action buttons ── */}
          <View
            style={[
              s.actionBar,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                s.btnReject,
                {
                  borderColor: theme.error + "40",
                  backgroundColor: theme.error + "12",
                  borderRadius: 999,
                },
              ]}
              onPress={handleReject}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={[s.btnText, { color: theme.error }]}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.btnApprove,
                {
                  backgroundColor: theme.primary,
                  // Sedikit redup saat loading atau setelah error (bisa coba lagi)
                  opacity: isLoading ? 0.6 : 1,
                  borderRadius: 999,
                },
              ]}
              onPress={handleApprove}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={[s.btnText, { color: "#fff" }]}>
                {isLoading
                  ? "Processing…"
                  : resultState === "error"
                    ? "Try Again"
                    : "Approve"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

type Theme = typeof Colors.dark;

const InfoRow = ({
  label,
  value,
  theme,
  isLast,
}: {
  label: string;
  value: string;
  theme: Theme;
  isLast: boolean;
}) => (
  <View
    style={[
      s.infoRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
    ]}
  >
    <Text style={[s.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
    <Text
      style={[s.infoValue, { color: theme.text }]}
      numberOfLines={1}
      ellipsizeMode="middle"
    >
      {value}
    </Text>
  </View>
);

const TxCard = ({ tx, theme }: { tx: any; theme: Theme }) => {
  const rows: { label: string; value: string }[] = [];
  if (tx.to) rows.push({ label: "To", value: tx.to });
  if (tx.value)
    rows.push({ label: "Value", value: `${BigInt(tx.value).toString()} wei` });
  if (tx.gas)
    rows.push({ label: "Gas Limit", value: parseInt(tx.gas, 16).toString() });
  if (tx.data && tx.data !== "0x")
    rows.push({ label: "Has Data", value: "Yes (contract interaction)" });

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>
        Transaction Details
      </Text>
      <View
        style={[
          s.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {rows.map((r, i) => (
          <InfoRow
            key={r.label}
            label={r.label}
            value={r.value}
            theme={theme}
            isLast={i === rows.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

const TypedDataCard = ({ data, theme }: { data: any; theme: Theme }) => {
  let parsed: any = null;
  try {
    parsed = typeof data === "string" ? JSON.parse(data) : data;
  } catch {
    return null;
  }

  const domain = parsed?.domain;
  const rows: { label: string; value: string }[] = [];
  if (domain?.name) rows.push({ label: "App Name", value: domain.name });
  if (domain?.version) rows.push({ label: "Version", value: domain.version });
  if (domain?.chainId)
    rows.push({ label: "Chain", value: String(domain.chainId) });
  if (domain?.verifyingContract)
    rows.push({ label: "Contract", value: domain.verifyingContract });
  if (parsed?.primaryType)
    rows.push({ label: "Type", value: parsed.primaryType });

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>
        Typed Data (EIP-712)
      </Text>
      <View
        style={[
          s.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {rows.map((r, i) => (
          <InfoRow
            key={r.label}
            label={r.label}
            value={r.value}
            theme={theme}
            isLast={i === rows.length - 1}
          />
        ))}
      </View>
    </View>
  );
};

const MessageCard = ({ hex, theme }: { hex: string; theme: Theme }) => {
  let decoded = hex;
  try {
    if (hex.startsWith("0x")) {
      decoded = Buffer.from(hex.slice(2), "hex").toString("utf8");
    }
  } catch {
    /* keep raw */
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>
        Message to Sign
      </Text>
      <View
        style={[
          s.messageBox,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[s.messageText, { color: theme.text }]}>{decoded}</Text>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  fullScreen: { flex: 1 },
  innerContainer: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topBarDot: { width: 8, height: 8, borderRadius: 4 },
  topBarText: { fontSize: 13, fontWeight: "500", letterSpacing: 0.3 },
  scrollContent: { padding: 20, paddingTop: 24 },
  heroSection: { alignItems: "center", marginBottom: 28 },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  methodTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  riskText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  methodDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  // ── Error banner ──────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  // ─────────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoLabel: { fontSize: 14, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", maxWidth: "60%" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  messageBox: { borderRadius: 16, borderWidth: 1, padding: 16 },
  messageText: { fontSize: 14, lineHeight: 22, fontFamily: "monospace" },
  rawToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    marginTop: 4,
  },
  rawToggleText: { fontSize: 13, fontWeight: "500" },
  rawBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    maxHeight: 200,
    marginTop: 4,
  },
  rawText: { fontSize: 11, fontFamily: "monospace", lineHeight: 18 },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  btnReject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  btnApprove: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  resultTitle: { fontSize: 26, fontWeight: "700" },
  resultSub: { fontSize: 15, textAlign: "center", maxWidth: 260 },
});
