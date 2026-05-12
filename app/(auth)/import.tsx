// app/(auth)/import.tsx
import { useRouter } from "expo-router";
import { ArrowLeft, Check, Delete } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { WalletRepository } from "../../modules/wallet/infrastructure/WalletRepository";
import { KeyDerivationService } from "../../services/crypto/KeyDerivation";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

type Step = "input-seed" | "create-pin" | "confirm-pin" | "loading" | "success";

const PIN_LENGTH = 6;
const NUMPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function ImportWalletScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // State Management
  const [step, setStep] = useState<Step>("input-seed");
  const [mnemonic, setMnemonic] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  // Refs
  const isSubmitting = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(
    Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1)),
  ).current;

  // Success/Loading Animations
  const successScale = useRef(new Animated.Value(0)).current;
  const successCheckScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Entry Animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Step Transition Animation
  useEffect(() => {
    if (["input-seed", "create-pin", "confirm-pin"].includes(step)) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [step]);

  // --- Handlers ---

  const handleNextToPin = () => {
    setError("");
    const cleanMnemonic = mnemonic.trim();

    // 1. Cek jumlah kata dasar
    const words = cleanMnemonic.split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError("Seed phrase harus terdiri dari 12 atau 24 kata.");
      return;
    }

    // 2. VALIDASI KRITOGRAFI (Cek apakah seed phrase valid)
    // Menggunakan fungsi validateMnemonic dari service Anda
    const isValid = KeyDerivationService.validateMnemonic(cleanMnemonic);

    if (!isValid) {
      setError(
        "Seed phrase tidak valid. Periksa kembali ejaan dan urutan kata.",
      );
      return;
    }

    // Jika valid, lanjut ke PIN
    setStep("create-pin");
  };

  const handleImportWallet = async (finalPin: string) => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    setStep("loading");
    startSpin();

    try {
      // Import wallet dengan seed phrase yang SUDAH tervalidasi
      await WalletRepository.importWallet(mnemonic.trim(), finalPin);

      // Success Flow
      spinAnim.stopAnimation();
      setStep("success");

      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(successCheckScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          router.replace("../(tabs)");
        }, 1500);
      });
    } catch (e) {
      console.error(e);
      setError("Gagal mengimpor wallet. Terjadi kesalahan sistem.");
      setStep("create-pin");
      setPin("");
      setConfirmPin("");
    } finally {
      isSubmitting.current = false;
    }
  };

  // --- PIN Logic Helpers ---

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateDot = (index: number) => {
    Animated.sequence([
      Animated.spring(dotScale[index], {
        toValue: 1.4,
        tension: 200,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(dotScale[index], {
        toValue: 1,
        tension: 200,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startSpin = () => {
    spinAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ).start();
  };

  const handleNumpadPress = (val: string) => {
    if (val === "") return;

    const isCreate = step === "create-pin";
    const current = isCreate ? pin : confirmPin;
    const setter = isCreate ? setPin : setConfirmPin;

    if (val === "⌫") {
      if (current.length > 0) setter(current.slice(0, -1));
      return;
    }

    if (current.length >= PIN_LENGTH) return;

    const next = current + val;
    setter(next);
    animateDot(current.length);

    if (next.length === PIN_LENGTH) {
      if (isCreate) {
        setTimeout(() => setStep("confirm-pin"), 300);
      } else {
        setTimeout(() => {
          if (next === pin) {
            handleImportWallet(next);
          } else {
            triggerShake();
            setTimeout(() => {
              setConfirmPin("");
              setError("PIN tidak cocok");
            }, 500);
          }
        }, 300);
      }
    }
  };

  // --- Render Helpers ---
  const isCreatePin = step === "create-pin";
  const isConfirmPin = step === "confirm-pin";
  const isSuccess = step === "success";
  const isLoading = step === "loading";
  const currentPin = isCreatePin ? pin : confirmPin;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { backgroundColor: theme.background },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={
          !isCreatePin && !isConfirmPin && !isSuccess && !isLoading
        }
      >
        {/* HEADER */}
        {!isSuccess && !isLoading && (
          <Animated.View
            style={[
              styles.headerWrapper,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => {
                  if (step === "create-pin" || step === "confirm-pin") {
                    setStep("input-seed");
                    setPin("");
                    setConfirmPin("");
                    setError("");
                  } else {
                    router.back();
                  }
                }}
                style={[styles.iconBtn, { borderColor: theme.border }]}
              >
                <ArrowLeft size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {isCreatePin || isConfirmPin ? "Buat PIN" : "Impor Wallet"}
              </Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Dynamic Title/Desc based on Step */}
            {step === "input-seed" && (
              <View style={styles.introContent}>
                <Text style={[styles.title, { color: theme.text }]}>
                  Pulihkan Aset
                </Text>
                <Text style={[styles.desc, { color: theme.textSecondary }]}>
                  Masukkan frasa pemulihan (seed phrase) valid untuk mengakses
                  kembali wallet Anda.
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* ─── STEP: INPUT SEED ─── */}
        {step === "input-seed" && (
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View
              style={[
                styles.inputCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Seed Phrase (12/24 Kata)
              </Text>
              <TextInput
                style={[styles.textArea, { color: theme.text }]}
                placeholder="example word another word..."
                placeholderTextColor={theme.textSecondary + "80"}
                multiline
                numberOfLines={6}
                value={mnemonic}
                onChangeText={(t) => {
                  setMnemonic(t);
                  if (error) setError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={handleNextToPin}
            >
              <Text style={styles.primaryBtnText}>Lanjut</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ─── STEP: LOADING ─── */}
        {isLoading && (
          <View style={styles.successWrapper}>
            <View
              style={[
                styles.spinnerRing,
                { borderColor: theme.primary + "30" },
              ]}
            >
              <Animated.View
                style={[
                  styles.spinnerArc,
                  {
                    borderColor: "transparent",
                    borderTopColor: theme.primary,
                    transform: [
                      {
                        rotate: spinAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0deg", "360deg"],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Mengimpor wallet...
            </Text>
          </View>
        )}

        {/* ─── STEP: SUCCESS ─── */}
        {isSuccess && (
          <View style={styles.successWrapper}>
            <Animated.View
              style={[
                styles.successCircleOuter,
                {
                  backgroundColor: theme.primary + "18",
                  transform: [{ scale: successScale }],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.successCircleInner,
                  {
                    backgroundColor: theme.primary + "30",
                    transform: [{ scale: successScale }],
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.successCircleCore,
                    {
                      backgroundColor: theme.primary,
                      transform: [{ scale: successCheckScale }],
                    },
                  ]}
                >
                  <Check size={36} color="#fff" strokeWidth={3} />
                </Animated.View>
              </Animated.View>
            </Animated.View>

            <Animated.View
              style={{ opacity: successOpacity, alignItems: "center" }}
            >
              <Text style={[styles.successTitle, { color: theme.text }]}>
                Import Berhasil!
              </Text>
              <Text
                style={[styles.successSubtitle, { color: theme.textSecondary }]}
              >
                Wallet Anda telah pulih.{"\n"}Mengalihkan...
              </Text>
            </Animated.View>
          </View>
        )}

        {/* ─── STEP: PIN CREATION / CONFIRMATION ─── */}
        {(isCreatePin || isConfirmPin) && (
          <Animated.View
            style={[
              styles.pinWrapper,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={[styles.pinTitle, { color: theme.text }]}>
              {isCreatePin ? "Buat PIN Baru" : "Konfirmasi PIN"}
            </Text>
            <Text style={[styles.pinSubtitle, { color: theme.textSecondary }]}>
              {isCreatePin
                ? "PIN akan digunakan untuk mengamankan wallet yang diimpor"
                : "Masukkan kembali PIN Anda untuk konfirmasi"}
            </Text>

            {/* Dots */}
            <Animated.View
              style={[
                styles.dotsRow,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                const filled = i < currentPin.length;
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          error && step === "confirm-pin"
                            ? "#EF4444"
                            : filled
                              ? theme.primary
                              : "transparent",
                        borderColor:
                          error && step === "confirm-pin"
                            ? "#EF4444"
                            : filled
                              ? theme.primary
                              : theme.border,
                        transform: [{ scale: dotScale[i] }],
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>

            {error && step === "confirm-pin" && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Numpad */}
            <View style={styles.numpad}>
              {NUMPAD.map((row, rIdx) => (
                <View key={rIdx} style={styles.numpadRow}>
                  {row.map((key, kIdx) => {
                    if (key === "")
                      return <View key={kIdx} style={styles.numpadEmpty} />;
                    const isDelete = key === "⌫";
                    return (
                      <TouchableOpacity
                        key={kIdx}
                        style={[
                          styles.numpadKey,
                          {
                            backgroundColor: isDelete
                              ? "transparent"
                              : theme.card,
                            borderColor: isDelete
                              ? "transparent"
                              : theme.border,
                          },
                        ]}
                        onPress={() => handleNumpadPress(key)}
                        activeOpacity={0.65}
                      >
                        {isDelete ? (
                          <Delete size={22} color={theme.textSecondary} />
                        ) : (
                          <Text
                            style={[
                              styles.numpadKeyText,
                              { color: theme.text },
                            ]}
                          >
                            {key}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Step Indicator Dots */}
            <View style={styles.stepIndicator}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isCreatePin ? theme.primary : theme.border,
                  },
                ]}
              />
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isConfirmPin
                      ? theme.primary
                      : theme.border,
                  },
                ]}
              />
            </View>
          </Animated.View>
        )}

        {/* Spacer for bottom scrolling */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerWrapper: {
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  introContent: {
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 12,
    lineHeight: 38,
  },
  desc: {
    fontSize: 15.5,
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  inputCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textArea: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  primaryBtn: {
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#EF444410",
    borderWidth: 1,
    borderColor: "#EF444430",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
  },

  // PIN Styles
  pinWrapper: {
    flex: 1,
    alignItems: "center",
    paddingTop: 16,
  },
  pinTitle: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  pinSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  numpad: {
    marginTop: 10,
    gap: 12,
    width: "100%",
    paddingHorizontal: 16,
  },
  numpadRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  numpadEmpty: {
    width: 68,
    height: 68,
  },
  numpadKey: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  numpadKeyText: {
    fontSize: 21,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  stepIndicator: {
    flexDirection: "row",
    gap: 6,
    marginTop: 32,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Loading & Success
  successWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
    gap: 36,
    minHeight: 300,
  },
  spinnerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerArc: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: "transparent",
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 20,
  },
  successCircleOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircleInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircleCore: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 10,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
});
