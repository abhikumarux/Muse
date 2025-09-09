import React, { FC, useEffect } from "react";
import { StyleSheet, Dimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedGestureHandler, withSpring, withTiming, runOnJS, interpolate, withRepeat, withSequence } from "react-native-reanimated";
import { PanGestureHandler, PanGestureHandlerGestureEvent } from "react-native-gesture-handler";
import { ThemedText } from "@/components/ThemedText";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BUTTON_WIDTH = SCREEN_WIDTH * 0.9;
const BUTTON_HEIGHT = 60;
const SWIPE_THRESHOLD = BUTTON_WIDTH * 0.7;

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  text: string;
}

const SwipeButton: FC<SwipeButtonProps> = ({ onSwipeComplete, text }) => {
  const colorScheme = useColorScheme() ?? "light";
  const translateX = useSharedValue(0);
  const isInteracting = useSharedValue(false);
  const nudgeAnimation = useSharedValue(0);

  useEffect(() => {
    nudgeAnimation.value = withRepeat(withSequence(withTiming(15, { duration: 800 }), withTiming(0, { duration: 800 })), -1);
  }, []);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number }>({
    onStart: (_, ctx) => {
      isInteracting.value = true;
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      const newTranslateX = ctx.startX + event.translationX;
      translateX.value = Math.min(Math.max(newTranslateX, 0), BUTTON_WIDTH - BUTTON_HEIGHT);
    },
    onEnd: (event) => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withTiming(BUTTON_WIDTH - BUTTON_HEIGHT);
        runOnJS(onSwipeComplete)();
      } else {
        translateX.value = withSpring(0);
      }
      isInteracting.value = false;
    },
  });

  // --- MODIFIED THIS BLOCK ---
  const animatedHandleStyle = useAnimatedStyle(() => {
    // The nudge animation is removed from the handle. It will only move with the user's gesture.
    return {
      transform: [{ translateX: translateX.value }],
    };
  });
  // --- END OF MODIFICATION ---

  const animatedTextStyle = useAnimatedStyle(() => {
    const nudge = isInteracting.value ? 0 : nudgeAnimation.value;
    return {
      opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD / 2], [1, 0], "clamp"),
      transform: [
        {
          translateX: translateX.value * 0.5 + nudge,
        },
      ],
    };
  });

  const themeColors = Colors[colorScheme];

  return (
    <LinearGradient colors={[...themeColors.buttonGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonContainer}>
      <Animated.View style={animatedTextStyle}>
        <ThemedText style={styles.buttonText}>{text}</ThemedText>
      </Animated.View>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.swipeHandle, { backgroundColor: themeColors.swipeHandleBackground }, animatedHandleStyle]}>
          <Feather name="chevrons-right" size={24} color={themeColors.swipeHandleIcon} />
        </Animated.View>
      </PanGestureHandler>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: BUTTON_WIDTH,
    height: BUTTON_HEIGHT,
    borderRadius: BUTTON_HEIGHT / 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  swipeHandle: {
    height: BUTTON_HEIGHT - 10,
    width: BUTTON_HEIGHT - 10,
    borderRadius: (BUTTON_HEIGHT - 10) / 2,
    position: "absolute",
    left: 5,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default SwipeButton;
