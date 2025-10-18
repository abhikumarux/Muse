import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { useRouter } from "expo-router";
import { runOnJS } from "react-native-reanimated";

// The component now takes the destination route as a prop
interface SplashProps {
  initialRoute: string;
}

export default function Splash({ initialRoute }: SplashProps) {
  const router = useRouter();
  const [hasTriggered, setHasTriggered] = useState(false);

  // This function will be called to navigate
  const startNavigation = () => {
    router.replace(initialRoute as any);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    // Exit if the video isn't ready or if we've already navigated
    if (!status.isLoaded || hasTriggered) {
      return;
    }

    const videoDuration = status.durationMillis ?? 0;
    // The fade animation is 400ms. Start navigating 500ms before the video ends.
    // This creates a 100ms overlap for a smooth cross-fade.
    const fadeStartTime = videoDuration - 916;

    // Trigger navigation when the video reaches the fade start time
    if (fadeStartTime > 0 && status.positionMillis >= fadeStartTime) {
      setHasTriggered(true); // Ensure this only runs once
      runOnJS(startNavigation)();
    }

    // Fallback: If the video finishes for any reason, navigate
    if (status.didJustFinish) {
      if (!hasTriggered) {
        setHasTriggered(true);
        runOnJS(startNavigation)();
      }
    }
  };

  return (
    <View style={styles.container}>
      <Video style={styles.video} source={require("../assets/videos/splash.mp4")} shouldPlay isMuted resizeMode={ResizeMode.COVER} onPlaybackStatusUpdate={onPlaybackStatusUpdate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  video: {
    width: "100%",
    height: "100%",
  },
});
