// components/ui/Button.tsx
import React from "react";
import {
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from "react-native";
import { useAppStore } from "../../store/appStore";
import { Colors } from "../../theme/colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  disabled = false,
  variant = "primary",
  style,
}) => {
  const { isDarkMode } = useAppStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;

  const buttonStyle: ViewStyle = {
    ...styles.button,
    backgroundColor: variant === "primary" ? theme.primary : "transparent",
    borderWidth: variant === "ghost" ? 1 : 0,
    borderColor: variant === "ghost" ? theme.border : "transparent",
    opacity: disabled ? 0.5 : 1,
    ...style,
  };

  const textStyle: TextStyle = {
    ...styles.text,
    color: variant === "primary" ? "#FFF" : theme.text,
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
