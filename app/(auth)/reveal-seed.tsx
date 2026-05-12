// app/(auth)/reveal-seed.tsx
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ArrowLeft, Check, ClipboardCopy, Delete } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
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

// Step: 'reveal' | 'seed' | 'create-pin' | 'confirm-pin' | 'success'
type Step =
  | "reveal"
  | "seed"
  | "create-pin"
  | "confirm-pin"
  | "loading"
  | "success";

const PIN_LENGTH = 6;

const NUMPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function RevealSeedScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const { mnemonic, generateNewWallet, startVerification, finalizeWallet } =
    useCreateWallet();

  const [step, setStep] = useState<Step>("reveal");
  const [copied, setCopied] = useState(false);

  // PIN state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotScale = useRef(
    Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1)),
  ).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successCheckScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!mnemonic) generateNewWallet();
  }, []);

  useEffect(() => {
    // Fade-in when step changes
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
  }, [step]);

  const words = mnemonic ? mnemonic.split(" ") : [];

  const handleCopy = async () => {
    if (mnemonic) {
      await Clipboard.setStringAsync(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const triggerShake = () => {
    Vibration.vibrate(300);
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
        // Move to confirm step
        setTimeout(() => setStep("confirm-pin"), 300);
      } else {
        // Verify PINs match
        setTimeout(async () => {
          if (next === pin) {
            // Show spinner while wallet is being saved
            setStep("loading");
            startSpin();

            // Await wallet save
            const ok = await finalizeWallet(next);
            if (ok) {
              // Transition to success then navigate
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
                setTimeout(() => router.replace("/(tabs)"), 800);
              });
            } else {
              // Save failed — reset back to create-pin so user can retry
              setStep("create-pin");
              setPin("");
              setConfirmPin("");
              successScale.setValue(0);
              successCheckScale.setValue(0);
              successOpacity.setValue(0);
            }
          } else {
            setPinError(true);
            triggerShake();
            setTimeout(() => {
              setConfirmPin("");
              setPinError(false);
            }, 800);
          }
        }, 300);
      }
    }
  };

  const handleGoToPin = () => {
    setPin("");
    setConfirmPin("");
    setStep("create-pin");
  };

  if (!mnemonic) return null;

  const isCreatePin = step === "create-pin";
  const isConfirmPin = step === "confirm-pin";
  const isSuccess = step === "success";
  const currentPin = isCreatePin ? pin : confirmPin;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!isCreatePin && !isConfirmPin && !isSuccess}
    >
      {/* HEADER — hidden on success */}
      {!isSuccess && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === "seed") setStep("reveal");
              else if (step === "confirm-pin") {
                setConfirmPin("");
                setStep("create-pin");
              } else if (step === "create-pin") setStep("seed");
              else router.back();
            }}
            style={[styles.iconBtn, { borderColor: theme.border }]}
          >
            <ArrowLeft size={20} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isCreatePin || isConfirmPin ? "Buat PIN" : "Cadangkan Wallet"}
          </Text>

          <View style={{ width: 44 }} />
        </View>
      )}

      {/* ─── STEP: LOADING ─── */}
      {step === "loading" && (
        <View style={styles.successWrapper}>
          <View
            style={[styles.spinnerRing, { borderColor: theme.primary + "30" }]}
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
            Menyimpan wallet...
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
              Wallet Berhasil Dibuat!
            </Text>
            <Text
              style={[styles.successSubtitle, { color: theme.textSecondary }]}
            >
              PIN Anda telah tersimpan.{"\n"}Selamat datang di wallet Anda.
            </Text>

            <View style={styles.successDotsRow}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.successDotPulse,
                    {
                      backgroundColor: theme.primary,
                      opacity: successOpacity,
                      transform: [
                        {
                          scale: successOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      )}

      {/* ─── STEP: REVEAL (landing) ─── */}
      {step === "reveal" && (
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Amankan Aset Anda
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              Ketuk{" "}
              <Text style={{ fontWeight: "700", color: theme.primary }}>
                Lihat Frasa
              </Text>{" "}
              untuk melihat 12 kata pemulihan rahasia Anda.
            </Text>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/secure-wallet.png")}
              style={styles.seedImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonOutline,
                { borderColor: theme.border },
              ]}
              onPress={handleGoToPin}
            >
              <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
                Lewati
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSolid,
                { backgroundColor: theme.primary },
              ]}
              onPress={() => setStep("seed")}
            >
              <Text style={[styles.buttonText, { color: "#fff" }]}>
                Lihat Frasa
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ─── STEP: SEED ─── */}
      {step === "seed" && (
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View>
            <Text
              style={[
                styles.desc,
                { color: theme.textSecondary, marginBottom: 20 },
              ]}
            >
              Salin atau tulis 12 kata ini. Ini adalah satu-satunya cara
              memulihkan wallet Anda.
            </Text>

            <View
              style={[
                styles.seedCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
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
              >
                {copied ? (
                  <Check size={15} color={theme.primary} />
                ) : (
                  <ClipboardCopy size={15} color={theme.textSecondary} />
                )}
                <Text
                  style={[
                    styles.copyText,
                    { color: copied ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {copied ? "Tersalin!" : "Salin Frasa"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={handleGoToPin}
          >
            <Text style={styles.primaryBtnText}>Saya Sudah Menyimpannya</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ─── STEP: CREATE PIN / CONFIRM PIN ─── */}
      {(isCreatePin || isConfirmPin) && (
        <Animated.View
          style={[
            styles.pinWrapper,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Title */}
          <Text style={[styles.pinTitle, { color: theme.text }]}>
            {isCreatePin ? "Buat PIN Baru" : "Konfirmasi PIN"}
          </Text>
          <Text style={[styles.pinSubtitle, { color: theme.textSecondary }]}>
            {isCreatePin
              ? "PIN digunakan untuk mengamankan akses ke wallet Anda"
              : "Masukkan kembali PIN Anda untuk konfirmasi"}
          </Text>

          {/* Dot indicators */}
          <Animated.View
            style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const filled = i < currentPin.length;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: pinError
                        ? "#EF4444"
                        : filled
                          ? theme.primary
                          : "transparent",
                      borderColor: pinError
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

          {/* Error hint */}
          {pinError && (
            <Text style={styles.errorText}>PIN tidak cocok, coba lagi</Text>
          )}

          {/* Numpad */}
          <View style={styles.numpad}>
            {NUMPAD.map((row, rIdx) => (
              <View key={rIdx} style={styles.numpadRow}>
                {row.map((key, kIdx) => {
                  if (key === "") {
                    return <View key={kIdx} style={styles.numpadEmpty} />;
                  }
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
                          borderColor: isDelete ? "transparent" : theme.border,
                        },
                      ]}
                      onPress={() => handleNumpadPress(key)}
                      activeOpacity={0.65}
                    >
                      {isDelete ? (
                        <Delete size={22} color={theme.textSecondary} />
                      ) : (
                        <Text
                          style={[styles.numpadKeyText, { color: theme.text }]}
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

          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View
              style={[styles.stepDot, { backgroundColor: theme.primary }]}
            />
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: isConfirmPin ? theme.primary : theme.border,
                },
              ]}
            />
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
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

  // ── SEED STEPS ──
  content: {
    flex: 1,
    justifyContent: "space-between",
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

  imageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 10,
  },

  seedImage: {
    width: "85%",
    maxWidth: 340,
    height: 340,
  },

  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    paddingBottom: 55,
  },

  button: {
    flex: 1,
    borderRadius: 9999,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonOutline: {
    borderWidth: 1.5,
  },

  buttonSolid: {},

  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },

  seedCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },

  seedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  seedItem: {
    width: "47.5%",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
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
  },

  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 13,
  },

  copyText: {
    fontSize: 13.5,
    fontWeight: "700",
  },

  primaryBtn: {
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 50,
  },

  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // ── PIN ──
  pinWrapper: {
    flex: 1,
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 20,
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
    marginBottom: 14,
  },

  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },

  errorText: {
    fontSize: 13,
    color: "#EF4444",
    marginBottom: 12,
    fontWeight: "600",
  },

  numpad: {
    marginTop: 28,
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

  // ── LOADING ──
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

  // ── SUCCESS ──
  successWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
    gap: 36,
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

  successDotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },

  successDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
