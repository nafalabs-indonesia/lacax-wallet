import { BlurView } from "expo-blur"; // Import BlurView dari expo-blur
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
  Check,
  ChevronLeft,
  ClipboardCopy,
  Eye,
  EyeOff,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useCreateWallet } from "../../hooks/useCreateWallet";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

// Step: 'seed' | 'confirm' | 'password' | 'loading'
type Step = "seed" | "confirm" | "password" | "loading";

// Posisi yang akan dikonfirmasi (bisa diubah sesuai kebutuhan)
const CONFIRM_POSITIONS = [2, 6, 7, 11];

export default function RevealSeedScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const { mnemonic, generateNewWallet, finalizeWallet } = useCreateWallet();

  const [step, setStep] = useState<Step>("seed");
  const [copied, setCopied] = useState(false);

  // Password state
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Confirmation state
  const [confirmationInputs, setConfirmationInputs] = useState<
    Record<number, string>
  >({});
  const [confirmationError, setConfirmationError] = useState("");

  // Password strength
  const [strengthScore, setStrengthScore] = useState(0); // 0-4
  const [strengthLabel, setStrengthLabel] = useState("Weak");
  const [strengthColor, setStrengthColor] = useState("#EF4444"); // Red by default

  // Animations for fade-in content
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!mnemonic) generateNewWallet();
  }, []);

  useEffect(() => {
    // Fade-in animation when step changes
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

    // Reset errors when changing steps
    setPasswordError("");
    setConfirmationError("");
  }, [step]);

  // Calculate password strength
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

    // Cap at 4 for UI purposes
    const finalScore = Math.min(score, 4);
    setStrengthScore(finalScore);

    if (finalScore <= 1) {
      setStrengthLabel("Weak");
      setStrengthColor("#EF4444"); // Red
    } else if (finalScore <= 2) {
      setStrengthLabel("Medium");
      setStrengthColor("#F59E0B"); // Orange
    } else if (finalScore <= 3) {
      setStrengthLabel("Strong");
      setStrengthColor("#10B981"); // Green
    } else {
      setStrengthLabel("Very Strong");
      setStrengthColor("#10B981"); // Green
    }
  }, [password]);

  const words = mnemonic ? mnemonic.split(" ") : [];

  const handleCopy = async () => {
    if (mnemonic) {
      await Clipboard.setStringAsync(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNextToConfirm = () => {
    setStep("confirm");
  };

  const handleConfirmSeed = () => {
    // Validate confirmation inputs
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
      setConfirmationError("Incorrect words. Please check and try again.");
    }
  };

  const handleCreatePassword = async () => {
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== repeatPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setStep("loading");

    try {
      const ok = await finalizeWallet(password);

      if (ok) {
        router.replace("/(auth)/wallet-ready");
      } else {
        setPasswordError("Failed to save wallet. Please try again.");
        setStep("password");
      }
    } catch (error) {
      console.error(error);
      setPasswordError("An error occurred. Please try again.");
      setStep("password");
    }
  };

  if (!mnemonic) return null;

  const isLoading = step === "loading";

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!isLoading}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}
      {!isLoading && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === "password") setStep("confirm");
              else if (step === "confirm") setStep("seed");
              else router.back();
            }}
            style={styles.backButton}
          >
            <ChevronLeft size={28} color={theme.text} />
          </TouchableOpacity>

          <Image
            source={
              isDarkMode
                ? require("../../assets/lacax-dark.png")
                : require("../../assets/lacax-light.png")
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}

      {/* ─── STEP: LOADING ─── */}
      {/* ─── STEP: LOADING ─── */}
      {isLoading && (
        <View style={styles.loadingWrapper}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Saving your wallet securely...
          </Text>

          {/* Indikator Loading: 4 Kotak Kecil Horizontal */}
          <View style={styles.loadingDotsContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.loadingDot,
                  {
                    // Warna berubah berdasarkan index dan waktu (simulasi geser)
                    backgroundColor:
                      (Date.now() % 1000) / 250 > index
                        ? theme.primary
                        : theme.border,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* ─── STEP: SEED PHRASE ─── */}
      {step === "seed" && (
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Write down your 12-word seed phrase in order
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              Never pass the phrase from your wallet to anyone. If lost, your
              account will not be retrievable.
            </Text>

            <View style={styles.seedGrid}>
              {words.map((word, index) => (
                <View
                  key={index}
                  style={[
                    styles.seedItem,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.seedNum, { color: theme.textSecondary }]}
                  >
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
                {copied ? "Copied!" : "Copy Phrase"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.instruction, { color: theme.textSecondary }]}>
            Write this down and click "Continue" to confirm seed phrase.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={handleNextToConfirm}
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
          <View>
            <Text style={[styles.title, { color: theme.text }]}>
              Confirm Seed Phrase
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              Enter the secret phrase for the numbers highlighted below.
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
                          : theme.border,
                        borderWidth: isHighlighted ? 1 : 0.5,
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
                      <Text style={[styles.seedWord, { color: theme.text }]}>
                        {word}
                      </Text>
                    )}

                    {/* FIX: Gunakan BlurView dari expo-blur untuk efek blur nyata */}
                    {!isHighlighted && (
                      <BlurView
                        intensity={80} // Atur intensitas blur (0-100)
                        tint={isDarkMode ? "dark" : "light"} // Sesuaikan tint dengan tema
                        style={[
                          StyleSheet.absoluteFillObject,
                          { borderRadius: 10 }, // Samakan dengan borderRadius parent
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
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
            styles.passwordContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={[styles.passwordTitle, { color: theme.text }]}>
            Create a Password
          </Text>
          <Text style={[styles.passwordDesc, { color: theme.textSecondary }]}>
            Your password helps keep your wallet secure and private.
          </Text>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>
              Password
            </Text>
            <View
              style={[styles.inputContainer, { borderColor: theme.border }]}
            >
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
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
              style={[styles.inputContainer, { borderColor: theme.border }]}
            >
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Repeat password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showRepeatPassword}
                value={repeatPassword}
                onChangeText={setRepeatPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowRepeatPassword(!showRepeatPassword)}
              >
                {showRepeatPassword ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Strength Indicator - Bars always visible, Label hidden until typing */}
          <View style={styles.strengthContainer}>
            <Text style={[styles.strengthText, { color: theme.textSecondary }]}>
              Use at least 8 characters, including letters and numbers.
            </Text>

            {/* Bars - Always Visible */}
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

            {/* Label - Only show if password is being typed */}
            {password.length > 0 && (
              <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                {strengthLabel}
              </Text>
            )}
          </View>

          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}

          {/* Button at the bottom */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              {
                backgroundColor: theme.primary,
                marginTop: 125,
                marginBottom: 0,
                opacity: isLoading ? 0.7 : 1, // Sedikit transparan saat loading
              },
            ]}
            onPress={handleCreatePassword}
            disabled={isLoading} // Nonaktifkan klik saat loading
          >
            <Text style={styles.primaryBtnText}>
              {isLoading ? "Creating your wallet..." : "Create Password"}
            </Text>
          </TouchableOpacity>
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
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  logo: {
    width: 80,
    height: 30,
  },

  // Seed & Confirm Styles
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "normal",
    marginBottom: 12,
    lineHeight: 30,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  seedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  confirmGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  seedItem: {
    width: "31%",
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
  },
  confirmItem: {
    width: "31%",
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    gap: 8,
    overflow: "hidden", // Penting agar BlurView tidak keluar dari border radius
    position: "relative", // Diperlukan untuk absolute positioning BlurView
  },
  confirmInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "left",
  },
  seedNum: {
    fontSize: 11,
    fontWeight: "500",
    width: 11,
    textAlign: "left",
  },
  seedWord: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    textAlign: "left",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    marginBottom: 20,
  },
  copyText: {
    fontSize: 13,
    fontWeight: "700",
  },
  instruction: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 30,
  },
  primaryBtn: {
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Password Styles
  passwordContent: {
    flex: 1,
    paddingBottom: 20,
  },
  passwordTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "left",
  },
  passwordDesc: {
    fontSize: 15,
    textAlign: "left",
    marginBottom: 30,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  eyeIcon: {
    padding: 8,
  },
  strengthContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  strengthText: {
    fontSize: 13,
    marginBottom: 8,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },

  // Loading
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Loading Styles Tambahan
  loadingDotsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
});
