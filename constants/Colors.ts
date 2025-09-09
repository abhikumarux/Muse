//Below are the colors that are used in the app. The colors are defined in the light and dark mode.
const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    secondaryText: "#888",
    accent: "#2ec707ff",
    // SwipeButton properties
    buttonGradient: ["#bae542ff", "#5ff651ff"],
    swipeHandleBackground: "#2ec707ff",
    swipeHandleIcon: "#EEFFBE",
    // New Landing page properties
    landingGradient: ["#EEFFBE", "#D5FF60", "#C8FF2F"],
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    secondaryText: "#aaa",
    accent: "#0BE880",
    // SwipeButton properties
    buttonGradient: ["#012514", "#006837", "#23B659"],
    swipeHandleBackground: "#23B659",
    swipeHandleIcon: "#333333",
    // New Landing page properties
    landingGradient: ["#23B659", "#006837", "#01190E"],
  },
} as const;
