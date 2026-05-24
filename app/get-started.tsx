import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GetStartedScreen() {
  const router = useRouter();

  const handlePress = () => {
    router.push("/welcome");
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/lacax-dark.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.mainHeadline}>
        One Wallet.{"\n"}Secure and Simple.
      </Text>

      <Text style={styles.description}>
        Store, manage, and transact crypto safely with ease.
      </Text>

      <Image
        source={require("../assets/get-started.png")}
        style={styles.illustration}
        resizeMode="contain"
      />

      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 100,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffffff",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  logo: {
    width: 100,
    height: 30,
  },
  mainHeadline: {
    fontSize: 38,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 44,
    marginTop: 0,
    marginBottom: -40,
  },
  description: {
    fontSize: 16,
    color: "#CCCCCC",
    textAlign: "center",
    marginHorizontal: 20,
    lineHeight: 22,
    marginBottom: 10,
  },
  illustration: {
    width: 200,
    height: 200,
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#5573ef",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: "100%",
    maxWidth: 350,
    alignItems: "center",
    marginBottom: 30,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
