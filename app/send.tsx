// app/send.tsx
import { SUPPORTED_CHAINS } from "@/config/chains";
import {
  BlockchainService,
  ChainId,
} from "@/services/blockchain/BlockchainService";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  QrCode,
  SendHorizonal
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

// Opsi Gas (Dummy untuk UI, karena estimasi gas real butuh logic kompleks)
const GAS_OPTIONS = [
  { label: "Lambat", time: "~2 min", gwei: "12", usd: "$0.50" },
  { label: "Standar", time: "~30 det", gwei: "18", usd: "$1.20" },
  { label: "Cepat", time: "~15 det", gwei: "25", usd: "$2.50" },
];

export default function SendScreen() {
  const router = useRouter();
  const { to, chainId } = useLocalSearchParams<{
    to?: string;
    chainId?: string;
  }>();

  const { isDarkMode, walletAddress } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Default ke Ethereum jika tidak ada chainId yang dikirim
  const activeChainId = (chainId as ChainId) || "ethereum-mainnet";
  const activeChainConfig =
    SUPPORTED_CHAINS.find((c) => c.id === activeChainId) || SUPPORTED_CHAINS[0];

  // State
  const [balance, setBalance] = useState<string>("0.0000");
  const [recipient, setRecipient] = useState(to || "");
  const [amount, setAmount] = useState("");
  const [selectedGas, setSelectedGas] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBalance, setIsFetchingBalance] = useState(true);

  // Fetch Balance Real-time saat screen dibuka
  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;
    setIsFetchingBalance(true);
    try {
      const bal = await BlockchainService.getBalance(
        activeChainId,
        walletAddress,
      );
      setBalance(bal);
    } catch (error) {
      console.error("Gagal ambil saldo di send screen:", error);
      setBalance("0.0000");
    } finally {
      setIsFetchingBalance(false);
    }
  }, [walletAddress, activeChainId]);

  useFocusEffect(
    useCallback(() => {
      fetchBalance();
    }, [fetchBalance]),
  );

  // Validasi Alamat EVM Sederhana
  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const maxAmount = parseFloat(balance);

  const handleMax = () => {
    // Kurangi sedikit untuk biaya gas (estimasi kasar)
    const maxVal = Math.max(0, maxAmount - 0.005);
    setAmount(maxVal.toFixed(6));
  };

  const handleSend = useCallback(async () => {
    if (!isValidAddress(recipient)) {
      Alert.alert("Error", "Alamat tujuan tidak valid (Format EVM 0x...)");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Jumlah harus lebih dari 0");
      return;
    }
    if (parseFloat(amount) > maxAmount) {
      Alert.alert("Error", "Saldo tidak cukup");
      return;
    }

    setIsLoading(true);

    // SIMULASI PROSES KIRIM
    // Di implementasi nyata, di sini panggil BlockchainService.sendTransaction(...)
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        "Transaksi Berhasil!",
        `Berhasil mengirim ${amount} ${activeChainConfig.symbol} ke:\n${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
        [
          {
            text: "Lihat Riwayat",
            onPress: () => router.replace("/(tabs)"), // Kembali ke home
          },
        ],
      );
    }, 2500);
  }, [recipient, amount, maxAmount, activeChainConfig, router]);

  // Hitung estimasi USD (Dummy rate untuk contoh)
  const pricePerToken = activeChainConfig.symbol === "ETH" ? 2400 : 0.05; // Harga dummy
  const usdAmount = amount
    ? `$${(parseFloat(amount) * pricePerToken).toFixed(2)}`
    : "$0.00";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Kirim</Text>
          <View style={styles.chainBadge}>
            <Text style={styles.chainBadgeText}>{activeChainConfig.name}</Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Saldo Tersedia */}
        <View style={styles.balanceContainer}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
            Saldo Tersedia
          </Text>
          <View style={styles.balanceRow}>
            {isFetchingBalance ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Text style={[styles.balanceValue, { color: theme.text }]}>
                  {balance}
                </Text>
                <Text
                  style={[styles.balanceSymbol, { color: theme.textSecondary }]}
                >
                  {activeChainConfig.symbol}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Recipient Address */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Alamat Tujuan
          </Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: theme.card,
                borderColor:
                  recipient && !isValidAddress(recipient)
                    ? "#EF4444"
                    : theme.border,
              },
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
            <Text style={styles.errorText}>Format alamat EVM tidak valid</Text>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <View style={styles.amountHeader}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Jumlah
            </Text>
            <TouchableOpacity onPress={handleMax} disabled={isFetchingBalance}>
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
              {activeChainConfig.symbol}
            </Text>
          </View>
          <Text style={[styles.usdAmount, { color: theme.textSecondary }]}>
            ≈ {usdAmount}
          </Text>
        </View>

        {/* Gas Fee Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Prioritas Gas
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

        {/* Summary Transaction */}
        <View
          style={[
            styles.summary,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Jaringan
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {activeChainConfig.name}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Pengirim
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : "-"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Estimasi Gas
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {GAS_OPTIONS[selectedGas].usd}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>
              Total Dikirim
            </Text>
            <Text style={[styles.totalValue, { color: theme.text }]}>
              {amount ? `${amount} ${activeChainConfig.symbol}` : "-"}
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
                isValidAddress(recipient) &&
                amount &&
                parseFloat(amount) > 0 &&
                !isLoading
                  ? theme.primary
                  : theme.border,
            },
          ]}
          onPress={handleSend}
          disabled={!isValidAddress(recipient) || !amount || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <SendHorizonal size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Konfirmasi Kirim</Text>
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
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  chainBadge: {
    marginTop: 4,
    backgroundColor: "rgba(128,128,128,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chainBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#888",
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  balanceContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  balanceSymbol: {
    fontSize: 16,
    fontWeight: "600",
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
