// app/(auth)/wallet-ready.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

export default function WalletReadyScreen() {
  const router = useRouter();
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  // Animations
  const imageAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const imageSlide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(imageAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(imageSlide, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(buttonAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleMasuk = () => {
    router.replace("/(auth)/unlock");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top accent */}
      <View
        style={[styles.topAccent, { backgroundColor: theme.primary + "12" }]}
      />

      {/* Image */}
      <Animated.View
        style={[
          styles.imageWrap,
          {
            opacity: imageAnim,
            transform: [{ translateY: imageSlide }],
          },
        ]}
      >
        <Image
          source={require("../../assets/succes.png")}
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Text */}
      <View style={styles.textBlock}>
        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              color: theme.text,
              opacity: titleAnim,
              transform: [
                {
                  translateY: titleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Your wallet is ready!
        </Animated.Text>

        {/* ✅ Subtitle ditambahkan di sini */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              color: theme.text + "AA",
              opacity: subtitleAnim,
              transform: [
                {
                  translateY: subtitleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Sign in and start connecting.
        </Animated.Text>
      </View>

      {/* Button */}
      <Animated.View
        style={[
          styles.buttonWrap,
          {
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleMasuk}
          activeOpacity={0.82}
        >
          <Text style={styles.buttonText}>Enter Wallet</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 44,
    justifyContent: "flex-end",
  },

  topAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    borderBottomLeftRadius: 48,
    borderBottomRightRadius: 48,
  },

  imageWrap: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  image: {
    width: 300,
    height: 300,
  },

  textBlock: {
    marginBottom: 36,
    gap: 10,
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 34,
    letterSpacing: -0.5,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  buttonWrap: {
    gap: 14,
    alignItems: "center",
  },

  button: {
    width: "100%",
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 50,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
