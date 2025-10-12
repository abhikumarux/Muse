import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import LandingScreen from "./landing";
import LoginScreen from "./login";
import Splash from "@/components/Splash";
import { getRememberedEmail } from "../lib/aws/auth";
import { getValidIdToken } from "../lib/aws/auth";

export default function Index() {
  // "routing" = deciding where to go; then either "landing" or "login"
  const [screen, setScreen] = useState<"routing" | "landing" | "login">("routing");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // 1) If we still have a valid session, go straight to the dashboard
      const token = await getValidIdToken();
      if (token) {
        router.replace("/(tabs)");
        return;
      }

      // 2) If user opted into Remember Me before, skip landing and show Login
      const remembered = await getRememberedEmail();
      if (remembered) {
        setScreen("login");
        return;
      }

      // 3) Otherwise show the marketing/landing screen
      setScreen("landing");
    })();
  }, [router]);

  if (screen === "routing") return <Splash onFinish={() => {}} />;

  if (screen === "login") return <LoginScreen />;
  return <LandingScreen />;
}