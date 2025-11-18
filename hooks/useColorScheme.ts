import { useContext } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

import { ThemePreferenceContext } from "@/lib/ThemePreferenceContext";

export function useColorScheme() {
  const ctx = useContext(ThemePreferenceContext);
  const systemScheme = useSystemColorScheme() ?? "light";

  if (!ctx) {
    return systemScheme;
  }

  if (ctx.preference === "system") {
    return systemScheme;
  }

  return ctx.colorScheme ?? systemScheme;
}
