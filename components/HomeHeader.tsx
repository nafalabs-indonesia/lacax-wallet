// components/HomeHeader.tsx
import { ScanLine, Settings } from "lucide-react-native"; // ← Ganti Bell → Settings
import React, { useRef } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

interface HomeHeaderProps {
  onSettingsPress?: () => void; // ← Ganti onNotifPress → onSettingsPress
  onScanPress?: () => void;
}

export function HomeHeader({
  onSettingsPress, // ← Ganti
  onScanPress,
}: HomeHeaderProps) {
  // ← Hapus hasNotif

  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const settingsScale = useRef(new Animated.Value(1)).current; // ← Ganti notifScale → settingsScale
  const scanScale = useRef(new Animated.Value(1)).current;

  const handleSettingsPress = () => {
    // ← Ganti handleNotifPress
    Animated.sequence([
      Animated.timing(settingsScale, {
        // ← Ganti
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(settingsScale, {
        // ← Ganti
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onSettingsPress?.(); // ← Ganti
  };

  const handleScanPress = () => {
    Animated.sequence([
      Animated.timing(scanScale, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scanScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onScanPress?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Image
        source={
          isDarkMode
            ? require("../assets/lacax-dark.png")
            : require("../assets/lacax-light.png")
        }
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.rightButtons}>
        <TouchableOpacity onPress={handleScanPress} activeOpacity={1}>
          <Animated.View
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                transform: [{ scale: scanScale }],
              },
            ]}
          >
            <ScanLine size={18} color={theme.text} strokeWidth={2} />
          </Animated.View>
        </TouchableOpacity>

        {/* Settings Button - Ganti dari Notif */}
        <TouchableOpacity onPress={handleSettingsPress} activeOpacity={1}>
          <Animated.View
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                transform: [{ scale: settingsScale }], // ← Ganti
              },
            ]}
          >
            <Settings size={18} color={theme.text} strokeWidth={2} />
            {/* Hapus badge notif */}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 12,
  },
  logo: {
    width: 100,
    height: 36,
  },
  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
