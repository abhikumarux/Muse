import React from "react";
import { View, Text, Modal, StyleSheet, useColorScheme } from "react-native";
import LottieView from "lottie-react-native";
import { MotiView } from "moti";
import { Colors } from "@/constants/Colors";
import { StatusBar } from "expo-status-bar";
// DEFAULT loader here
import DefaultLoader from "@/assets/lottie/loader8.json";

// Define the types for the props
type LoadingModalProps = {
  visible: boolean;
  text: string;
  lottieSource?: any; // The custom lottie file
  lottieStyle?: any; // <-- This is the new prop for custom styles (like size)
};

export const LoadingModal = ({ visible, text, lottieSource, lottieStyle }: LoadingModalProps) => {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const styles = getStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <StatusBar style="auto" />
      <View style={styles.overlay}>
        <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "timing", duration: 300 }} style={styles.modalContent}>
          <LottieView
            // Use the prop, or fall back to the default
            source={lottieSource || DefaultLoader}
            autoPlay
            loop
            // Apply default styles, then override with custom styles
            style={[styles.lottieView, lottieStyle]}
          />
          <Text style={styles.loadingText}>{text}</Text>
        </MotiView>
      </View>
    </Modal>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: theme.loaderBackground,
      borderRadius: 20,
      padding: 24,
      alignItems: "center",
      width: "80%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
    },
    lottieView: {
      // These are the DEFAULTS
      width: 150,
      height: 150,
      marginBottom: 10,
    },
    loadingText: {
      fontSize: 16,
      color: theme.text,
      fontFamily: "Inter-ExtraBold",
      textAlign: "center",
    },
  });
