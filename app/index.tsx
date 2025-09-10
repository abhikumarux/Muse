import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LandingScreen from "./landing";
import LoginScreen from "./login";
import Splash from "@/components/Splash";

export default function Index() {
  const [initialScreen, setInitialScreen] = useState<"landing" | "login" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prepare = async () => {
      try {
        // DEV MODE: always show landing page
        setInitialScreen("landing");

        // ORIGINAL LOGIC (uncomment later for real behavior)
        /*
        const hasSeenLanding = await AsyncStorage.getItem("hasSeenLanding");
        setInitialScreen(hasSeenLanding === "true" ? "login" : "landing");
        */
      } catch {
        setInitialScreen("landing");
      }
    };
    prepare();
  }, []);

  if (loading || !initialScreen) {
    return <Splash onFinish={() => setLoading(false)} />;
  }

  if (initialScreen === "landing") return <LandingScreen />;
  if (initialScreen === "login") return <LoginScreen />;

  return null;
}
