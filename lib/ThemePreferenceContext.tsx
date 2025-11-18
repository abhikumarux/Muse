import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useSystemColorScheme } from "react-native";

type ThemePreference = "system" | "light" | "dark";
type ThemeContextValue = {
  colorScheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = "muse.themePreference";

const defaultContext: ThemeContextValue = {
  colorScheme: "light",
  preference: "system",
  setPreference: () => {},
};

const ThemePreferenceContext = createContext<ThemeContextValue>(defaultContext);

export const ThemePreferenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      } catch (error) {
        console.warn("Failed to load theme preference", error);
      }
    })();
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(STORAGE_KEY, value).catch((error) => console.warn("Failed to save theme preference", error));
  }, []);

  const colorScheme = preference === "system" ? systemScheme : preference;

  const value = useMemo(
    () => ({
      colorScheme,
      preference,
      setPreference,
    }),
    [colorScheme, preference, setPreference]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
};

export const useThemePreference = () => useContext(ThemePreferenceContext);

export { ThemePreferenceContext };
