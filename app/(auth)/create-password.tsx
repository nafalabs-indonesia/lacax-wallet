import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useCreateWallet } from "../../hooks/useCreateWallet"; // Sesuaikan path hook
import { useAppStore } from "../../store/appStore"; // Sesuaikan path store
import { Colors } from "../../theme/colors"; // Sesuaikan path theme

export default function CreatePasswordScreen() {
    const router = useRouter();
    const { isDarkMode } = useAppStore();
    const theme = isDarkMode ? Colors.dark : Colors.light;

    const { finalizeWallet } = useCreateWallet();

    // State
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showRepeatPassword, setShowRepeatPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Strength State
    const [strengthScore, setStrengthScore] = useState(0); // 0-4
    const [strengthLabel, setStrengthLabel] = useState("Weak");
    const [strengthColor, setStrengthColor] = useState("#EF4444"); // Red

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    // Inisialisasi array Animated.Value
    const dotAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Entry Animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Loading Dots Animation Logic
    useEffect(() => {
        if (!isCreating) {
            dotAnims.forEach((anim) => anim.setValue(0));
            return;
        }

        dotAnims.forEach((anim) => anim.setValue(0.3));

        const timeouts: ReturnType<typeof setTimeout>[] = [];

        // Definisi fungsi animateDot
        const animateDot = (anim: Animated.Value) => {
            Animated.sequence([
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0.3,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        };

        const CYCLE = 600;
        const STAGGER = 150;
        const TOTAL = CYCLE + STAGGER * 3;

        const runCycle = () => {
            dotAnims.forEach((anim, i) => {
                const t = setTimeout(() => animateDot(anim), i * STAGGER);
                timeouts.push(t);
            });
        };

        runCycle();
        const interval = setInterval(runCycle, TOTAL);

        return () => {
            clearInterval(interval);
            timeouts.forEach(clearTimeout);
            dotAnims.forEach((anim) => anim.setValue(0));
        };
    }, [isCreating]);

    // Calculate Password Strength
    useEffect(() => {
        if (password.length === 0) {
            setStrengthScore(0);
            setStrengthLabel("Weak");
            setStrengthColor("#EF4444");
            return;
        }

        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const finalScore = Math.min(score, 4);
        setStrengthScore(finalScore);

        if (finalScore <= 1) {
            setStrengthLabel("Weak");
            setStrengthColor("#EF4444");
        } else if (finalScore <= 2) {
            setStrengthLabel("Medium");
            setStrengthColor("#F59E0B");
        } else if (finalScore <= 3) {
            setStrengthLabel("Strong");
            setStrengthColor("#10B981");
        } else {
            setStrengthLabel("Very Strong");
            setStrengthColor("#10B981");
        }
    }, [password]);

    const handleCreatePassword = async () => {
        setPasswordError("");

        if (password.length < 8) {
            setPasswordError("Password must be at least 8 characters.");
            return;
        }
        if (password !== repeatPassword) {
            setPasswordError("Passwords do not match.");
            return;
        }

        setIsCreating(true);

        try {
            // Panggil fungsi finalize dari hook
            const ok = await finalizeWallet(password);

            if (ok) {
                // Jika sukses, pindah ke halaman wallet-ready
                router.replace("/(auth)/wallet-ready");
            } else {
                setPasswordError("Failed to save wallet. Please try again.");
                setIsCreating(false);
            }
        } catch (error) {
            console.error(error);
            setPasswordError("An error occurred. Please try again.");
            setIsCreating(false);
        }
    };

    // --- RENDER LOADING STATE ---
    if (isCreating) {
        return (
            <View
                style={[
                    styles.container,
                    { backgroundColor: theme.background, justifyContent: "center" },
                ]}
            >
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    Saving your wallet securely...
                </Text>

                <View style={styles.loadingDotsContainer}>
                    {dotAnims.map((anim, index) => (
                        <Animated.View
                            key={index}
                            style={[
                                styles.loadingDot,
                                {
                                    backgroundColor: theme.primary,
                                    opacity: anim,
                                    transform: [
                                        {
                                            scale: anim.interpolate({
                                                inputRange: [0.3, 1],
                                                outputRange: [0.7, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        />
                    ))}
                </View>
            </View>
        );
    }

    // --- RENDER FORM STATE ---
    return (
        <ScrollView
            contentContainerStyle={[
                styles.container,
                { backgroundColor: theme.background },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* HEADER */}
            <View style={styles.header}>
                <Image
                    source={
                        isDarkMode
                            ? require("../../assets/lacax-dark.png")
                            : require("../../assets/lacax-light.png")
                    }
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            <Animated.View
                style={[
                    styles.content,
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                ]}
            >
                <View>
                    <Text style={[styles.title, { color: theme.text }]}>
                        Create a Password
                    </Text>
                    <Text style={[styles.desc, { color: theme.textSecondary }]}>
                        Your password helps keep your wallet secure and private. You will need it to unlock your wallet.
                    </Text>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>
                            Password
                        </Text>
                        <View
                            style={[styles.inputContainer, { borderColor: theme.border }]}
                        >
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Enter password"
                                placeholderTextColor={theme.textSecondary}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff size={20} color={theme.textSecondary} />
                                ) : (
                                    <Eye size={20} color={theme.textSecondary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Repeat Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>
                            Repeat Password
                        </Text>
                        <View
                            style={[styles.inputContainer, { borderColor: theme.border }]}
                        >
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Repeat password"
                                placeholderTextColor={theme.textSecondary}
                                secureTextEntry={!showRepeatPassword}
                                value={repeatPassword}
                                onChangeText={setRepeatPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowRepeatPassword(!showRepeatPassword)}
                            >
                                {showRepeatPassword ? (
                                    <EyeOff size={20} color={theme.textSecondary} />
                                ) : (
                                    <Eye size={20} color={theme.textSecondary} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Strength Indicator */}
                    <View style={styles.strengthContainer}>
                        <Text style={[styles.strengthText, { color: theme.textSecondary }]}>
                            Use at least 8 characters, including letters and numbers.
                        </Text>

                        <View style={styles.strengthBars}>
                            {[1, 2, 3, 4].map((level) => (
                                <View
                                    key={level}
                                    style={[
                                        styles.strengthBar,
                                        {
                                            backgroundColor:
                                                level <= strengthScore ? strengthColor : theme.border,
                                        },
                                    ]}
                                />
                            ))}
                        </View>

                        {password.length > 0 && (
                            <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                                {strengthLabel}
                            </Text>
                        )}
                    </View>

                    {passwordError ? (
                        <Text style={styles.errorText}>{passwordError}</Text>
                    ) : null}
                </View>

                {/* Button */}
                <TouchableOpacity
                    style={[
                        styles.primaryBtn,
                        {
                            backgroundColor: theme.primary,
                            marginTop: 20,
                        },
                    ]}
                    onPress={handleCreatePassword}
                >
                    <Text style={styles.primaryBtnText}>Create Password</Text>
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 30,
    },
    header: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 80,
        height: 30,
    },
    content: {
        flex: 1,
        justifyContent: "space-between",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 12,
        textAlign: "left",
    },
    desc: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 30,
        textAlign: "left",
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "500",
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: "500",
    },
    eyeIcon: {
        padding: 8,
    },
    strengthContainer: {
        marginTop: 10,
        marginBottom: 20,
    },
    strengthText: {
        fontSize: 13,
        marginBottom: 8,
    },
    strengthBars: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 8,
    },
    strengthBar: {
        flex: 1,
        height: 6,
        borderRadius: 3,
    },
    strengthLabel: {
        fontSize: 13,
        fontWeight: "600",
        textAlign: "right",
    },
    errorText: {
        color: "#EF4444",
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 10,
        textAlign: "center",
    },
    primaryBtn: {
        borderRadius: 9999,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Loading Styles
    loadingText: {
        fontSize: 16,
        fontWeight: "500",
        textAlign: "center",
        marginBottom: 20,
    },
    loadingDotsContainer: {
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
    },
    loadingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
});