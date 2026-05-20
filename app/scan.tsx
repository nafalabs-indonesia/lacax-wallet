// app/scan.tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Check, Flashlight, FlashlightOff, Link, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

// Import Service yang kita buat (Pastikan path sesuai)
// Jika Anda belum membuat filenya, kode ini akan error sampai Anda membuatnya.
import { initWalletConnect, pairWithURI, registerEventListeners } from "../services/WalletConnectService";

const { width } = Dimensions.get("window");
const SCAN_SIZE = width * 0.7;

// ─────────────────────────────────────────────
// Custom Alert Component
// ─────────────────────────────────────────────
type AlertType = "confirm" | "info" | "success" | "loading" | "error";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  theme: any;
}

function CustomAlert({
  visible,
  title,
  message,
  type = "confirm",
  primaryLabel = "Confirm",
  secondaryLabel = "Cancel",
  onPrimary,
  onSecondary,
  theme,
}: CustomAlertProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSecondary}
    >
      <View style={styles.alertOverlay}>
        <View style={[styles.alertBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.alertIconContainer, { backgroundColor: theme.background }]}>
            {type === "loading" ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : type === "success" ? (
              <Check size={24} color="#10B981" strokeWidth={2.5} />
            ) : type === "error" ? (
              <X size={24} color="#EF4444" strokeWidth={2.5} />
            ) : (
              <Link size={24} color={theme.primary} strokeWidth={2.5} />
            )}
          </View>

          <Text style={[styles.alertTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>{message}</Text>

          <View style={styles.alertActions}>
            {onSecondary && type !== "loading" && (
              <TouchableOpacity
                style={[styles.alertBtn, { backgroundColor: theme.background }]}
                onPress={onSecondary}
              >
                <Text style={[styles.alertBtnText, { color: theme.text }]}>{secondaryLabel}</Text>
              </TouchableOpacity>
            )}
            {type !== "loading" && (
              <TouchableOpacity
                style={[styles.alertBtn, { backgroundColor: theme.primary, opacity: 0.9 }]}
                onPress={onPrimary}
              >
                <Text style={[styles.alertBtnText, { color: "#FFF" }]}>{primaryLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function ScanScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Initialize WalletConnect on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initWalletConnect();
        registerEventListeners();
        console.log("WC Ready");
      } catch (e) {
        console.error("Failed to init WC", e);
      }
    };
    init();
  }, []);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: AlertType;
    primaryLabel?: string;
    secondaryLabel?: string;
    onPrimary?: () => void;
    onSecondary?: () => void;
  } | null>(null);

  const closeAlert = () => {
    setAlertConfig(null);
    setScanned(false);
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Camera Access Required</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: theme.textSecondary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);

      if (data.startsWith("wc:")) {
        setAlertConfig({
          visible: true,
          title: "WalletConnect Detected",
          message: "Connect to this dApp?",
          type: "info",
          primaryLabel: "Connect",
          secondaryLabel: "Cancel",
          onSecondary: closeAlert,
          onPrimary: async () => {
            setAlertConfig(prev => prev ? { ...prev, title: "Connecting...", type: "loading", primaryLabel: "", secondaryLabel: "" } : null);

            try {
              // INI FUNGSI YANG SEBENARNYA MELAKUKAN KONEKSI
              await pairWithURI(data);

              setAlertConfig(prev => prev ? {
                ...prev,
                title: "Connected",
                message: "Session established. You can now return to the dApp.",
                type: "success",
                primaryLabel: "Done",
                onPrimary: () => {
                  closeAlert();
                  router.back();
                }
              } : null);
            } catch (error) {
              setAlertConfig(prev => prev ? {
                ...prev,
                title: "Connection Failed",
                message: "Invalid URI or network error.",
                type: "error",
                primaryLabel: "Retry",
                onPrimary: closeAlert,
                onSecondary: closeAlert
              } : null);
            }
          },
        });
      } else {
        // Handle Address or other QR
        setAlertConfig({
          visible: true,
          title: "QR Detected",
          message: data,
          type: "info",
          primaryLabel: "OK",
          onPrimary: closeAlert,
        });
      }
    },
    [scanned, router],
  );

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => router.back()}>
            <X size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]} onPress={() => setTorch((t) => !t)}>
            {torch ? <FlashlightOff size={22} color="#fff" /> : <Flashlight size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
        <View style={styles.frameContainer}>
          <View style={[styles.scanFrame, { width: SCAN_SIZE, height: SCAN_SIZE }]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
        <View style={styles.bottomSection}>
          <Text style={styles.scanText}>Align QR code within frame</Text>
          {scanned && (
            <TouchableOpacity style={[styles.scanAgainBtn, { backgroundColor: theme.primary }]} onPress={() => setScanned(false)}>
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {alertConfig && <CustomAlert theme={theme} {...alertConfig} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, justifyContent: "space-between" },
  topBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 56 : 40 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  frameContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  scanFrame: { borderRadius: 16, position: "relative" },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#fff" },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  bottomSection: { paddingHorizontal: 40, paddingBottom: 40, alignItems: "center", gap: 16 },
  scanText: { color: "#fff", fontSize: 14 },
  scanAgainBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  scanAgainText: { color: "#fff", fontWeight: "600" },
  alertOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  alertBox: { width: "100%", maxWidth: 340, borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, backgroundColor: "#1a1a1a", borderColor: "#333" },
  alertIconContainer: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  alertTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center", color: "#fff" },
  alertMessage: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20, color: "#aaa" },
  alertActions: { flexDirection: "row", width: "100%", gap: 12 },
  alertBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  alertBtnText: { fontSize: 15, fontWeight: "600" },
  btn: { marginHorizontal: 40, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  backText: { marginTop: 20, fontSize: 14, textAlign: "center", color: "#aaa" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginTop: 100, marginBottom: 12, color: "#fff" },
});