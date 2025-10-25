import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing, withRepeat } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";

export default function Splash({ initialRoute }) {
  const router = useRouter();

  // Animation values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const logoPulse = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const gradientOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const blurOpacity = useSharedValue(0);
  const parallax = useSharedValue(0);

  const [typedText, setTypedText] = useState("");
  const fullText = "Inspire. Create. Share.";

  useEffect(() => {
    // Logo entrance
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1.1, { duration: 800, easing: Easing.out(Easing.elastic(1.2)) });
    logoRotation.value = withTiming(360, { duration: 1000, easing: Easing.out(Easing.exp) });

    setTimeout(() => {
      logoScale.value = withTiming(1, { duration: 300 });
    }, 800);

    // Pulse effect
    logoPulse.value = withRepeat(withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);

    // Text fade-in
    textOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));

    // Typewriter subtitle
    let index = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, index + 1));
      index++;
      if (index === fullText.length) clearInterval(interval);
    }, 80);

    // Background shimmer
    gradientOpacity.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }), -1, true);

    // Parallax effect
    parallax.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true);

    // Blur fade-in
    blurOpacity.value = withDelay(1000, withTiming(0.8, { duration: 1000 }));

    // Exit transition
    const timeout = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 600 });
      setTimeout(() => router.replace(initialRoute), 700);
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value * logoPulse.value }, { rotate: `${logoRotation.value}deg` }],
    opacity: logoOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const gradientStyle = useAnimatedStyle(() => ({
    opacity: gradientOpacity.value,
    transform: [{ translateX: parallax.value * 10 }],
  }));

  const blurStyle = useAnimatedStyle(() => ({
    opacity: blurOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
        <LinearGradient colors={["#0f2027", "#203a43", "#2c5364"]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, blurStyle]}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.Image source={require("../assets/images/logo.png")} style={[styles.logo, logoStyle]} resizeMode="contain" />
      <Animated.Text style={[styles.text, textStyle]}>Welcome to Muse</Animated.Text>
      <Text style={styles.subtitle}>{typedText}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 250, height: 250 },
  text: {
    marginTop: 20,
    fontSize: 22,
    color: "#fff",
    fontWeight: "600",
    textShadowColor: "#00f0ff",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#ccc",
    fontStyle: "italic",
  },
});
