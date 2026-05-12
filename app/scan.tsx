// app/scan.tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Flashlight, FlashlightOff, X } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    Alert,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

const { width } = Dimensions.get("window");
const SCAN_SIZE = width * 0.7;

export default function ScanScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Request permission
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Meminta izin kamera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          Izin Kamera Diperlukan
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Kami butuh akses kamera untuk memindai QR code
        </Text>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.primary }]}
          onPress={requestPermission}
        >
          <Text style={styles.btnText}>Izinkan Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>
            Batal
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);

      // Handle WalletConnect URI
      if (data.startsWith("wc:")) {
        Alert.alert("WalletConnect", "Hubungkan ke dApp?", [
          { text: "Batal", style: "cancel", onPress: () => setScanned(false) },
          {
            text: "Hubungkan",
            onPress: () => {
              // TODO: Proses WalletConnect session
              console.log("WC URI:", data);
              router.back();
            },
          },
        ]);
        return;
      }

      // Handle address
      if (data.startsWith("0x") && data.length === 42) {
        Alert.alert("Alamat Terdeteksi", data, [
          { text: "Batal", style: "cancel", onPress: () => setScanned(false) },
          {
            text: "Kirim",
            onPress: () => {
              router.push({
                pathname: "/send",
                params: { to: data },
              });
            },
          },
        ]);
        return;
      }

      // Generic QR
      Alert.alert("QR Terdeteksi", data, [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
    },
    [scanned, router],
  );

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            onPress={() => router.back()}
          >
            <X size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            onPress={() => setTorch((t) => !t)}
          >
            {torch ? (
              <FlashlightOff size={22} color="#fff" />
            ) : (
              <Flashlight size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Scan frame */}
        <View style={styles.frameContainer}>
          <View
            style={[styles.scanFrame, { width: SCAN_SIZE, height: SCAN_SIZE }]}
          >
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom text */}
        <View style={styles.bottomSection}>
          <Text style={styles.scanText}>Arahkan kamera ke QR code</Text>
          {scanned && (
            <TouchableOpacity
              style={[styles.scanAgainBtn, { backgroundColor: theme.primary }]}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanAgainText}>Pindai Lagi</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 100,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 40,
  },
  btn: {
    marginHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backText: {
    marginTop: 20,
    fontSize: 14,
    textAlign: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  frameContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    borderRadius: 16,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#fff",
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  bottomSection: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === "ios" ? 50 : 40,
    alignItems: "center",
    gap: 16,
  },
  scanText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scanAgainBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  scanAgainText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
