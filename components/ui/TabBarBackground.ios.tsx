import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";

export default function BlurTabBarBackground() {
  return (
    <BlurView
      tint="systemMaterial"
      intensity={80}
      // Apply styles to clip the blur into a pill shape
      style={{
        ...StyleSheet.absoluteFillObject,
        overflow: "hidden",
        borderRadius: 35,
      }}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
