// app/(auth)/unlock.tsx
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Delete } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

import { WalletRepository } from "../../modules/wallet/infrastructure/WalletRepository";
import { KeyDerivationService } from "../../services/crypto/KeyDerivation";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

const PIN_LENGTH = 6;

const NUMPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function UnlockScreen() {
  const router = useRouter();

  const { setWalletAddress, setUnlocked, isDarkMode } = useAppStore();

  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Vibration.vibrate(300);

    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 55,
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

    Animated.timing(loadingOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const stopSpin = () => {
    spinAnim.stopAnimation();

    Animated.timing(loadingOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const handleUnlock = async (fullPin: string) => {
    setError("");
    setIsLoading(true);
    startSpin();

    try {
      const isValid = await WalletRepository.verifyPin(fullPin);

      if (!isValid) {
        stopSpin();
        setIsLoading(false);
        setPin("");
        setError("PIN salah. Coba lagi.");
        triggerShake();
        return;
      }

      const mnemonic = await WalletRepository.getMnemonic();

      if (!mnemonic) {
        await WalletRepository.wipeWallet();
        router.replace("/welcome");
        return;
      }

      const privateKey =
        KeyDerivationService.getPrivateKeyFromMnemonic(mnemonic);

      const address = KeyDerivationService.getAddressFromPrivateKey(privateKey);

      await setWalletAddress(address);

      setUnlocked(true);

      stopSpin();

      router.replace("/(tabs)");
    } catch (e: any) {
      console.error(e);

      stopSpin();
      setIsLoading(false);
      setPin("");
      setError("Terjadi kesalahan. Coba lagi.");

      triggerShake();
    }
  };

  const handleNumpadPress = (val: string) => {
    if (isLoading) return;
    if (val === "") return;

    if (val === "⌫") {
      setError("");
      setPin((p) => p.slice(0, -1));
      return;
    }

    if (pin.length >= PIN_LENGTH) return;

    const next = pin + val;

    setPin(next);

    if (next.length === PIN_LENGTH) {
      setTimeout(() => handleUnlock(next), 300);
    }
  };

  const handleReset = async () => {
    await WalletRepository.wipeWallet();

    await useAppStore.getState().setWalletAddress(null);

    router.replace("/welcome");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top section */}
      <View style={styles.topSection}>
        <View style={styles.logoBadge}>
          <Image
            source={
              isDarkMode
                ? require("../../assets/logo/lacax-dark.png")
                : require("../../assets/logo/lacax-light.png")
            }
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          Selamat Datang
        </Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Masukkan PIN untuk membuka wallet Anda
        </Text>
      </View>

      {/* Dots */}
      <View style={styles.middleSection}>
        <Animated.View
          style={[
            styles.dotsRow,
            {
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < pin.length;

            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: error
                      ? "#EF4444"
                      : filled
                        ? theme.primary
                        : "transparent",

                    borderColor: error
                      ? "#EF4444"
                      : filled
                        ? theme.primary
                        : theme.border,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

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
                      backgroundColor: isDelete ? "transparent" : theme.card,

                      borderColor: isDelete ? "transparent" : theme.border,
                    },
                  ]}
                  onPress={() => handleNumpadPress(key)}
                  activeOpacity={0.65}
                  disabled={isLoading}
                >
                  {isDelete ? (
                    <Delete size={22} color={theme.textSecondary} />
                  ) : (
                    <Text style={[styles.numpadKeyText, { color: theme.text }]}>
                      {key}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Reset */}
      <TouchableOpacity
        onPress={handleReset}
        style={styles.resetBtn}
        disabled={isLoading}
      >
        <Text style={[styles.resetText, { color: theme.textSecondary }]}>
          Lupa PIN? Reset Wallet
        </Text>
      </TouchableOpacity>

      {/* ✅ Spinner overlay — HARUS di paling bawah */}
      {isLoading && (
        <Animated.View
          style={[styles.spinnerOverlay, { opacity: loadingOpacity }]}
          pointerEvents="none"
        >
          <BlurView
            intensity={90}
            tint={isDarkMode ? "dark" : "light"}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDarkMode
                  ? "rgba(0,0,0,0.22)"
                  : "rgba(255,255,255,0.22)",
              },
            ]}
          />

          <View
            style={[
              styles.spinnerRing,
              {
                borderColor: theme.primary + "25",
              },
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
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 80,
    paddingBottom: 44,
    paddingHorizontal: 28,
  },

  spinnerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },

  spinnerRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  spinnerArc: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
  },

  topSection: {
    alignItems: "center",
    gap: 12,
  },

  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  logoImage: {
    width: 150,
    height: 150,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  middleSection: {
    alignItems: "center",
    gap: 14,
  },

  dotsRow: {
    flexDirection: "row",
    gap: 14,
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
    fontWeight: "600",
    textAlign: "center",
  },

  numpad: {
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

  resetBtn: {
    paddingVertical: 8,
  },

  resetText: {
    fontSize: 13.5,
    fontWeight: "500",
  },
});
