import {
  Check,
  ChevronDown,
  ChevronUp,
  Grip,
  PlusCircle,
  ScanLine,
  Settings,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "../store/appStore";
import { Colors } from "../theme/colors";

interface HomeHeaderProps {
  onSettingsPress?: () => void;
  onScanPress?: () => void;
}

export function HomeHeader({ onSettingsPress, onScanPress }: HomeHeaderProps) {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const settingsScale = useRef(new Animated.Value(1)).current;
  const scanScale = useRef(new Animated.Value(1)).current;

  const handleSettingsPress = () => {
    Animated.sequence([
      Animated.timing(settingsScale, {
        toValue: 0.88,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(settingsScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onSettingsPress?.();
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
      <View style={styles.leftSectionWrapper}>
        <TouchableOpacity
          style={styles.leftSection}
          activeOpacity={0.7}
          onPress={() => setShowAccountMenu(!showAccountMenu)}
        >
          <Image
            source={require("../assets/avatar.png")}
            style={styles.avatar}
          />
          <View
            style={{
              marginLeft: 10,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text style={[styles.accountLabel, { color: theme.text }]}>
              Account 1
            </Text>

            {showAccountMenu ? (
              <ChevronUp
                size={16}
                color={theme.textSecondary}
                style={{ marginLeft: 4 }}
              />
            ) : (
              <ChevronDown
                size={16}
                color={theme.textSecondary}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </TouchableOpacity>

        {showAccountMenu && (
          <>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={() => setShowAccountMenu(false)}
            />

            <View
              style={[
                styles.dropdownContainer,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.dropdownHeader}>
                <Text
                  style={[styles.dropdownTitle, { color: theme.textSecondary }]}
                >
                  Accounts
                </Text>
              </View>

              <TouchableOpacity style={styles.dropdownItem} activeOpacity={0.7}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <Image
                    source={require("../assets/avatar.png")}
                    style={styles.smallAvatar}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.itemName, { color: theme.text }]}>
                      Account 1
                    </Text>
                    <Text style={[styles.itemSub, { color: theme.primary }]}>
                      Active
                    </Text>
                  </View>
                </View>
                <Check size={18} color={theme.primary} strokeWidth={2.5} />
              </TouchableOpacity>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <TouchableOpacity style={styles.dropdownItem} activeOpacity={0.7}>
                <PlusCircle size={20} color={theme.primary} />
                <Text
                  style={[
                    styles.itemName,
                    { color: theme.text, marginLeft: 10 },
                  ]}
                >
                  Add Account
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dropdownItem} activeOpacity={0.7}>
                <Settings size={20} color={theme.textSecondary} />
                <Text
                  style={[
                    styles.itemName,
                    { color: theme.text, marginLeft: 10 },
                  ]}
                >
                  Manage Accounts
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={styles.rightButtons}>
        <TouchableOpacity onPress={handleScanPress} activeOpacity={0.7}>
          <Animated.View
            style={[
              styles.iconBtn,
              {
                transform: [{ scale: scanScale }],
              },
            ]}
          >
            <ScanLine size={24} color={theme.text} strokeWidth={2} />
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSettingsPress} activeOpacity={0.7}>
          <Animated.View
            style={[
              styles.iconBtn,
              {
                transform: [{ scale: settingsScale }],
              },
            ]}
          >
            <Grip size={24} color={theme.text} strokeWidth={2} />
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
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 10,
    position: "relative",
    zIndex: 10,
  },
  leftSectionWrapper: {
    position: "relative",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  accountLabel: {
    fontSize: 15,
    fontWeight: "600",
  },

  backdrop: {
    position: "absolute",
    top: -50,
    left: -20,
    right: -20,
    bottom: -300,
    zIndex: -1,
  },

  dropdownContainer: {
    position: "absolute",
    top: 50,
    left: -10,
    width: 260,
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 20,
  },
  dropdownHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
    opacity: 0.5,
  },

  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
