// app/(auth)/create.tsx
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { useCreateWallet } from "../../hooks/useCreateWallet";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

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
    setError,
  } = useCreateWallet();

  useEffect(() => {
    if (!mnemonic) generateNewWallet();
  }, []);

  const words = mnemonic.split(" ");

  const handleBack = () => {
    if (step === 1 && mnemonic) {
      Alert.alert(
        "Keluar?",
        "Seed phrase belum disimpan. Pastikan Anda sudah menuliskannya sebelum keluar.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Keluar",
            style: "destructive",
            onPress: () => router.back(),
          },
        ],
      );
    } else {
      router.back();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              { backgroundColor: step >= s ? theme.primary : theme.border },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.title, { color: theme.text }]}>
        {step === 1 && "Buat Wallet Baru"}
        {step === 2 && "Verifikasi Seed Phrase"}
        {step === 3 && "Buat PIN Keamanan"}
      </Text>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {step === 1 && "Simpan seed phrase dengan aman"}
        {step === 2 &&
          `Pilih kata ke-${verifyIndices.map((i) => i + 1).join(" & ")}`}
        {step === 3 && "Buat PIN 6 digit untuk mengamankan wallet"}
      </Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* STEP 1: Seed Phrase */}
      {step === 1 && (
        <View style={styles.card}>
          <Text style={[styles.warningTitle, { color: "#FF3B30" }]}>
            ⚠️ JANGAN BAGIKAN SEED PHRASE ANDA
          </Text>
          <Text style={styles.warningDesc}>
            Siapa saja yang memiliki seed phrase dapat mengakses wallet Anda.
          </Text>

          <View style={styles.seedGrid}>
            {words.map((word, index) => (
              <View
                key={index}
                style={[
                  styles.seedItem,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text style={styles.seedNumber}>{index + 1}.</Text>
                <Text style={[styles.seedWord, { color: theme.text }]}>
                  {word}
                </Text>
              </View>
            ))}
          </View>

          <Button
            title="Saya Sudah Menyimpannya dengan Aman"
            onPress={startVerification}
            variant="primary"
            style={{ marginTop: 24 }}
          />
        </View>
      )}

      {/* STEP 2: Verification */}
      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.verifyTitle}>Pilih Kata yang Benar</Text>

          <View style={styles.selectedContainer}>
            {selectedWords.map((word, i) => (
              <View
                key={i}
                style={[
                  styles.selectedPill,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={styles.selectedPillText}>{word}</Text>
              </View>
            ))}
            {Array(3 - selectedWords.length)
              .fill(0)
              .map((_, i) => (
                <View key={i} style={styles.emptyPill} />
              ))}
          </View>

          <View style={styles.wordOptions}>
            {words.map((word, index) => (
              <Button
                key={index}
                title={word}
                variant="ghost"
                onPress={() => handleWordSelect(word)}
                disabled={selectedWords.includes(word)}
                style={styles.wordButton}
              />
            ))}
          </View>

          <Button
            title="Verifikasi Seed Phrase"
            onPress={verifySeedPhrase}
            variant="primary"
            disabled={selectedWords.length !== 3}
            style={{ marginTop: 20 }}
          />
        </View>
      )}

      {/* STEP 3: PIN Setup */}
      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.pinTitle}>Masukkan PIN 6 Digit</Text>

          <View style={styles.pinDisplay}>
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    {
                      borderColor:
                        pin.length > i ? theme.primary : theme.border,
                    },
                  ]}
                >
                  {pin.length > i && <Text style={styles.pinDotFilled}>●</Text>}
                </View>
              ))}
          </View>

          <View style={styles.numpad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((num, index) => (
              <Button
                key={index}
                title={num.toString()}
                variant="ghost"
                onPress={() => {
                  if (num === "⌫") setPin(pin.slice(0, -1));
                  else if (num !== "" && pin.length < 6) setPin(pin + num);
                }}
                style={styles.numpadButton}
              />
            ))}
          </View>

          <Button
            title={
              isLoading ? "Membuat Wallet..." : "Selesai & Masuk ke Wallet"
            }
            onPress={finalizeWallet}
            variant="primary"
            disabled={isLoading || pin.length !== 6}
            style={{ marginTop: 30 }}
          />
        </View>
      )}

      <Button
        title="Kembali"
        variant="ghost"
        onPress={handleBack}
        style={{ marginTop: 16 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  warningDesc: {
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 20,
    opacity: 0.8,
  },
  seedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  seedItem: {
    width: "48%",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  seedNumber: {
    fontWeight: "bold",
    marginRight: 8,
    width: 24,
  },
  seedWord: {
    fontSize: 16,
    fontWeight: "600",
  },
  verifyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  selectedContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
    minHeight: 48,
  },
  selectedPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
  },
  selectedPillText: {
    color: "white",
    fontWeight: "600",
  },
  emptyPill: {
    width: 80,
    height: 38,
    borderRadius: 25,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ccc",
  },
  wordOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  wordButton: {
    minWidth: "30%",
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  pinDisplay: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 30,
  },
  pinDot: {
    width: 42,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  pinDotFilled: {
    fontSize: 24,
  },
  numpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  numpadButton: {
    width: "30%",
    height: 70,
    borderRadius: 16,
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "500",
  },
});
