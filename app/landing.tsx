import React from "react";
import { StyleSheet, Image, Dimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedText } from "@/components/ThemedText";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import SwipeButton from "@/components/SwipeButton";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LandingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const themeColors = Colors[colorScheme];

  // Animation values
  const contentOpacity = useSharedValue(0);
  const card1Scale = useSharedValue(0.8);
  const card2Scale = useSharedValue(0.8);
  const card3Scale = useSharedValue(0.8);
  const card1TranslateX = useSharedValue(SCREEN_WIDTH);
  const card2TranslateX = useSharedValue(-SCREEN_WIDTH);
  const card3TranslateX = useSharedValue(SCREEN_WIDTH);
  const textTranslateY = useSharedValue(SCREEN_HEIGHT);

  React.useEffect(() => {
    const slideInDuration = 800;
    const scaleAnimationDuration = 800;

    // Fade in screen
    contentOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.ease),
    });

    // Card animations
    card1TranslateX.value = withDelay(500, withTiming(0, { duration: slideInDuration, easing: Easing.out(Easing.ease) }));
    card1Scale.value = withDelay(500 + slideInDuration, withTiming(1, { duration: scaleAnimationDuration, easing: Easing.out(Easing.back(1)) }));

    card2TranslateX.value = withDelay(700, withTiming(0, { duration: slideInDuration, easing: Easing.out(Easing.ease) }));
    card2Scale.value = withDelay(700 + slideInDuration, withTiming(1, { duration: scaleAnimationDuration, easing: Easing.out(Easing.back(1)) }));

    card3TranslateX.value = withDelay(900, withTiming(0, { duration: slideInDuration, easing: Easing.out(Easing.ease) }));
    card3Scale.value = withDelay(900 + slideInDuration, withTiming(1, { duration: scaleAnimationDuration, easing: Easing.out(Easing.back(1)) }));

    // Text + slider animation
    textTranslateY.value = withDelay(500, withTiming(0, { duration: slideInDuration, easing: Easing.out(Easing.ease) }));
  }, []);

  const handleGetStarted = async () => {
    await AsyncStorage.setItem("hasSeenLanding", "true");
    // navigate to login
    router.replace("/login"); // fine here because user finished landing
  };

  // Animated styles
  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));
  const animatedCard1Style = useAnimatedStyle(() => ({
    transform: [{ scale: card1Scale.value }, { translateX: card1TranslateX.value }, { rotate: "360deg" }],
  }));
  const animatedCard2Style = useAnimatedStyle(() => ({
    transform: [{ scale: card2Scale.value }, { translateX: card2TranslateX.value }, { rotate: "15deg" }],
  }));
  const animatedCard3Style = useAnimatedStyle(() => ({
    transform: [{ scale: card3Scale.value }, { translateX: card3TranslateX.value }, { rotate: "-20deg" }],
  }));
  const animatedTextSectionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <LinearGradient colors={[...themeColors.landingGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientBackground}>
      <Animated.View style={[styles.content, animatedContentStyle]}>
        {/* Top Logo */}
        <Image source={require("../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />

        {/* Cards */}
        <View style={styles.cardContainer}>
          <Animated.View style={[styles.card, styles.cardCenter, animatedCard1Style]}>
            <Image source={require("../assets/images/sample1-intro.png")} style={styles.cardImage} resizeMode="contain" />
          </Animated.View>
          <Animated.View style={[styles.card, styles.cardRight, animatedCard2Style]}>
            <Image source={require("../assets/images/sample2-intro.png")} style={styles.cardImage} resizeMode="contain" />
          </Animated.View>
          <Animated.View style={[styles.card, styles.cardCenter, styles.cardBackLeft, animatedCard3Style]}>
            <Image source={require("../assets/images/sample3-intro.png")} style={styles.cardImage} resizeMode="contain" />
          </Animated.View>
        </View>

        {/* Text + Swipe */}
        <Animated.View style={[styles.textSection, animatedTextSectionStyle]}>
          <View style={styles.textContainer}>
            <ThemedText style={styles.mainTitle}>Design and Sell</ThemedText>
            <ThemedText
              style={[
                styles.mainTitle,
                {
                  color: themeColors.accent,
                  textShadowColor: "rgba(0, 0, 0, 0.9)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 2,
                },
              ]}
            >
              Clothes in Minutes
            </ThemedText>
            <ThemedText type="subtitle" style={styles.tagline}>
              Your AI Creative Director Awaits
            </ThemedText>
          </View>
          <SwipeButton text="Get Started" onSwipeComplete={handleGetStarted} />
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: { flex: 1, width: "100%", height: "100%", alignItems: "center", justifyContent: "space-between" },
  content: { flex: 1, alignItems: "center", width: "100%", justifyContent: "space-between", paddingTop: 50, paddingHorizontal: 24, paddingBottom: 40, backgroundColor: "transparent" },
  logo: { width: 280, height: 100, marginTop: 10 },
  cardContainer: { width: "100%", height: SCREEN_HEIGHT * 0.5, justifyContent: "center", alignItems: "center", position: "relative", marginBottom: 20 },
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
    elevation: 70,
  },
  cardCenter: { alignItems: "center", zIndex: 100 },
  cardRight: { right: "-4%", zIndex: 9 },
  cardBackLeft: { left: "1%", zIndex: 8, opacity: 0.8 },
  cardImage: { width: "100%", height: "100%", resizeMode: "contain" },
  textSection: { alignItems: "center" },
  textContainer: { alignItems: "center", marginBottom: 30 },
  mainTitle: {
    fontSize: 32,
    textAlign: "center",
    lineHeight: 38,
    fontFamily: "Inter-ExtraBold", // Updated
  },
  tagline: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 15,
    fontFamily: "Inter-ExtraBold", // Updated
  },
});