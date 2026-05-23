import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from "react-native";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function UnlockScreen() {
  const router = useRouter();
  const { unlockWallet, setWalletAddress, isDarkMode, walletAddress } =
    useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Track apakah sudah sekali tekan back
  const backPressedOnce = useRef(false);
  const backPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  // Double-back-to-exit: tekan sekali → toast, tekan lagi dalam 2 detik → keluar app
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (backPressedOnce.current) {
          // Sudah ditekan dua kali → keluar app
          if (backPressTimer.current) clearTimeout(backPressTimer.current);
          BackHandler.exitApp();
          return true;
        }

        // Pertama kali ditekan
        backPressedOnce.current = true;

        // Tampilkan pesan (ToastAndroid tidak perlu import terpisah di RN)
        const { ToastAndroid } = require("react-native");
        ToastAndroid.show("Tekan sekali lagi untuk keluar", ToastAndroid.SHORT);

        // Reset flag setelah 2 detik
        backPressTimer.current = setTimeout(() => {
          backPressedOnce.current = false;
        }, 2000);

        return true; // Tetap blok navigasi back ke halaman sebelumnya
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => {
        subscription.remove();
        if (backPressTimer.current) clearTimeout(backPressTimer.current);
        backPressedOnce.current = false;
      };
    }, []),
  );

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

  const handleUnlock = async () => {
    if (!password) return;
    setError("");
    setIsLoading(true);
    startSpin();

    try {
      const success = await unlockWallet(password);

      stopSpin();
      setIsLoading(false);

      if (success) {
        router.replace("/(tabs)");
      } else {
        setPassword("");
        setError("Incorrect password. Please try again.");
        triggerShake();
      }
    } catch (e: any) {
      console.error(e);
      stopSpin();
      setIsLoading(false);
      setPassword("");
      setError("An error occurred. Please try again.");
      triggerShake();
    }
  };

  const handleReset = async () => {
    await useAppStore.getState().resetWallet();
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
                ? require("../../assets/lacax-dark.png")
                : require("../../assets/lacax-light.png")
            }
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your password to unlock your wallet
        </Text>
      </View>

      {/* Input Section */}
      <View style={styles.middleSection}>
        <Animated.View
          style={[
            styles.inputContainer,
            {
              borderColor: error ? "#EF4444" : theme.border,
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <Lock
            size={20}
            color={theme.textSecondary}
            style={{ marginRight: 12 }}
          />

          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Enter Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError("");
            }}
            autoCapitalize="none"
            onSubmitEditing={handleUnlock}
            returnKeyType="done"
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{ padding: 8 }}
          >
            {showPassword ? (
              <EyeOff size={20} color={theme.textSecondary} />
            ) : (
              <Eye size={20} color={theme.textSecondary} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom Actions */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.unlockBtn, { backgroundColor: theme.primary }]}
          onPress={handleUnlock}
          disabled={isLoading || !password}
          activeOpacity={0.7}
        >
          <Text style={styles.unlockBtnText}>Unlock Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleReset}
          style={styles.resetBtn}
          disabled={isLoading}
        >
          <Text style={[styles.resetText, { color: theme.textSecondary }]}>
            Forgot Password? Reset Wallet
          </Text>
        </TouchableOpacity>
      </View>

      {/* Spinner overlay */}
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
            style={[styles.spinnerRing, { borderColor: theme.primary + "25" }]}
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
    width: "100%",
    marginTop: 40,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    width: "100%",
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
    textAlign: "center",
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  unlockBtn: {
    width: "100%",
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resetBtn: {
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 13.5,
    fontWeight: "500",
  },
});
