import React, { useEffect } from "react";
import { Image, StyleSheet, Dimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing, runOnJS } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

const { width, height } = Dimensions.get("window");

export default function Splash({ onFinish }: { onFinish: () => void }) {
  const colorScheme = useColorScheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Pulse animation loop
  useEffect(() => {
    scale.value = withRepeat(withSequence(withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }), withTiming(0.95, { duration: 800, easing: Easing.inOut(Easing.ease) })), -1, true);
  }, []);

  // Fade out after 2s
  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 500 });
      scale.value = withTiming(1.2, { duration: 500 }, () => {
        runOnJS(onFinish)();
      });
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <LinearGradient colors={Colors[colorScheme ?? "light"].landingGradient} style={styles.container}>
      <Animated.Image source={require("../assets/images/logo.png")} style={[styles.image, animatedStyle]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  image: {
    width: 350,
    height: 350,
    resizeMode: "contain",
  },
});
