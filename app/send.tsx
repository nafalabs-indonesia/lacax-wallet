// app/send.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowLeft,
    ChevronDown,
    QrCode,
    SendHorizonal
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

// Dummy data token
const TOKENS = [
  {
    symbol: "ETH",
    name: "Ethereum",
    balance: "2.45",
    usdValue: "$5,890.50",
    icon: "⟠",
    decimals: 18,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    balance: "1,250.00",
    usdValue: "$1,250.00",
    icon: "○",
    decimals: 6,
  },
  {
    symbol: "USDT",
    name: "Tether",
    balance: "500.00",
    usdValue: "$500.00",
    icon: "○",
    decimals: 6,
  },
];

const GAS_OPTIONS = [
  { label: "Lambat", time: "~10 menit", gwei: "12", usd: "$1.20" },
  { label: "Standar", time: "~3 menit", gwei: "18", usd: "$2.40" },
  { label: "Cepat", time: "~30 detik", gwei: "25", usd: "$4.10" },
];

export default function SendScreen() {
  const router = useRouter();
  const { to } = useLocalSearchParams<{ to?: string }>();
  const { isDarkMode, walletAddress } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [recipient, setRecipient] = useState(to || "");
  const [amount, setAmount] = useState("");
  const [selectedGas, setSelectedGas] = useState(1);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const maxAmount = parseFloat(selectedToken.balance.replace(/,/g, ""));

  const handleMax = () => {
    setAmount(selectedToken.balance.replace(/,/g, ""));
  };

  const handleSend = useCallback(async () => {
    if (!isValidAddress(recipient)) {
      Alert.alert("Error", "Alamat tidak valid");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Jumlah tidak valid");
      return;
    }
    if (parseFloat(amount) > maxAmount) {
      Alert.alert("Error", "Saldo tidak cukup");
      return;
    }

    setIsLoading(true);

    // Simulate send
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        "Berhasil!",
        `Anda mengirim ${amount} ${selectedToken.symbol} ke ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    }, 2000);
  }, [recipient, amount, selectedToken, router, maxAmount]);

  const usdPerToken =
    parseFloat(selectedToken.usdValue.replace(/[$,]/g, "")) /
    parseFloat(selectedToken.balance.replace(/,/g, ""));
  const usdAmount = amount
    ? `$${(parseFloat(amount) * usdPerToken).toFixed(2)}`
    : "$0.00";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Kirim</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Token Selector */}
        <TouchableOpacity
          style={[
            styles.tokenSelector,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => setShowTokenModal(!showTokenModal)}
        >
          <View style={styles.tokenLeft}>
            <Text style={styles.tokenIcon}>{selectedToken.icon}</Text>
            <View>
              <Text style={[styles.tokenSymbol, { color: theme.text }]}>
                {selectedToken.symbol}
              </Text>
              <Text
                style={[styles.tokenBalance, { color: theme.textSecondary }]}
              >
                {selectedToken.balance} {selectedToken.symbol}
              </Text>
            </View>
          </View>
          <ChevronDown size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Token Modal */}
        {showTokenModal && (
          <View
            style={[
              styles.tokenModal,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {TOKENS.map((token) => (
              <TouchableOpacity
                key={token.symbol}
                style={[
                  styles.tokenOption,
                  selectedToken.symbol === token.symbol && {
                    backgroundColor: theme.primary + "15",
                  },
                ]}
                onPress={() => {
                  setSelectedToken(token);
                  setShowTokenModal(false);
                }}
              >
                <Text style={styles.tokenIcon}>{token.icon}</Text>
                <View style={styles.tokenOptionInfo}>
                  <Text
                    style={[styles.tokenOptionSymbol, { color: theme.text }]}
                  >
                    {token.symbol}
                  </Text>
                  <Text
                    style={[
                      styles.tokenOptionName,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {token.name}
                  </Text>
                </View>
                <View style={styles.tokenOptionRight}>
                  <Text
                    style={[styles.tokenOptionBalance, { color: theme.text }]}
                  >
                    {token.balance}
                  </Text>
                  <Text
                    style={[
                      styles.tokenOptionUsd,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {token.usdValue}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recipient */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Kepada
          </Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="0x..."
              placeholderTextColor={theme.textSecondary}
              value={recipient}
              onChangeText={setRecipient}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => router.push("/scan")}
              style={styles.inputIcon}
            >
              <QrCode size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          {recipient && !isValidAddress(recipient) && (
            <Text style={styles.errorText}>Alamat tidak valid</Text>
          )}
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <View style={styles.amountHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Jumlah
            </Text>
            <TouchableOpacity onPress={handleMax}>
              <Text style={[styles.maxBtn, { color: theme.primary }]}>MAX</Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.amountSymbol, { color: theme.textSecondary }]}>
              {selectedToken.symbol}
            </Text>
          </View>
          <Text style={[styles.usdAmount, { color: theme.textSecondary }]}>
            {usdAmount}
          </Text>
        </View>

        {/* Gas Fee */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Biaya Gas
          </Text>
          <View style={styles.gasOptions}>
            {GAS_OPTIONS.map((gas, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.gasOption,
                  {
                    backgroundColor:
                      selectedGas === idx ? theme.primary + "15" : theme.card,
                    borderColor:
                      selectedGas === idx ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedGas(idx)}
              >
                <Text
                  style={[
                    styles.gasLabel,
                    { color: selectedGas === idx ? theme.primary : theme.text },
                  ]}
                >
                  {gas.label}
                </Text>
                <Text style={[styles.gasTime, { color: theme.textSecondary }]}>
                  {gas.time}
                </Text>
                <Text style={[styles.gasPrice, { color: theme.text }]}>
                  {gas.usd}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View
          style={[
            styles.summary,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Dari
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : "-"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Biaya Gas
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {GAS_OPTIONS[selectedGas].usd}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>
              Total
            </Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>
              {amount ? `${amount} ${selectedToken.symbol}` : "-"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Send Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                isValidAddress(recipient) && amount && parseFloat(amount) > 0
                  ? theme.primary
                  : theme.border,
            },
          ]}
          onPress={handleSend}
          disabled={!isValidAddress(recipient) || !amount || isLoading}
        >
          {isLoading ? (
            <Text style={styles.sendBtnText}>Mengirim...</Text>
          ) : (
            <>
              <SendHorizonal size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Kirim</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  tokenLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tokenIcon: {
    fontSize: 24,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "700",
  },
  tokenBalance: {
    fontSize: 13,
    marginTop: 2,
  },
  tokenModal: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: -8,
  },
  tokenOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  tokenOptionInfo: {
    flex: 1,
  },
  tokenOptionSymbol: {
    fontSize: 15,
    fontWeight: "600",
  },
  tokenOptionName: {
    fontSize: 13,
    marginTop: 1,
  },
  tokenOptionRight: {
    alignItems: "flex-end",
  },
  tokenOptionBalance: {
    fontSize: 14,
    fontWeight: "600",
  },
  tokenOptionUsd: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  inputIcon: {
    padding: 4,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  amountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  maxBtn: {
    fontSize: 13,
    fontWeight: "700",
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    height: "100%",
  },
  amountSymbol: {
    fontSize: 15,
    fontWeight: "600",
  },
  usdAmount: {
    fontSize: 14,
    marginTop: 4,
  },
  gasOptions: {
    flexDirection: "row",
    gap: 10,
  },
  gasOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  gasLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  gasTime: {
    fontSize: 11,
  },
  gasPrice: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  summary: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
