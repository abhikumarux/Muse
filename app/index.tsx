import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LandingScreen from "./landing";
import LoginScreen from "./login";
import Splash from "@/components/Splash";
import { UserProvider } from "./UserContext";

export default function Index() {
  const [initialScreen, setInitialScreen] = useState<"landing" | "login" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prepare = async () => {
      try {
        setInitialScreen("landing"); // DEV MODE
      } catch {
        setInitialScreen("landing");
      }
    };
    prepare();
  }, []);

  if (loading || !initialScreen) {
    return <Splash onFinish={() => setLoading(false)} />;
  }

  return (
    <UserProvider>
      {initialScreen === "landing" && <LandingScreen />}
      {initialScreen === "login" && <LoginScreen />}
    </UserProvider>
  );
}