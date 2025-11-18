import React from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import { RedLettersMuse, CelciusMuse, TylerMuse, MaherMuse, NeoMuse } from "@/assets/images/onboarding"; 
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.55;
const CARD_HEIGHT = CARD_WIDTH * 1.2;
const SPACING = 0;

// Set duration here: lower number = faster scroll
const SCROLL_DURATION_MS = 12000; 

const images = [RedLettersMuse, CelciusMuse, TylerMuse, MaherMuse, NeoMuse];
const items = [...images, ...images]; // Duplicate for looping
const TOTAL_WIDTH = (CARD_WIDTH + SPACING) * images.length;

export const Slide2Muse = () => {
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-TOTAL_WIDTH, {
        duration: SCROLL_DURATION_MS, // Applied faster duration
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.row, animatedStyle]}>
        {items.map((img, index) => (
          <View 
            key={index} 
            style={[
              styles.cardWrapper, 
              // Rotate alternate cards slightly for a tossed look
              { transform: [{ rotate: index % 2 === 0 ? '3deg' : '-3deg' }] }
            ]}
          >
            {/* Image styling updated */}
            <Image source={img} style={styles.card} resizeMode="contain" />
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: 380,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: "row",
    alignItems: 'center',
    paddingLeft: 20,
  },
  cardWrapper: {
    marginRight: SPACING,
    // Kept shadow, removed border/background that interfered with image shape
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    resizeMode: "contain", // Ensures no cropping
    backgroundColor: 'transparent', // Ensures no white background is visible
  },
});