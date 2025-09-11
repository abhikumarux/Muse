const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#FFF", // A slightly off-white for light mode
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    secondaryText: "#888",
    accent: "#2ec707ff",
    // New properties for cards and chips
    card: "#f0e6d485",
    headerChip: "rgba(0, 0, 0, 0.05)",
    // SwipeButton properties
    buttonGradient: ["#bae542ff", "#5ff651ff"],
    swipeHandleBackground: "#2ec707ff",
    swipeHandleIcon: "#EEFFBE",
    // New Landing page properties
    landingGradient: ["#EEFFBE", "#D5FF60", "#C8FF2F"],
  },
  dark: {
    text: "#ECEDEE",
    background: "#000000ff", // Dark green from the new design
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    secondaryText: "#aaa",
    accent: "#0BE880",
    // New properties for cards and chips
    card: "#1C1C1E",
    headerChip: "rgba(255, 255, 255, 0.1)",
    // SwipeButton properties
    buttonGradient: ["#012514", "#006837", "#23B659"],
    swipeHandleBackground: "#23B659",
    swipeHandleIcon: "#333333",
    // New Landing page properties
    landingGradient: ["#23B659", "#006837", "#01190E"],
    headerBackground: "#006837",
  },
} as const;
