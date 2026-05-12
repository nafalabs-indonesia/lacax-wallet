// app/(auth)/backup-intro.tsx
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function BackupIntroScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.iconBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={theme.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Title & Description - DI ATAS */}
        <Text style={[styles.title, { color: theme.text }]}>
          Cadangkan Wallet Anda
        </Text>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Anda memerlukan{" "}
          <Text style={{ fontWeight: "600", color: theme.text }}>
            secret recovery phrase
          </Text>{" "}
          untuk memulihkan kripto jika perangkat hilang atau beralih wallet.
          {"\n"}
          <Text style={{ fontWeight: "600", color: theme.text }}>
            Jangan pernah membagikannya kepada siapapun.
          </Text>
        </Text>

        {/* Illustration / Secure Image - DI TENGAH (Diturunkan) */}
        <View style={styles.illustration}>
          <Image
            source={require("../../assets/secure.png")}
            style={styles.welcomeImage}
            resizeMode="contain"
          />
        </View>

        {/* Button Group: Skip (kiri) | Lanjutkan (kanan) */}
        <View style={styles.buttonGroup}>
          {/* Skip - ghost/outline */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonOutline,
              { borderColor: theme.border },
            ]}
            onPress={() => router.push("/(auth)/reveal-seed")}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
              Lewati
            </Text>
          </TouchableOpacity>

          {/* Reveal/Lanjutkan - solid */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSolid,
              { backgroundColor: theme.primary },
            ]}
            onPress={() => router.push("/(auth)/reveal-seed")}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>
              Lanjutkan
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60, // Space for status bar
  },
  topBar: {
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
  content: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 10,
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "left",
    alignSelf: "flex-start",
    marginBottom: 10, // Kurangi margin bawah teks agar tidak terlalu jauh dari gambar
    lineHeight: 22,
  },
  illustration: {
    marginTop: 30, // TAMBAHKAN INI: Mendorong gambar ke bawah
    marginBottom: 30, // Jarak antara gambar dan tombol
    alignItems: "center",
  },
  welcomeImage: {
    width: 240,
    height: 240,
  },
  buttonGroup: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 9999,
    paddingVertical: 14,
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
});
