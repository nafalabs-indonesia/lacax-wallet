import { ethers } from "ethers";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
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
  Platform,
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
      icon: <Layers size={size} color={primaryColor} />,
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
      icon: <Coins size={size} color={errorColor} />,
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
      label: method.replace(/_/g, " "),
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
const decodeTxData = (data: string) => {
  try {
    const iface = new ethers.Interface([
      "function transfer(address to, uint256 amount)",
      "function approve(address spender, uint256 amount)",
      "function transferFrom(address from, address to, uint256 amount)",
      "function mint(address to, uint256 amount)",
      "function burn(uint256 amount)",
      "function deposit()",
      "function withdraw(uint256 amount)",
      "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)",
      "function claim()",
    ]);

    const decoded = iface.parseTransaction({ data });
    if (decoded && decoded.fragment) {
      return {
        functionName: decoded.fragment.name,
        args: decoded.args.map((arg: any) => String(arg)),
      };
    }
  } catch (e) {}
  return null;
};

const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export const WcConfirmationModal = () => {
  const { isDarkMode, wcRequest } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [showRawData, setShowRawData] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultState, setResultState] = useState<
    "idle" | "success" | "rejected" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastAnim = useRef(new Animated.Value(-100)).current;

  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const showToast = (msg: string, type: "success" | "error") => {
    setToastMessage(msg);
    setToastType(type);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

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

  useEffect(() => {
    if (resultState === "success" || resultState === "rejected") {
      const timer = setTimeout(() => setResultState("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [resultState]);

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
  const txData =
    wcRequest.method === "eth_sendTransaction" ? wcRequest.params?.[0] : null;
  const decodedInteraction =
    txData?.data && txData.data !== "0x" ? decodeTxData(txData.data) : null;

  const interactingWith = txData?.to
    ? formatAddr(txData.to)
    : wcRequest.method === "personal_sign" && wcRequest.params?.[1]
      ? formatAddr(wcRequest.params[1])
      : undefined;

  const rawData = wcRequest.params
    ? JSON.stringify(wcRequest.params, null, 2)
    : "No payload data";

  const handleApprove = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      await respondToWcRequest(true);
      setResultState("success");
      showToast("Successfully signed!", "success");
    } catch (err: any) {
      console.error("❌ Execution Error:", err);
      const msg = err?.message ?? "An unknown error occurred.";
      setErrorMessage(msg);
      setResultState("error");
      showToast("Signing failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    await respondToWcRequest(false);
    setResultState("rejected");
    showToast("Request rejected", "success");
  };
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
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[s.fullScreen, { backgroundColor: theme.background }]}>
        {toastMessage && (
          <Animated.View
            style={[
              s.toastContainer,
              {
                transform: [{ translateY: toastAnim }],
                backgroundColor:
                  toastType === "success" ? theme.primary : theme.error,
                top: Platform.OS === "ios" ? 50 : 40,
              },
            ]}
          >
            {toastType === "success" ? (
              <CheckCircle2 size={18} color="#fff" />
            ) : (
              <AlertTriangle size={18} color="#fff" />
            )}
            <Text style={s.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}

        <Animated.View
          style={[
            s.innerContainer,
            { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
          ]}
        >
          <View style={s.topBar}>
            <TouchableOpacity
              onPress={handleReject}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.heroSection}>
              <Text style={[s.methodTitle, { color: theme.text }]}>
                {meta.label}
              </Text>
              <Text style={[s.methodDesc, { color: theme.textSecondary }]}>
                {meta.description}
              </Text>

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
            </View>

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

            <View
              style={[
                s.card,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <InfoRow
                label="Network"
                value={chainName}
                theme={theme}
                isLast={!interactingWith}
              />

              {interactingWith && (
                <InfoRow
                  label="Interacting with"
                  value={interactingWith}
                  theme={theme}
                  isLast={false}
                  isMono
                />
              )}

              {decodedInteraction && (
                <InfoRow
                  label="Function"
                  value={decodedInteraction.functionName}
                  theme={theme}
                  isLast={false}
                />
              )}

              <InfoRow
                label="Gas Limit"
                value={
                  txData?.gas ? parseInt(txData.gas, 16).toLocaleString() : "—"
                }
                theme={theme}
                isLast={true}
              />
            </View>

            {decodedInteraction && decodedInteraction.args.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>
                  Parameters
                </Text>
                <View
                  style={[
                    s.card,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  {decodedInteraction.args.map((arg, i) => (
                    <InfoRow
                      key={i}
                      label={`Arg ${i}`}
                      value={arg}
                      theme={theme}
                      isLast={i === decodedInteraction.args.length - 1}
                      isMono
                    />
                  ))}
                </View>
              </View>
            )}

            {txData && txData.value && BigInt(txData.value) > 0n && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[s.sectionLabel, { color: theme.textSecondary }]}>
                  Value Transfer
                </Text>
                <View
                  style={[
                    s.card,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <InfoRow
                    label="Amount"
                    value={`${ethers.formatEther(txData.value)} ETH`}
                    theme={theme}
                    isLast={true}
                  />
                </View>
              </View>
            )}

            {(wcRequest.method === "eth_signTypedData_v4" ||
              wcRequest.method === "eth_signTypedData") &&
              wcRequest.params?.[1] && (
                <TypedDataCard data={wcRequest.params[1]} theme={theme} />
              )}

            {wcRequest.method === "personal_sign" && wcRequest.params?.[0] && (
              <MessageCard hex={wcRequest.params[0]} theme={theme} />
            )}

            <TouchableOpacity
              style={[s.rawToggle, { borderColor: theme.border }]}
              onPress={() => setShowRawData((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={[s.rawToggleText, { color: theme.textSecondary }]}>
                Show Raw Payload
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

          <View
            style={[
              s.actionBar,
              {
                backgroundColor: theme.background,
                paddingBottom: Platform.OS === "ios" ? 64 : 50,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                s.btnReject,
                { backgroundColor: theme.card, borderRadius: 999 },
              ]}
              onPress={handleReject}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={[s.btnText, { color: theme.text }]}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.btnApprove,
                {
                  backgroundColor: theme.primary,
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
                    : "Confirm"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

type Theme = typeof Colors.dark;

const InfoRow = ({
  label,
  value,
  theme,
  isLast,
  isMono = false,
}: {
  label: string;
  value: string;
  theme: Theme;
  isLast: boolean;
  isMono?: boolean;
}) => (
  <View
    style={[
      s.infoRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
    ]}
  >
    <Text style={[s.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
    <Text
      style={[s.infoValue, { color: theme.text }, isMono && s.monoText]}
      numberOfLines={1}
      ellipsizeMode="middle"
    >
      {value}
    </Text>
  </View>
);

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

  if (rows.length === 0) return null;

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
    if (hex.startsWith("0x"))
      decoded = Buffer.from(hex.slice(2), "hex").toString("utf8");
  } catch {}
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

const s = StyleSheet.create({
  fullScreen: { flex: 1 },
  innerContainer: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 14,
  },
  scrollContent: { padding: 20, paddingTop: 10 },
  heroSection: { alignItems: "center", marginBottom: 28, marginTop: 10 },
  methodTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
  },
  riskText: { fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
  methodDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
    color: "#9CA3AF",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "500" },
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
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", maxWidth: "60%" },
  monoText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
  },
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
    marginTop: 12,
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
  },
  btnReject: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 999,
  },
  btnApprove: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 999,
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
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
