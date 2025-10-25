import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { UserProvider } from "../lib/UserContext";
import { Colors } from "@/constants/Colors";

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack
             screenOptions={{
                headerStyle: { backgroundColor: theme.loginBackground },
                headerTintColor: theme.text,
                headerTitleStyle: { fontWeight: 'bold' },
                headerBackTitle: 'Back',
             }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="landing" options={{ headerShown: false, animation: "fade", animationDuration: 250 }} />
            <Stack.Screen name="login" options={{ headerShown: false, animation: "fade", animationDuration: 250 }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade", animationDuration: 250 }} />
            <Stack.Screen name="product-detail" options={{ presentation: "modal", headerShown: false }} />
            {}
            <Stack.Screen
              name="forgot-password"
              options={{
                title: 'Forgot Password',
                headerBackTitle: 'Back',
              }}
            />
            {}
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}