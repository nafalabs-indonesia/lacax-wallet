// components/HomeHeader.tsx
import { Bell } from "lucide-react-native";
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
  onNotifPress?: () => void;
  hasNotif?: boolean;
}

export function HomeHeader({
  onNotifPress,
  hasNotif = false,
}: HomeHeaderProps) {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const scale = useRef(new Animated.Value(1)).current;

  const handleNotifPress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onNotifPress?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Logo */}
      <Image
        source={
          isDarkMode
            ? require("../assets/logo/lacax-dark.png")
            : require("../assets/logo/lacax-light.png")
        }
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Notif button */}
      <TouchableOpacity onPress={handleNotifPress} activeOpacity={1}>
        <Animated.View
          style={[
            styles.notifBtn,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              transform: [{ scale }],
            },
          ]}
        >
          <Bell size={18} color={theme.text} strokeWidth={2} />

          {/* Dot badge */}
          {hasNotif && <View style={styles.badge} />}
        </Animated.View>
      </TouchableOpacity>
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
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
});
