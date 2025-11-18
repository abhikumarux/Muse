import React, { useState } from "react";
import { View, StyleSheet, Image, Dimensions, TouchableOpacity } from "react-native";
import { Photoshoot1, Photoshoot2, Photoshoot3, Photoshoot4 } from "@/assets/images/onboarding";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.65;
const CARD_HEIGHT = CARD_WIDTH * 1.25;

const images = [Photoshoot1, Photoshoot2, Photoshoot3, Photoshoot4];

// Define a clear type for the items
type PhotoshootItem = {
  img: any;
  id: number;
};

export const Slide5Photoshoot = () => {
  const [items, setItems] = useState<PhotoshootItem[]>(
    images.map((img, i) => ({ img, id: i }))
  );

  const handleShuffle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setItems((prev) => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      return [...rest, first];
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardStack}>
        {items.map((item, index) => {
          const isTop = index === 0;
          
          // 3D Stack effect logic
          const rotate = isTop ? '0deg' : index === 1 ? '5deg' : index === 2 ? '-5deg' : '2deg';
          const translateY = index * 8;
          const scale = 1 - index * 0.05;
          const opacity = 1 - index * 0.1;

          return (
            <MotiView
              key={item.id} // Key by ID to track the specific image element
              // layout prop removed to fix TypeScript error
              animate={{ translateY, rotate, scale, opacity }}
              transition={{ type: 'spring', damping: 15 }}
              style={[styles.cardContainer, { zIndex: items.length - index }]}
            >
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={isTop ? handleShuffle : undefined}
                disabled={!isTop}
              >
                <Image source={item.img} style={styles.card} />
                {isTop && (
                  <View style={styles.tapHint}>
                     <View style={styles.dot} />
                  </View>
                )}
              </TouchableOpacity>
            </MotiView>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: 400,
    justifyContent: "center",
    alignItems: "center",
  },
  cardStack: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardContainer: {
    position: 'absolute',
    top: 0,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    resizeMode: "cover",
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  tapHint: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 4,
  },
  dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#fff',
  }
});