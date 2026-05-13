import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

export default function WelcomeScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Bagian Atas: Ilustrasi */}
      <View style={styles.topSection}>
        <Image
          source={require("../assets/welcome.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* Bagian Tengah: Judul & Subjudul */}
      <View style={styles.middleSection}>
        <Text style={[styles.title, { color: theme.text }]}>
          Own Your{"\n"}Crypto
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Full control of your digital assets
        </Text>
      </View>

      {/* Bagian Bawah: Tombol */}
      <View style={styles.bottomSection}>
        <View style={styles.buttonGroup}>
          {/* Import - Outline */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonOutline,
              { borderColor: theme.primary },
            ]}
            onPress={() => router.push("/(auth)/import")}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: theme.primary }]}>
              Import
            </Text>
          </TouchableOpacity>

          {/* Create Wallet - Solid */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSolid,
              { backgroundColor: theme.primary },
            ]}
            onPress={() => router.push("/(auth)/backup-intro")}
            activeOpacity={0.7}
          >
            <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
              Create Wallet
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
    // Kita pakai justifyContent: 'space-between' untuk menyebar 3 bagian utama
    // Top (Illustration), Middle (Text), Bottom (Buttons)
    justifyContent: "space-between",
    paddingTop: 130, // Jarak dari atas layar ke ilustrasi
    paddingBottom: 80, // Jarak dari tombol ke bawah layar
  },
  topSection: {
    alignItems: "center",
    // Margin bottom ini mengatur jarak antara Ilustrasi dan Judul
    marginBottom: 20,
  },
  illustration: {
    width: 250,
    height: 250,
  },
  middleSection: {
    alignItems: "center",
    // Flex grow bisa membantu mendorong section ini ke tengah jika diperlukan,
    // tapi dengan space-between di parent, ini sudah cukup rapi.
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 48,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
    // Margin bottom ini mengatur jarak antara Subjudul dan Tombol
    marginBottom: 20,
  },
  bottomSection: {
    width: "100%",
    // Jika tombol masih terasa terlalu tinggi, tambah marginTop di sini
    marginTop: 20,
  },
  buttonGroup: {
    flexDirection: "row",
    width: "100%",
    gap: 16,
  },
  button: {
    flex: 1,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutline: {
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  buttonSolid: {},
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
