import React from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LoadingAnimation } from "./LoadingAnimation";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface LoadingModalProps {
  visible: boolean;
  text?: string;
}

export function LoadingModal({ visible, text = "Loading..." }: LoadingModalProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={() => {}} // Required for Android
    >
      <BlurView intensity={20} tint={colorScheme} style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.loadingAnimationBackground, shadowColor: theme.text }]}>
          <LoadingAnimation size={80} />
          <Text style={[styles.text, { color: theme.text }]}>{text}</Text>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: 25,
    borderRadius: 16,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  text: { marginTop: 15, fontSize: 16, fontFamily: "Inter-ExtraBold" },
});
