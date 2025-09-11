import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

// This is a shim for web and Android where the tab bar is generally opaque.
export default function TabBarBackground() {
  const colorScheme = useColorScheme() ?? "light";

  // Return null on iOS because the blur effect is handled in TabBarBackground.ios.tsx
  if (Platform.OS === "ios") {
    return null;
  }

  // Render a styled View for Android and web
  return (
    <View
      style={[
        styles.background,
        {
          backgroundColor: colorScheme === "dark" ? "rgba(21, 23, 24, 0.95)" : "rgba(250, 250, 250, 0.95)",
        },
      ]}
    />
  );
}

export function useBottomTabOverflow() {
  return 0;
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 35,
    overflow: "hidden",
  },
});
