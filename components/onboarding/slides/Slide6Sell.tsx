import React from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import { Printful, Shopify, TikTokShop, Etsy, WordPress } from "@/assets/images/onboarding";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const LOGO_SIZE = 170;
const SPACING = 30;

const images = [Printful, Shopify, TikTokShop, Etsy, WordPress];
const items = [...images, ...images, ...images]; // Triplicate for smooth loop
const TOTAL_WIDTH = (LOGO_SIZE + SPACING) * images.length;

export const Slide6Sell = () => {
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-TOTAL_WIDTH, { duration: 10000, easing: Easing.linear }),
      -1, false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.row, animatedStyle]}>
        {items.map((img, i) => (
          <View key={i} style={styles.logoContainer}>
            <Image source={img} style={styles.logo} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: 200,
    justifyContent: 'center',
    overflow: 'hidden',
    //backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: 'center',
    paddingLeft: 20,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginRight: SPACING,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    // borderRadius: 20,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // elevation: 3,
  },
  logo: {
    width: '80%',
    height: '80%',
    resizeMode: 'contain',
  },
});