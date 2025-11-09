import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFonts, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { UserProvider } from "../lib/UserContext";
import { Colors } from "@/constants/Colors";
import { CreateDesignProvider } from "../lib/CreateDesignContext"; // 1. Import the new provider

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    "Inter-ExtraBold": Inter_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <CreateDesignProvider>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
              <Stack.Screen name="register" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade", animationDuration: 250 }} />
              <Stack.Screen name="product-detail" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="muses" options={{ presentation: "modal", headerShown: false }} />
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
                  title: "Forgot Password",
                  headerBackTitle: "Back",
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          </ThemeProvider>
        </CreateDesignProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
