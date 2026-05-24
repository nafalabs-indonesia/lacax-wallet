import { ethers } from "ethers";
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { ChevronLeft, ClipboardCopy, Eye, EyeOff } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
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

type Step = "seed" | "confirm" | "password" | "loading";

const CONFIRM_POSITIONS = [2, 6, 7, 11];

export default function ImportWalletScreen() {
  const router = useRouter();
  const { isDarkMode, setWalletAddress } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [step, setStep] = useState<Step>("seed");
  const [mnemonic, setMnemonic] = useState("");

  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [confirmationInputs, setConfirmationInputs] = useState<
    Record<number, string>
  >({});
  const [confirmationError, setConfirmationError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const [strengthScore, setStrengthScore] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState("Weak");
  const [strengthColor, setStrengthColor] = useState("#EF4444");

  const [loadingText, setLoadingText] = useState("Importing your wallet...");

  const [isValidating, setIsValidating] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    triggerFadeIn();
  }, []);

  useEffect(() => {
    if (step !== "loading") {
      triggerFadeIn();
      setPasswordError("");
      setConfirmationError("");
      setGeneralError("");
    }
  }, [step]);

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

  const words = mnemonic ? mnemonic.split(" ") : [];

  const handlePasteSeed = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setMnemonic(text.trim());
  };

  const handleNextToConfirm = () => {
    setGeneralError("");
    const cleanMnemonic = mnemonic.trim().toLowerCase();
    const wordList = cleanMnemonic.split(/\s+/).filter((w) => w.length > 0);

    if (wordList.length !== 12 && wordList.length !== 24) {
      setGeneralError("Seed phrase must be exactly 12 or 24 words.");
      return;
    }

    setIsValidating(true);
    setTimeout(() => {
      try {
        ethers.Wallet.fromPhrase(cleanMnemonic);
        setMnemonic(cleanMnemonic);
        setIsValidating(false);
        setStep("confirm");
      } catch {
        setIsValidating(false);
        setGeneralError(
          "Invalid seed phrase. Please check spelling and order.",
        );
      }
    }, 0);
  };

  const handleConfirmSeed = () => {
    setConfirmationError("");
    let isValid = true;
    for (const pos of CONFIRM_POSITIONS) {
      const userInput = confirmationInputs[pos]?.trim().toLowerCase();
      const correctWord = words[pos - 1]?.toLowerCase();
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

  const handleImportWallet = async () => {
    setPasswordError("");
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== repeatPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setLoadingText("Importing your wallet...");
    setStep("loading");

    try {
      await new Promise((r) => setTimeout(r, 900));
      setLoadingText("Securing your seed phrase...");
      await new Promise((r) => setTimeout(r, 900));
      setLoadingText("Almost done...");

      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      const address = wallet.address;

      await WalletRepository.createWallet(mnemonic, password);
      setWalletAddress(address);

      router.replace("/(auth)/import-ready");
    } catch (e: any) {
      console.error(e);
      setGeneralError("Failed to import wallet. Please try again.");
      setStep("password");
    }
  };

  if (step === "loading") {
    return (
      <View
        style={[styles.centeredFull, { backgroundColor: theme.background }]}
      >
        <Image
          source={require("../../assets/loading.gif")}
          style={styles.loadingGif}
          resizeMode="contain"
        />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          {loadingText}
        </Text>
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
          styles.container,
          { backgroundColor: theme.background },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        {step === "seed" && (
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View>
              <Text style={[styles.title, { color: theme.text }]}>
                Enter your seed phrase
              </Text>
              <Text style={[styles.desc, { color: theme.textSecondary }]}>
                Paste or type your 12 or 24-word recovery phrase. Keep it safe
                and never share it with anyone.
              </Text>

              <TouchableOpacity
                style={[
                  styles.pasteBtn,
                  { borderColor: theme.border, backgroundColor: theme.card },
                ]}
                onPress={handlePasteSeed}
              >
                <ClipboardCopy size={15} color={theme.primary} />
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
                placeholder="word1 word2 word3 ..."
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
            </View>

            {generalError ? (
              <Text style={styles.errorText}>{generalError}</Text>
            ) : null}

            <Text style={[styles.instruction, { color: theme.textSecondary }]}>
              Make sure each word is separated by a single space.
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: !mnemonic.trim() || isValidating ? 0.65 : 1,
                },
              ]}
              onPress={handleNextToConfirm}
              disabled={!mnemonic.trim() || isValidating}
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Continue</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

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
                Enter the secret words for the numbers highlighted below.
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

                      {!isHighlighted &&
                        (Platform.OS === "ios" ? (
                          <BlurView
                            intensity={80}
                            tint={isDarkMode ? "dark" : "light"}
                            style={[
                              StyleSheet.absoluteFillObject,
                              { borderRadius: 10 },
                            ]}
                          />
                        ) : (
                          <BlurView
                            intensity={80}
                            tint={isDarkMode ? "dark" : "light"}
                            experimentalBlurMethod="dimezisBlurView"
                            style={[
                              StyleSheet.absoluteFillObject,
                              { borderRadius: 10 },
                            ]}
                          />
                        ))}
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
              This password protects your wallet and authorizes transactions.
            </Text>

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
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>
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
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.primary, marginTop: 16 },
              ]}
              onPress={handleImportWallet}
            >
              <Text style={styles.primaryBtnText}>Import Wallet</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centeredFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
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
  backButton: { padding: 8, marginLeft: -8 },
  logo: { width: 80, height: 30 },

  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  passwordContent: {
    flex: 1,
    paddingBottom: 20,
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
  instruction: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
  },

  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  pasteText: { fontSize: 13, fontWeight: "700" },
  seedTextArea: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 16,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    lineHeight: 24,
  },

  confirmGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  confirmItem: {
    width: "31%",
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    gap: 6,
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

  lockRow: { marginBottom: 14 },
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
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "500", marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: { flex: 1, fontSize: 16, fontWeight: "500" },
  eyeIcon: { padding: 8 },

  strengthContainer: { marginTop: 10, marginBottom: 20 },
  strengthText: { fontSize: 13, marginBottom: 8 },
  strengthBars: { flexDirection: "row", gap: 6, marginBottom: 8 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: { fontSize: 13, fontWeight: "600", textAlign: "right" },

  primaryBtn: {
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
    minHeight: 54,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },

  loadingGif: {
    width: 80,
    height: 80,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
