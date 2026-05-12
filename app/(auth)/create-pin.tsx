// app/(auth)/create-pin.tsx
import { useRouter } from "expo-router";
import { Delete, KeyRound } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
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

export default function CreatePinScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const { finalizeWallet, isLoading, error, setError } = useCreateWallet();

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"create" | "confirm">("create"); // create -> confirm
  const [localError, setLocalError] = useState("");

  // Animasi getar saat error
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Vibration.vibrate([0, 50, 50, 50]);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNumberPress = (num: number) => {
    if (localError) setLocalError("");

    if (step === "create") {
      if (pin.length < 6) setPin(pin + num);
    } else {
      if (confirmPin.length < 6) setConfirmPin(confirmPin + num);
    }
  };

  const handleDelete = () => {
    if (localError) setLocalError("");

    if (step === "create") {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  // Efek saat PIN 6 digit terisi
  useEffect(() => {
    if (step === "create" && pin.length === 6) {
      setTimeout(() => setStep("confirm"), 300);
    }
  }, [pin]);

  useEffect(() => {
    if (step === "confirm" && confirmPin.length === 6) {
      if (pin !== confirmPin) {
        setLocalError("PIN tidak cocok. Silakan coba lagi.");
        triggerShake();
        setTimeout(() => {
          setPin("");
          setConfirmPin("");
          setStep("create");
          setLocalError("");
        }, 1500);
      } else {
        // PIN Cocok! Simpan Wallet
        saveWallet();
      }
    }
  }, [confirmPin]);

  const saveWallet = async () => {
    const success = await finalizeWallet(pin);
    if (success) {
      router.replace("/(tabs)"); // Redirect ke dashboard utama
    } else {
      setLocalError(error || "Gagal menyimpan wallet.");
      triggerShake();
    }
  };

  const renderDots = (length: number) => {
    return (
      <View style={styles.dotsContainer}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: length > i ? theme.primary : "transparent",
                borderColor: length > i ? theme.primary : theme.border,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { borderColor: theme.border }]}
        >
          {/* Jika ingin prevent back, hapus tombol ini atau handle logicnya */}
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Buat PIN
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View
        style={[styles.content, { transform: [{ translateX: shakeAnim }] }]}
      >
        <View
          style={[styles.iconCircle, { backgroundColor: theme.primary + "15" }]}
        >
          <KeyRound size={32} color={theme.primary} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {step === "create" ? "Masukkan PIN Baru" : "Konfirmasi PIN"}
        </Text>
        <Text style={[styles.desc, { color: theme.textSecondary }]}>
          {step === "create"
            ? "PIN 6 digit ini akan digunakan untuk membuka wallet Anda."
            : "Masukkan ulang PIN yang sama untuk konfirmasi."}
        </Text>

        {renderDots(step === "create" ? pin.length : confirmPin.length)}

        {(localError || error) && (
          <Text style={[styles.errorText, { color: "#FF3B30" }]}>
            {localError || error}
          </Text>
        )}

        {/* Numpad */}
        <View style={styles.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.key,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => handleNumberPress(num)}
              activeOpacity={0.7}
            >
              <Text style={[styles.keyText, { color: theme.text }]}>{num}</Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.key, { backgroundColor: "transparent" }]} />{" "}
          {/* Spacer kosong */}
          <TouchableOpacity
            style={[
              styles.key,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => handleNumberPress(0)}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, { color: theme.text }]}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.key,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Delete size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={{ color: "#fff" }}>Menyimpan Wallet...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  content: { flex: 1, alignItems: "center" },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  desc: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  dotsContainer: { flexDirection: "row", gap: 12, marginBottom: 40 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  numpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: SCREEN_W - 48,
    justifyContent: "center",
    gap: 16,
  },
  key: {
    width: (SCREEN_W - 80) / 3,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontSize: 24, fontWeight: "600" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
