import React from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import {
  S2TopHoodies1, S2TopBottoms2, S2TopShirts3, S2TopBeachwear4, S2TopSportsWear5,
  S2TopAprons6, S2TopTote7, S2TopFootwear8, S2TopKnitWear9, S2TopSwimWear10,
  S2BottomMugs1, S2BottomCaps2, S2BottomHomeDecor3, S2BottomFaceMask4, S2BottomPhone5,
  S2BottomPatches6, S2BottomBackpack7, S2BottomGifts8, S2BottomPaddles9, S2BottomTowels10
} from "@/assets/images/onboarding";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const ITEM_SIZE = width * 0.35;
const SPACING = 35;

const topRowImages = [
  S2TopHoodies1, S2TopBottoms2, S2TopShirts3, S2TopBeachwear4, S2TopSportsWear5,
  S2TopAprons6, S2TopTote7, S2TopFootwear8, S2TopKnitWear9, S2TopSwimWear10
];
const bottomRowImages = [
  S2BottomMugs1, S2BottomCaps2, S2BottomHomeDecor3, S2BottomFaceMask4, S2BottomPhone5,
  S2BottomPatches6, S2BottomBackpack7, S2BottomGifts8, S2BottomPaddles9, S2BottomTowels10
];

// Triplicate to ensure screen is always full during loop reset
const topItems = [...topRowImages, ...topRowImages, ...topRowImages];
const bottomItems = [...bottomRowImages, ...bottomRowImages, ...bottomRowImages];

const LOOP_DURATION = 16000;
const ROW_WIDTH = (ITEM_SIZE + SPACING) * topRowImages.length;

export const Slide3Products = () => {
  const translateXTop = useSharedValue(0);
  const translateXBottom = useSharedValue(-ROW_WIDTH); // Start offset for opposing direction

  React.useEffect(() => {
    // Top Row: Right to Left
    translateXTop.value = withRepeat(
      withTiming(-ROW_WIDTH, { duration: LOOP_DURATION, easing: Easing.linear }),
      -1, false
    );

    // Bottom Row: Left to Right
    translateXBottom.value = withRepeat(
      withTiming(0, { duration: LOOP_DURATION, easing: Easing.linear }),
      -1, false
    );
  }, []);

  const styleTop = useAnimatedStyle(() => ({ transform: [{ translateX: translateXTop.value }] }));
  const styleBottom = useAnimatedStyle(() => ({ transform: [{ translateX: translateXBottom.value }] }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.row, styleTop, { marginBottom: SPACING }]}>
        {topItems.map((img, i) => (
          <View key={`top-${i}`} style={styles.card}>
            <Image source={img} style={styles.image} />
          </View>
        ))}
      </Animated.View>
      
      <Animated.View style={[styles.row, styleBottom]}>
        {bottomItems.map((img, i) => (
          <View key={`bottom-${i}`} style={styles.card}>
            <Image source={img} style={styles.image} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: 300,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: SPACING / 2,
  },
  card: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    //borderRadius: 16,
    marginRight: SPACING,
    //backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});