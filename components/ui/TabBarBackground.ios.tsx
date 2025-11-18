import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";

import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

export default function BlurTabBarBackground() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <BlurView
      tint={colorScheme === "dark" ? "dark" : "light"}
      intensity={100}
      style={{
        ...StyleSheet.absoluteFillObject,
        overflow: "hidden",
        borderRadius: 35,
        backgroundColor: colorScheme === "dark" ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.85)",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      }}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
