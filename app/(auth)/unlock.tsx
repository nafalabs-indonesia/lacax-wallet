// app/(auth)/unlock.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

export default function UnlockScreen() {
  const router = useRouter();
  const { setWalletAddress, isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async () => {
    setError("");
    setIsLoading(true);

    try {
      // 1. Ambil Mnemonic
      const mnemonic = await WalletRepository.getMnemonic();

      if (!mnemonic) {
        // Jika mnemonic hilang tapi status initialized true, reset saja
        await WalletRepository.wipeWallet();
        router.replace("/");
        return;
      }

      // 2. Validasi PIN Sederhana (Panjang 6 digit)
      // NOTE: Untuk keamanan produksi, PIN harus digunakan untuk mendekripsi mnemonic yang terenkripsi.
      if (pin.length !== 6) {
        setError("PIN harus 6 digit");
        setIsLoading(false);
        return;
      }

      // 3. Derive Address
      // Ini adalah langkah kunci: Kita hitung ulang address dari mnemonic yang ada di SecureStore
      const privateKey =
        KeyDerivationService.getPrivateKeyFromMnemonic(mnemonic);
      const address = KeyDerivationService.getAddressFromPrivateKey(privateKey);

      // 4. SIMPAN KE STORE GLOBAL
      setWalletAddress(address);

      // 5. Redirect ke Home
      router.replace("/(tabs)");
    } catch (e: any) {
      console.error(e);
      setError("Gagal membuka wallet. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Masukkan PIN</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Masukkan 6 digit PIN keamanan Anda
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
        autoFocus
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 },
        ]}
        onPress={handleUnlock}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Buka Wallet</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/")}>
        <Text style={{ color: theme.primary, marginTop: 20 }}>
          Kembali / Reset
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: { fontSize: 16, marginBottom: 32, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 20,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  errorText: { color: "#FF3B30", textAlign: "center", marginBottom: 10 },
});
