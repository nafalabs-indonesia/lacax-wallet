// app/(auth)/import.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from "react-native";
import { Button } from "../../components/ui/Button";
import { WalletRepository } from "../../modules/wallet/infrastructure/WalletRepository";
import { KeyDerivationService } from "../../services/crypto/KeyDerivation";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function ImportWalletScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [mnemonic, setMnemonic] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImport = async () => {
    setError("");
    if (!KeyDerivationService.validateMnemonic(mnemonic.trim())) {
      setError("Seed phrase tidak valid.");
      return;
    }
    if (pin.length !== 6) {
      setError("PIN harus 6 digit.");
      return;
    }

    setIsLoading(true);
    try {
      await WalletRepository.importWallet(mnemonic.trim(), pin);
      router.replace("/(tabs)");
    } catch (e) {
      setError("Gagal mengimpor wallet.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Impor Wallet</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Masukkan 12 kata seed phrase Anda.
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Enter seed phrase..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          value={mnemonic}
          onChangeText={setMnemonic}
          autoCapitalize="none"
        />

        <Text style={[styles.label, { color: theme.text }]}>
          Buat PIN Keamanan
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="******"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          keyboardType="numeric"
          maxLength={6}
          value={pin}
          onChangeText={setPin}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          title={isLoading ? "Mengimpor..." : "Impor Wallet"}
          onPress={handleImport}
          disabled={isLoading}
          style={{ marginTop: 20 }}
        />

        <Button
          title="Kembali"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  label: { fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 8 },
  errorText: { color: "#ff4d4d", marginTop: 10 },
});
