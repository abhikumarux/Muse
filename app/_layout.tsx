import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFonts, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { UserProvider } from "../lib/UserContext";
import { Colors } from "@/constants/Colors";
import { CreateDesignProvider } from "../lib/CreateDesignContext";
import React, { useMemo } from "react";

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "Inter-ExtraBold": Inter_800ExtraBold,
  });

  const navigationTheme = useMemo(() => {
    if (colorScheme === "dark") {
      return {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: Colors.dark.background,
          card: Colors.dark.cardBackground,
          text: Colors.dark.text,
          primary: Colors.dark.tint,
          border: Colors.dark.inputBorder,
        },
      };
    } else {
      return {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: Colors.light.background,
          card: Colors.light.cardBackground,
          text: Colors.light.text,
          primary: Colors.light.tint,
          border: Colors.light.inputBorder,
        },
      };
    }
  }, [colorScheme]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
    >
      <UserProvider>
        <CreateDesignProvider>
          <ThemeProvider value={navigationTheme}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.loginBackground },
                headerTintColor: theme.text,
                headerTitleStyle: { fontWeight: "bold" },
                headerBackTitle: "Back",
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="landing" options={{ headerShown: false, animation: "fade", animationDuration: 250 }} />
              <Stack.Screen name="login" options={{ headerShown: false, animation: "fade", animationDuration: 250 }} />
              <Stack.Screen name="register" options={{ headerShown: false, animation: "fade", animationDuration: 250 }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade", animationDuration: 250 }} />
              <Stack.Screen name="product-detail" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="muses" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="create-muse" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="saved-designs" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="saved-photoshoots" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="create-photoshoot" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="create/category-sublist" options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="create/products" options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="create/variants" options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="create/placements" options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="create/design" options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen name="create/view-final" options={{ headerShown: false, animation: "slide_from_right" }} />
              <Stack.Screen
                name="forgot-password"
                options={{
                  headerTitle: "",
                  headerShown: true,
                  headerStyle: {
                    backgroundColor: theme.forgotPasswordHeader,
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
          </ThemeProvider>
        </CreateDesignProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
