// app/(auth)/create.tsx
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCopy,
  Delete,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useCreateWallet } from "../../hooks/useCreateWallet";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

const { width: SCREEN_W } = Dimensions.get("window");

// ─────────────────────────────────────────────
// Step Progress Bar
// ─────────────────────────────────────────────
function StepBar({ step, theme }: { step: number; theme: any }) {
  const steps = [
    { label: "Seed Phrase", icon: ShieldCheck },
    { label: "Verifikasi", icon: CheckCircle2 },
    { label: "PIN", icon: KeyRound },
  ];

  return (
    <View style={stepStyles.row}>
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        const Icon = s.icon;
        return (
          <React.Fragment key={i}>
            <View style={stepStyles.item}>
              <View
                style={[
                  stepStyles.circle,
                  {
                    backgroundColor: done
                      ? theme.primary
                      : active
                        ? theme.primary + "18"
                        : theme.card,
                    borderColor: done || active ? theme.primary : theme.border,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
              >
                {done ? (
                  <Check size={14} color="#fff" strokeWidth={3} />
                ) : (
                  <Icon
                    size={14}
                    color={active ? theme.primary : theme.textSecondary}
                    strokeWidth={2}
                  />
                )}
              </View>
              <Text
                style={[
                  stepStyles.label,
                  {
                    color: active
                      ? theme.primary
                      : done
                        ? theme.primary
                        : theme.textSecondary,
                    fontWeight: active ? "700" : "400",
                  },
                ]}
              >
                {s.label}
              </Text>
            </View>
            {i < 2 && (
              <View
                style={[
                  stepStyles.line,
                  {
                    backgroundColor: step > idx ? theme.primary : theme.border,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  item: { alignItems: "center", gap: 6, width: 80 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 10.5, letterSpacing: 0.2 },
  line: { flex: 1, height: 1, marginBottom: 16, marginHorizontal: 4 },
});

// ─────────────────────────────────────────────
// PIN Dots
// ─────────────────────────────────────────────
function PinDots({
  length,
  total = 6,
  theme,
}: {
  length: number;
  total?: number;
  theme: any;
}) {
  return (
    <View style={pinDotStyles.row}>
      {Array(total)
        .fill(0)
        .map((_, i) => (
          <View
            key={i}
            style={[
              pinDotStyles.dot,
              {
                backgroundColor: length > i ? theme.primary : "transparent",
                borderColor: length > i ? theme.primary : theme.border,
              },
            ]}
          />
        ))}
    </View>
  );
}

const pinDotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginVertical: 28,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
});

// ─────────────────────────────────────────────
// Numpad Key
// ─────────────────────────────────────────────
function NumKey({
  label,
  onPress,
  theme,
  isDelete = false,
}: {
  label: string | number;
  onPress: () => void;
  theme: any;
  isDelete?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    Vibration.vibrate(20);
    setPressed(true);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => setPressed(false));
    onPress();
  };

  const keyW = (SCREEN_W - 40 - 24) / 3;

  if (label === "") return <View style={{ width: keyW, height: 64 }} />;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View
        style={{
          width: keyW,
          height: 64,
          borderRadius: 32,
          backgroundColor: pressed ? theme.primary + "20" : theme.card,
          borderWidth: 1,
          borderColor: pressed ? theme.primary : theme.border,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }],
        }}
      >
        {isDelete ? (
          <Delete size={20} color={theme.text} strokeWidth={1.8} />
        ) : (
          <Text
            style={{
              fontSize: 22,
              fontWeight: "600",
              color: theme.text,
            }}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function CreateWalletScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const {
    step,
    mnemonic,
    pin,
    setPin,
    isLoading,
    error,
    verifyIndices,
    selectedWords,
    generateNewWallet,
    startVerification,
    handleWordSelect,
    verifySeedPhrase,
    finalizeWallet,
  } = useCreateWallet();

  const [pinConfirm, setPinConfirm] = useState("");
  const [pinStage, setPinStage] = useState<"create" | "confirm">("create");
  const [pinError, setPinError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSeed, setShowSeed] = useState(false);

  useEffect(() => {
    if (!mnemonic) generateNewWallet();
  }, []);

  const words = mnemonic ? mnemonic.split(" ") : [];

  const handleCopy = async () => {
    await Clipboard.setStringAsync(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleBack = () => {
    if (step === 1 && mnemonic) {
      Alert.alert("Keluar?", "Seed phrase belum tersimpan. Keluar sekarang?", [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]);
    } else {
      router.back();
    }
  };

  const handlePinKey = (key: string | number) => {
    if (pinStage === "create") {
      if (pin.length < 6) setPin(pin + key);
    } else {
      if (pinConfirm.length < 6) setPinConfirm(pinConfirm + key);
    }
  };

  const handlePinDelete = () => {
    if (pinStage === "create") setPin(pin.slice(0, -1));
    else setPinConfirm(pinConfirm.slice(0, -1));
  };

  useEffect(() => {
    if (pinStage === "create" && pin.length === 6) {
      setTimeout(() => setPinStage("confirm"), 300);
    }
  }, [pin]);

  useEffect(() => {
    if (pinStage === "confirm" && pinConfirm.length === 6) {
      if (pinConfirm !== pin) {
        setPinError("PIN tidak cocok. Coba lagi.");
        Vibration.vibrate([0, 80, 60, 80]);
        setTimeout(() => {
          setPinConfirm("");
          setPin("");
          setPinStage("create");
          setPinError("");
        }, 1200);
      } else {
        setPinError("");
        finalizeWallet();
      }
    }
  }, [pinConfirm]);

  const cardBg = {
    backgroundColor: theme.card,
    borderColor: theme.border,
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={[
            styles.iconBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.text }]}>
          Buat Wallet
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Step bar ── */}
      <StepBar step={step} theme={theme} />

      {/* ── Error / PIN error banner ── */}
      {(error || pinError) && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: "#FF3B3012",
              borderColor: "#FF3B3040",
            },
          ]}
        >
          <AlertTriangle size={15} color="#FF3B30" strokeWidth={2} />
          <Text style={styles.errorText}>{error || pinError}</Text>
        </View>
      )}

      {/* ══════════════════════════
          STEP 1 — Seed Phrase
      ══════════════════════════ */}
      {step === 1 && (
        <View style={styles.section}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>
            Seed Phrase Anda
          </Text>
          <Text style={[styles.pageDesc, { color: theme.textSecondary }]}>
            Catat 12 kata ini secara berurutan di tempat yang aman. Ini
            satu-satunya cara memulihkan wallet Anda.
          </Text>

          {/* Warning */}
          <View
            style={[
              styles.alertBox,
              {
                backgroundColor: "#FF9F0A14",
                borderColor: "#FF9F0A30",
              },
            ]}
          >
            <AlertTriangle size={16} color="#FF9F0A" strokeWidth={2} />
            <Text style={[styles.alertText, { color: "#FF9F0A" }]}>
              Jangan bagikan seed phrase ke siapapun, termasuk tim LacaX.
            </Text>
          </View>

          {/* Seed grid card */}
          <View style={[styles.seedCard, cardBg]}>
            <View style={styles.seedGrid}>
              {words.map((word, index) => (
                <View
                  key={index}
                  style={[
                    styles.seedItem,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.seedNum, { color: theme.primary }]}>
                    {index + 1}
                  </Text>
                  <Text style={[styles.seedWord, { color: theme.text }]}>
                    {word}
                  </Text>
                </View>
              ))}
            </View>

            {/* Copy button */}
            <TouchableOpacity
              style={[
                styles.copyBtn,
                {
                  backgroundColor: copied
                    ? theme.primary + "18"
                    : theme.background,
                  borderColor: copied ? theme.primary : theme.border,
                },
              ]}
              onPress={handleCopy}
              activeOpacity={0.7}
            >
              {copied ? (
                <Check size={15} color={theme.primary} strokeWidth={2.5} />
              ) : (
                <ClipboardCopy
                  size={15}
                  color={theme.textSecondary}
                  strokeWidth={2}
                />
              )}
              <Text
                style={[
                  styles.copyText,
                  {
                    color: copied ? theme.primary : theme.textSecondary,
                  },
                ]}
              >
                {copied ? "Tersalin!" : "Salin Seed Phrase"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={startVerification}
            activeOpacity={0.85}
          >
            <ShieldCheck size={18} color="#fff" strokeWidth={2} />
            <Text style={styles.primaryBtnText}>
              Sudah Disimpan dengan Aman
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ══════════════════════════
          STEP 2 — Verification
      ══════════════════════════ */}
      {step === 2 && (
        <View style={styles.section}>
          {!showSeed ? (
            <>
              <Text style={[styles.pageTitle, { color: theme.text }]}>
                Verifikasi Seed
              </Text>
              <Text style={[styles.pageDesc, { color: theme.textSecondary }]}>
                Pilih kata ke-
                {verifyIndices.map((i) => i + 1).join(", ")} dari seed phrase
                Anda.
              </Text>

              {/* Peek seed button */}
              <TouchableOpacity
                style={[
                  styles.peekBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                  },
                ]}
                onPress={() => setShowSeed(true)}
                activeOpacity={0.7}
              >
                <Eye size={15} color={theme.textSecondary} strokeWidth={2} />
                <Text style={[styles.peekText, { color: theme.textSecondary }]}>
                  Lihat seed phrase lagi
                </Text>
              </TouchableOpacity>

              {/* Slots */}
              <View style={styles.slotRow}>
                {verifyIndices.map((wordIndex, slotI) => {
                  const filled = selectedWords[slotI];
                  return (
                    <View
                      key={slotI}
                      style={[
                        styles.slot,
                        {
                          backgroundColor: filled ? theme.primary : theme.card,
                          borderColor: filled ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.slotNum,
                          {
                            color: filled
                              ? "rgba(255,255,255,0.65)"
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        #{wordIndex + 1}
                      </Text>
                      <Text
                        style={[
                          styles.slotWord,
                          {
                            color: filled ? "#fff" : theme.textSecondary,
                          },
                        ]}
                      >
                        {filled ?? "···"}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Word chips */}
              <View style={styles.wordGrid}>
                {words.map((word, index) => {
                  const isSelected = selectedWords.includes(word);
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleWordSelect(word)}
                      disabled={isSelected}
                      activeOpacity={0.7}
                      style={[
                        styles.wordChip,
                        {
                          backgroundColor: isSelected
                            ? theme.border + "60"
                            : theme.card,
                          borderColor: isSelected
                            ? "transparent"
                            : theme.border,
                          opacity: isSelected ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.wordChipText,
                          {
                            color: isSelected
                              ? theme.textSecondary
                              : theme.text,
                          },
                        ]}
                      >
                        {word}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor:
                      selectedWords.length === 3 ? theme.primary : theme.border,
                  },
                ]}
                onPress={verifySeedPhrase}
                disabled={selectedWords.length !== 3}
                activeOpacity={0.85}
              >
                <CheckCircle2
                  size={18}
                  color={
                    selectedWords.length === 3 ? "#fff" : theme.textSecondary
                  }
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.primaryBtnText,
                    {
                      color:
                        selectedWords.length === 3
                          ? "#fff"
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Konfirmasi Verifikasi
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── Peek seed view ── */
            <>
              <View style={styles.peekHeader}>
                <TouchableOpacity
                  onPress={() => setShowSeed(false)}
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={18} color={theme.text} strokeWidth={2} />
                </TouchableOpacity>
                <Text style={[styles.topTitle, { color: theme.text }]}>
                  Seed Phrase
                </Text>
                <View style={{ width: 40 }} />
              </View>

              <View style={[styles.seedCard, cardBg]}>
                <View style={styles.seedGrid}>
                  {words.map((word, index) => (
                    <View
                      key={index}
                      style={[
                        styles.seedItem,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.seedNum, { color: theme.primary }]}>
                        {index + 1}
                      </Text>
                      <Text style={[styles.seedWord, { color: theme.text }]}>
                        {word}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowSeed(false)}
                activeOpacity={0.85}
              >
                <EyeOff size={18} color="#fff" strokeWidth={2} />
                <Text style={styles.primaryBtnText}>Kembali ke Verifikasi</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* ══════════════════════════
          STEP 3 — PIN
      ══════════════════════════ */}
      {step === 3 && (
        <View style={[styles.section, { alignItems: "center" }]}>
          <View
            style={[
              styles.pinIconWrap,
              { backgroundColor: theme.primary + "14" },
            ]}
          >
            <KeyRound size={28} color={theme.primary} strokeWidth={1.8} />
          </View>

          <Text
            style={[
              styles.pageTitle,
              { color: theme.text, textAlign: "center" },
            ]}
          >
            {pinStage === "create" ? "Buat PIN Keamanan" : "Konfirmasi PIN"}
          </Text>
          <Text
            style={[
              styles.pageDesc,
              { color: theme.textSecondary, textAlign: "center" },
            ]}
          >
            {pinStage === "create"
              ? "Masukkan PIN 6 digit untuk mengamankan wallet Anda."
              : "Masukkan ulang PIN yang sama untuk konfirmasi."}
          </Text>

          <PinDots
            length={pinStage === "create" ? pin.length : pinConfirm.length}
            theme={theme}
          />

          {/* Stage pills */}
          <View style={styles.pinStageRow}>
            {(["create", "confirm"] as const).map((stage) => (
              <View
                key={stage}
                style={[
                  styles.pinStagePill,
                  {
                    backgroundColor:
                      pinStage === stage ||
                      (stage === "create" && pinStage === "confirm")
                        ? theme.primary
                        : theme.border,
                    width: pinStage === stage ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {/* Numpad */}
          <View style={styles.numpad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "del"].map((key, i) => {
              if (key === "del") {
                return (
                  <NumKey
                    key={i}
                    label=""
                    onPress={handlePinDelete}
                    theme={theme}
                    isDelete
                  />
                );
              }
              return (
                <NumKey
                  key={i}
                  label={key}
                  onPress={() => key !== "" && handlePinKey(key)}
                  theme={theme}
                />
              );
            })}
          </View>

          {pinStage === "confirm" && (
            <TouchableOpacity
              onPress={() => {
                setPinStage("create");
                setPin("");
                setPinConfirm("");
              }}
              style={[styles.ghostBtn, { borderColor: theme.border }]}
              activeOpacity={0.7}
            >
              <ArrowLeft size={14} color={theme.primary} strokeWidth={2} />
              <Text style={[styles.ghostBtnText, { color: theme.primary }]}>
                Ubah PIN
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    flexGrow: 1,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // Error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    color: "#FF3B30",
    fontSize: 13,
    fontWeight: "500",
  },

  // Section wrapper
  section: { width: "100%" },

  // Headings
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  pageDesc: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },

  // Alert box
  alertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginBottom: 18,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },

  // Seed card
  seedCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    gap: 14,
  },
  seedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  seedItem: {
    width: "47.5%",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
  },
  seedNum: {
    fontSize: 11,
    fontWeight: "800",
    width: 18,
    textAlign: "right",
  },
  seedWord: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // Copy button
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 99,
    paddingVertical: 12,
  },
  copyText: {
    fontSize: 13.5,
    fontWeight: "600",
  },

  // Peek
  peekBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 20,
  },
  peekText: { fontSize: 13, fontWeight: "500" },
  peekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  // Verification slots
  slotRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  slot: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  slotNum: { fontSize: 10, fontWeight: "700" },
  slotWord: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },

  // Word chips
  wordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  wordChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
  },
  wordChipText: { fontSize: 13, fontWeight: "500" },

  // PIN icon wrap
  pinIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  // PIN stage pills
  pinStageRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 28,
    alignItems: "center",
  },
  pinStagePill: {
    height: 4,
    borderRadius: 99,
  },

  // Numpad
  numpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: "100%",
    marginBottom: 16,
  },

  // Primary button
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 99,
    paddingVertical: 16,
    marginTop: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  // Ghost button
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 8,
  },
  ghostBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
