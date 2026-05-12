// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { Settings } from "lucide-react-native";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WalletRepository } from "../../modules/wallet/infrastructure/WalletRepository";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          bottom: Platform.OS === "ios" ? 40 : 30,
          marginHorizontal: 20,
          borderRadius: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 10,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || options.title || route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let icon;
        if (route.name === "index") {
          icon = (
            <Ionicons
              name="home"
              size={22}
              color={isFocused ? theme.primary : theme.textSecondary}
            />
          );
        } else if (route.name === "explore") {
          icon = (
            <Ionicons
              name="compass"
              size={22}
              color={isFocused ? theme.primary : theme.textSecondary}
            />
          );
        } else if (route.name === "settings") {
          icon = (
            <Settings
              size={22}
              color={isFocused ? theme.primary : theme.textSecondary}
            />
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            {icon}
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? theme.primary : theme.textSecondary,
                  fontWeight: isFocused ? "700" : "500",
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { isDarkMode, walletAddress } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const [status, setStatus] = React.useState<
    "checking" | "locked" | "new" | "ready"
  >("checking");

  React.useEffect(() => {
    const checkAuth = async () => {
      if (walletAddress) {
        setStatus("ready");
        return;
      }

      const initialized = await WalletRepository.isInitialized();
      if (initialized) {
        setStatus("locked");
      } else {
        setStatus("new");
      }
    };

    checkAuth();
  }, [walletAddress]);

  if (status === "checking") {
    return null;
  }

  if (status === "locked") {
    return <Redirect href="/(auth)/unlock" />;
  }

  if (status === "new") {
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="settings" options={{ title: "Pengaturan" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    position: "absolute",
    left: 20,
    right: 20,
    height: 64,
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderRadius: 24,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
  },
});
