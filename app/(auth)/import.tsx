// app/(auth)/import.tsx
import { ethers } from "ethers"; // Untuk validasi mnemonic
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
  Check,
  ChevronLeft,
  ClipboardCopy,
  Eye,
  EyeOff,
  Lock
} from "lucide-react-native";
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
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

// Step: 'seed' | 'confirm' | 'password' | 'loading' | 'success'
type Step = "seed" | "confirm" | "password" | "loading" | "success";

// Posisi kata yang harus dikonfirmasi (sesuai gambar referensi: 2, 6, 7, 11)
const CONFIRM_POSITIONS = [2, 6, 7, 11];

export default function ImportWalletScreen() {
  const router = useRouter();
  const { isDarkMode, setWalletAddress } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // State Management
  const [step, setStep] = useState<Step>("seed");
  const [mnemonic, setMnemonic] = useState("");

  // Password State
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Confirmation State
  const [confirmationInputs, setConfirmationInputs] = useState<
    Record<number, string>
  >({});
  const [confirmationError, setConfirmationError] = useState("");

  // General Error & Loading
  const [generalError, setGeneralError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Password Strength
  const [strengthScore, setStrengthScore] = useState(0); // 0-4
  const [strengthLabel, setStrengthLabel] = useState("Weak");
  const [strengthColor, setStrengthColor] = useState("#EF4444");

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successCheckScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Entry Animation
  useEffect(() => {
    triggerFadeIn();
  }, []);

  // Step Transition Animation
  useEffect(() => {
    if (!["loading", "success"].includes(step)) {
      triggerFadeIn();
      // Reset errors on step change
      setPasswordError("");
      setConfirmationError("");
      setGeneralError("");
    }
  }, [step]);

  // Password Strength Logic
  useEffect(() => {
    if (password.length === 0) {
      setStrengthScore(0);
      setStrengthLabel("Weak");
      setStrengthColor("#EF4444");
      return;
    }
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const finalScore = Math.min(score, 4);
    setStrengthScore(finalScore);

    if (finalScore <= 1) {
      setStrengthLabel("Weak");
      setStrengthColor("#EF4444");
    } else if (finalScore <= 2) {
      setStrengthLabel("Medium");
      setStrengthColor("#F59E0B");
    } else if (finalScore <= 3) {
      setStrengthLabel("Strong");
      setStrengthColor("#10B981");
    } else {
      setStrengthLabel("Very Strong");
      setStrengthColor("#10B981");
    }
  }, [password]);

  const triggerFadeIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
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

  const words = mnemonic ? mnemonic.split(" ") : [];

  // --- Handlers ---

  const handlePasteSeed = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setMnemonic(text.trim());
    }
  };

  const handleNextToConfirm = () => {
    setGeneralError("");
    const cleanMnemonic = mnemonic.trim().toLowerCase();
    const wordList = cleanMnemonic.split(/\s+/).filter((w) => w.length > 0);

    // 1. Cek panjang
    if (wordList.length !== 12 && wordList.length !== 24) {
      setGeneralError("Seed phrase must be exactly 12 or 24 words.");
      return;
    }

    // 2. Validasi Kriptografi
    try {
      ethers.Wallet.fromMnemonic(cleanMnemonic);
      setMnemonic(cleanMnemonic); // Simpan versi bersih
      setStep("confirm");
    } catch (err) {
      console.error(err);
      setGeneralError("Invalid seed phrase. Please check spelling and order.");
    }
  };

  const handleConfirmSeed = () => {
    setConfirmationError("");
    let isValid = true;

    for (const pos of CONFIRM_POSITIONS) {
      const userInput = confirmationInputs[pos]?.trim().toLowerCase();
      const correctWord = words[pos - 1]?.toLowerCase(); // pos is 1-based, array is 0-based

      if (userInput !== correctWord) {
        isValid = false;
        break;
      }
    }

    if (isValid) {
      setStep("password");
    } else {
      setConfirmationError("Incorrect words. Please try again.");
    }
  };

  const handleImportWallet = async () => {
    setPasswordError("");

    // Validasi Password
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== repeatPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsProcessing(true);
    setStep("loading");
    startSpin();

    try {
      // 1. Derive Address
      const wallet = ethers.Wallet.fromMnemonic(mnemonic);
      const address = wallet.address;

      // 2. Simpan ke SecureStore
      await WalletRepository.createWallet(mnemonic, password);

      // 3. Update Global Store
      setWalletAddress(address);

      // 4. Success Animation
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
          router.replace("/(tabs)");
        }, 1500);
      });
    } catch (e: any) {
      console.error(e);
      spinAnim.stopAnimation();
      setGeneralError("Failed to import wallet. Please try again.");
      setStep("password"); // Kembali ke password jika gagal
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Render Helpers ---
  const isLoading = step === "loading";
  const isSuccess = step === "success";

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.background },
        ]}
      >
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
          Securing your wallet...
        </Text>
      </View>
    );
  }

  if (isSuccess) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.background },
        ]}
      >
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
            Import Successful!
          </Text>
          <Text
            style={[styles.successSubtitle, { color: theme.textSecondary }]}
          >
            Redirecting you to home...
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: theme.background },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {step === "seed"
              ? "Import Wallet"
              : step === "confirm"
                ? "Confirm Seed"
                : "Create Password"}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ─── STEP: SEED PHRASE ─── */}
        {step === "seed" && (
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Write down your 12-word seed phrase
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              Or paste your existing recovery phrase below. Keep it secret!
            </Text>

            <TouchableOpacity
              style={[
                styles.pasteBtn,
                { borderColor: theme.border, backgroundColor: theme.card },
              ]}
              onPress={handlePasteSeed}
            >
              <ClipboardCopy size={16} color={theme.primary} />
              <Text style={[styles.pasteText, { color: theme.primary }]}>
                Paste from Clipboard
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[
                styles.seedTextArea,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Enter your 12 or 24 word seed phrase..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              value={mnemonic}
              onChangeText={(t) => {
                setMnemonic(t);
                if (generalError) setGeneralError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />

            {generalError ? (
              <Text style={styles.errorText}>{generalError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: !mnemonic ? 0.5 : 1,
                },
              ]}
              onPress={handleNextToConfirm}
              disabled={!mnemonic}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ─── STEP: CONFIRM SEED ─── */}
        {step === "confirm" && (
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={[styles.title, { color: theme.text }]}>
              Confirm Seed Phrase
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              Enter the words for the highlighted numbers to prove you saved it.
            </Text>

            <View style={styles.confirmGrid}>
              {words.map((word, index) => {
                const position = index + 1;
                const isHighlighted = CONFIRM_POSITIONS.includes(position);
                const inputValue = confirmationInputs[position] || "";

                return (
                  <View
                    key={index}
                    style={[
                      styles.confirmItem,
                      {
                        backgroundColor: theme.card,
                        borderColor: isHighlighted
                          ? theme.primary
                          : "transparent",
                        borderWidth: isHighlighted ? 1.5 : 0,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.seedNum, { color: theme.textSecondary }]}
                    >
                      {position}
                    </Text>

                    {isHighlighted ? (
                      <TextInput
                        style={[styles.confirmInput, { color: theme.text }]}
                        value={inputValue}
                        onChangeText={(text) =>
                          setConfirmationInputs({
                            ...confirmationInputs,
                            [position]: text,
                          })
                        }
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder=""
                      />
                    ) : (
                      <>
                        <Text style={[styles.seedWord, { color: theme.text }]}>
                          {word}
                        </Text>
                        {/* Blur Effect for non-highlighted items */}
                        <BlurView
                          intensity={70}
                          tint={isDarkMode ? "dark" : "light"}
                          style={[
                            StyleSheet.absoluteFillObject,
                            { borderRadius: 8 },
                          ]}
                        />
                      </>
                    )}
                  </View>
                );
              })}
            </View>

            {confirmationError ? (
              <Text style={styles.errorText}>{confirmationError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={handleConfirmSeed}
            >
              <Text style={styles.primaryBtnText}>Submit</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ─── STEP: PASSWORD ─── */}
        {step === "password" && (
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.lockIconContainer}>
              <Lock size={48} color={theme.primary} />
            </View>

            <Text style={[styles.passwordTitle, { color: theme.text }]}>
              Create a Password
            </Text>
            <Text style={[styles.passwordDesc, { color: theme.textSecondary }]}>
              This password will protect your wallet and authorize transactions.
            </Text>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: theme.border, backgroundColor: theme.card },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Enter password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (passwordError) setPasswordError("");
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={theme.textSecondary} />
                  ) : (
                    <Eye size={20} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Repeat Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>
                Repeat Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: theme.border, backgroundColor: theme.card },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Repeat password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showRepeatPassword}
                  value={repeatPassword}
                  onChangeText={(t) => {
                    setRepeatPassword(t);
                    if (passwordError) setPasswordError("");
                  }}
                  autoCapitalize="none"
                  onSubmitEditing={handleImportWallet}
                />
                <TouchableOpacity
                  onPress={() => setShowRepeatPassword(!showRepeatPassword)}
                  style={styles.eyeIcon}
                >
                  {showRepeatPassword ? (
                    <EyeOff size={20} color={theme.textSecondary} />
                  ) : (
                    <Eye size={20} color={theme.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Strength Indicator */}
            <View style={styles.strengthContainer}>
              <Text
                style={[styles.strengthText, { color: theme.textSecondary }]}
              >
                Use at least 8 characters, including letters and numbers.
              </Text>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          level <= strengthScore ? strengthColor : theme.border,
                      },
                    ]}
                  />
                ))}
              </View>
              {password.length > 0 && (
                <Text
                  style={[
                    styles.strengthLabel,
                    { color: strengthColor, textAlign: "right" },
                  ]}
                >
                  {strengthLabel}
                </Text>
              )}
            </View>

            {passwordError || generalError ? (
              <Text style={styles.errorText}>
                {passwordError || generalError}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={handleImportWallet}
            >
              <Text style={styles.primaryBtnText}>
                Create Password & Import
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: "600" },

  content: { flex: 1 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12, lineHeight: 32 },
  desc: { fontSize: 15, lineHeight: 22, marginBottom: 24 },

  // Seed Step
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  pasteText: { fontSize: 14, fontWeight: "600" },
  seedTextArea: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Confirm Step
  confirmGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  confirmItem: {
    width: "31%",
    height: 50,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  confirmInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  seedNum: { fontSize: 12, fontWeight: "600", width: 16 },
  seedWord: { fontSize: 13, fontWeight: "500", flex: 1, textAlign: "center" },

  // Password Step
  lockIconContainer: { alignItems: "center", marginBottom: 20 },
  passwordTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  passwordDesc: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  input: { flex: 1, fontSize: 16, fontWeight: "500" },
  eyeIcon: { padding: 8 },

  strengthContainer: { marginTop: 10, marginBottom: 24 },
  strengthText: { fontSize: 13, marginBottom: 8 },
  strengthBars: { flexDirection: "row", gap: 6, marginBottom: 8 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: { fontSize: 13, fontWeight: "600" },

  // Common
  primaryBtn: {
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 10,
  },

  // Loading & Success
  spinnerRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  spinnerArc: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: "transparent",
  },
  loadingText: { fontSize: 16, fontWeight: "500" },

  successCircleOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successCircleInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircleCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
