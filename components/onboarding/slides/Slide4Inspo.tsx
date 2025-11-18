import React from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, interpolate, Extrapolate } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Inspiration1, Inspiration2, ProductWhite, ProductFull } from "@/assets/images/onboarding";
import { MotiView } from "moti";

const { width } = Dimensions.get("window");
const SLIDER_WIDTH = width * 0.60;
const SLIDER_HEIGHT = SLIDER_WIDTH * 1.1;

export const Slide4Inspo = () => {
  // Shared value for the slider position (starts in the middle)
  const translateX = useSharedValue(SLIDER_WIDTH / 2);
  
  // Shared value to "remember" the start position when dragging begins
  const startX = useSharedValue(0);

  // New Gesture API definition
  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      // Calculate new position based on start + drag distance
      const newPos = startX.value + event.translationX;
      // Clamp between 0 and the slider width
      translateX.value = Math.min(Math.max(newPos, 0), SLIDER_WIDTH);
    });

  const overlayStyle = useAnimatedStyle(() => ({ width: translateX.value }));
  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  return (
    <View style={styles.container}>
      {/* Inspo Cards */}
      <View style={styles.inspoRow}>
        <MotiView 
          from={{ rotate: '0deg', scale: 0 }} 
          animate={{ rotate: '-12deg', scale: 1 }} 
          transition={{ type: 'spring', delay: 200 }}
          style={styles.inspoCardContainer}
        >
          <Image source={Inspiration1} style={styles.inspoCard} />
        </MotiView>
        <MotiView 
          from={{ rotate: '0deg', scale: 0 }} 
          animate={{ rotate: '12deg', scale: 1 }} 
          transition={{ type: 'spring', delay: 300 }}
          style={styles.inspoCardContainer}
        >
          <Image source={Inspiration2} style={styles.inspoCard} />
        </MotiView>
      </View>

      {/* Slider Container */}
      <View style={styles.sliderWrapper}>
        {/* Bottom Layer (Before / White) */}
        <Image source={ProductWhite} style={styles.productImage} />

        {/* Top Layer (After / Full) - Clipped by animated width */}
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Image source={ProductFull} style={styles.productImage} />
        </Animated.View>

        {/* Handle wrapped in GestureDetector */}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.handle, handleStyle]}>
            <View style={styles.handleLine} />
            <View style={styles.handleKnob}>
                <Ionicons name="code-outline" size={16} color="#fff" />
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    alignItems: "center",
    height: 450,
    justifyContent: 'center',
  },
  inspoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: -20,
    zIndex: 10,
  },
  inspoCardContainer: {
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  inspoCard: {
    width: 80,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
  },
  sliderWrapper: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    position: 'relative',
  },
  productImage: {
    width: SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    resizeMode: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    height: '100%',
    overflow: 'hidden',
    position: 'absolute',
    left: 0,
    top: 0,
    borderRightWidth: 2,
    borderColor: '#fff',
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -20, // Center over the line
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100, 
  },
  handleLine: {
    width: 2,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  handleKnob: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});