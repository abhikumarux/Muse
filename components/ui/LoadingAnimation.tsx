import React from "react";
import LottieView from "lottie-react-native";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";

interface LoadingAnimationProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function LoadingAnimation({ size = 100, style }: LoadingAnimationProps) {
  return (
    <View style={[styles.container, style, { width: size, height: size }]}>
      <LottieView source={require("@/assets/lottie/loader.json")} autoPlay loop style={styles.lottie} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
});
