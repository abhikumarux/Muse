const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#337357", // Dark Green Grid Base
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    secondaryText: "#888",
    accent: "#35e00aff",
    buttonBackground: "#D5FF60",
    // New properties for cards and chips
    card: "#f0e6d485",
    headerChip: "rgba(0, 0, 0, 0.05)",
    // SwipeButton properties
    buttonGradient: ["#bae542ff", "#5ff651ff"],
    swipeHandleBackground: "#2ec707ff",
    swipeHandleIcon: "#EEFFBE",
    // New Landing page properties
    landingGradient: ["#EEFFBE", "#D5FF60", "#C8FF2F"],
    // === New Login/Register Screen Properties (Light Mode) ===
    inputBackground: "#F0F0F0",
    inputBorder: "#E0E0E0",
    inputPlaceholder: "#AAAAAA",
    loginGradient: ["#EEFFBE", "#D5FF60", "#C8FF2F"], // Green gradient
    cardBackground: "rgba(255, 255, 255, 0.9)", // Semi-transparent white for frosted card
    // =======================================================
  },
  dark: {
    text: "#ECEDEE",
    background: "#00331D", // Darker Green Grid Base
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    secondaryText: "#aaa",
    accent: "#0BE880",
    buttonBackground: "#0BE880",
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
    // === New Login/Register Screen Properties (Dark Mode) ===
    inputBackground: "#333344", // Darker background for inputs
    inputBorder: "#555566",
    inputPlaceholder: "#888888",
    loginGradient: ["#012514", "#006837", "#23B659"], // Green gradient
    cardBackground: "rgba(0, 0, 0, 0.7)", // Semi-transparent dark for frosted card
    // =======================================================
  },
} as const;
