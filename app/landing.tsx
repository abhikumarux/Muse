import React, { useEffect, useState } from "react";
import { StyleSheet, ActivityIndicator, Image, Dimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import SwipeButton from "@/components/SwipeButton";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LandingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light"; // Get the current color scheme
  const [loading, setLoading] = useState(true);

  // Get the correct set of colors from the Colors object
  const themeColors = Colors[colorScheme];

  // Animation logic remains the same
  const contentOpacity = useSharedValue(0);
  const card1Scale = useSharedValue(0.8);
  const card2Scale = useSharedValue(0.8);
  const card3Scale = useSharedValue(0.8);
  const card1TranslateX = useSharedValue(50);
  const card2TranslateX = useSharedValue(-50);
  const card3TranslateX = useSharedValue(50);

  useEffect(() => {
    // Uncommenting this block to always show the landing page for testing
    /* const checkLandingStatus = async () => {
      try {
        const value = await AsyncStorage.getItem("hasSeenLanding");
        if (value === "true") {
          router.replace("/login");
        } else {
    */ setLoading(false);
    contentOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) });
    card1Scale.value = withDelay(500, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1)) }));
    card1TranslateX.value = withDelay(500, withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }));
    card2Scale.value = withDelay(700, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1)) }));
    card2TranslateX.value = withDelay(700, withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }));
    card3Scale.value = withDelay(900, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1)) }));
    card3TranslateX.value = withDelay(900, withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }));
    // Uncommenting this block to always show the landing page for testing
    /*    }
      } catch (error) {
        console.error("Failed to load landing page status:", error);
        setLoading(false);
      }
    };
    checkLandingStatus();
  */
  }, []);

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("hasSeenLanding", "true");
    router.replace("/login");
  };

  const animatedContentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const animatedCard1Style = useAnimatedStyle(() => ({
    transform: [{ scale: card1Scale.value }, { translateX: card1TranslateX.value }, { rotate: "360deg" }],
  }));
  const animatedCard2Style = useAnimatedStyle(() => ({
    transform: [{ scale: card2Scale.value }, { translateX: card2TranslateX.value }, { rotate: "15deg" }],
  }));
  const animatedCard3Style = useAnimatedStyle(() => ({
    transform: [{ scale: card3Scale.value }, { translateX: card3TranslateX.value }, { rotate: "-20deg" }],
  }));

  return (
    <LinearGradient
      colors={[...themeColors.landingGradient]} // Use the dynamic gradient from Colors.ts
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientBackground}
    >
      <Animated.View style={[styles.content, animatedContentStyle]}>
        {/* Top Logo */}
        <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />

        {/* Overlapping Image Cards */}
        <View style={styles.cardContainer}>
          <Animated.View style={[styles.card, styles.cardLeft, animatedCard1Style]}>
            <Image source={require("../assets/images/sample1-intro.png")} style={styles.cardImage} resizeMode="contain" />
          </Animated.View>
          <Animated.View style={[styles.card, styles.cardRight, animatedCard2Style]}>
            <Image source={require("../assets/images/sample2-intro.png")} style={styles.cardImage} resizeMode="contain" />
          </Animated.View>
          <Animated.View style={[styles.card, styles.cardLeft, styles.cardBackLeft, animatedCard3Style]}>
            <Image source={require("../assets/images/sample3-intro.png")} style={styles.cardImage} resizeMode="contain" />
          </Animated.View>
        </View>

        {/* Text Section */}
        <View style={styles.textContainer}>
          <ThemedText style={styles.mainTitle}>Design and Sell</ThemedText>
          <ThemedText style={[styles.mainTitle, { color: themeColors.accent }]}>Clothes in Minutes</ThemedText>
          <ThemedText type="subtitle" style={styles.tagline}>
            Your AI Creative Director Awaits
          </ThemedText>
        </View>

        {/* Swipe Button */}
        <SwipeButton text="Get Started" onSwipeComplete={handleGetStarted} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: "transparent",
  },
  logo: {
    width: 280,
    height: 100,
    marginTop: 10,
  },
  cardContainer: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginBottom: 20,
  },
  card: {
    width: SCREEN_WIDTH * 0.75,
    height: "100%",
    borderRadius: 20,
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  cardLeft: {
    alignItems: "center",
    zIndex: 100,
  },
  cardRight: {
    right: "-4%",
    zIndex: 9,
  },
  cardBackLeft: {
    left: "1%",
    zIndex: 8,
    opacity: 0.8,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 38,
  },
  tagline: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 15,
  },
});
