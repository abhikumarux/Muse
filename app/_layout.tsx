import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import Splash from "@/components/Splash";

// Prevent native splash auto hide
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [appReady, setAppReady] = useState(false);

  // Only hide native splash when everything is ready
  useEffect(() => {
    if (appReady && fontsLoaded) {
      requestAnimationFrame(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    }
  }, [appReady, fontsLoaded]);

  // Wait for fonts to load first, then render splash
  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#fdfbfb" }}>
      {/* Show custom animated splash until app is ready */}
      {!appReady && <Splash onFinish={() => setAppReady(true)} />}

      {/* Only render Router Stack once app is ready */}
      {appReady ? (
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="landing" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      ) : null}
    </GestureHandlerRootView>
  );
}
