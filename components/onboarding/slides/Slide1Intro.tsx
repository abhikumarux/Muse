import React from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import { MotiView } from "moti";

// Import images directly using the paths
const Muse1 = require("@/assets/images/onboarding/slide1/Muse1.png");
const Inspo1 = require("@/assets/images/onboarding/slide1/Inspo1.png");
const Product1 = require("@/assets/images/onboarding/slide1/Product1.png");

const Muse2 = require("@/assets/images/onboarding/slide1/Muse2.png");
const Inspo2 = require("@/assets/images/onboarding/slide1/Inspo2.png");
const Product2 = require("@/assets/images/onboarding/slide1/Product2.png");

const { width } = Dimensions.get("window");

// Adjusted size to ensure 3 fit nicely with spacing
const CARD_WIDTH = width * 0.25; 

// Adjust aspect ratio to match image cards approx (3:4)
const CARD_HEIGHT = CARD_WIDTH * 1.4;

export const Slide1Intro = () => {
  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 100, type: 'spring' }}
          style={{ transform: [{ rotate: '-8deg' }], zIndex: 1 }}
        >
          <Image source={Muse1} style={styles.card} />
        </MotiView>
        
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 200, type: 'spring' }}
          style={{ transform: [{ rotate: '6deg' }], marginTop: 15, zIndex: 2 }}
        >
          <Image source={Inspo1} style={styles.card} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 300, type: 'spring' }}
          style={{ transform: [{ rotate: '-8deg' }], zIndex: 1 }}
        >
          <Image source={Product1} style={styles.card} />
        </MotiView>
      </View>

      {/* Row 2 */}
      <View style={[styles.row, { marginTop: 10 }]}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 400, type: 'spring' }}
          style={{ transform: [{ rotate: '8deg' }], zIndex: 1 }}
        >
          <Image source={Muse2} style={styles.card} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 500, type: 'spring' }}
          style={{ transform: [{ rotate: '-6deg' }], marginTop: 15, zIndex: 2 }}
        >
          <Image source={Inspo2} style={styles.card} />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 600, type: 'spring' }}
          style={{ transform: [{ rotate: '8deg' }], zIndex: 1 }}
        >
          <Image source={Product2} style={styles.card} />
        </MotiView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,

    // Use contain to show full image without cropping
    resizeMode: 'contain', 
    
    // No background color to ensure transparent edges if image has rounded corners in PNG
  },
});