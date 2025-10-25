const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#ffffffff",
    loginBackground: "#33733eff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    secondaryText: "#888",
    accent: "#35e00aff",
    subHeader: "#D5FF60",
    buttonBackground: "#D5FF60",
    activebar: "#ccf0cbff",
    progressLine: "#29e668ff",
    // New properties for cards and chips
    card: "transparent",
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
    // New Progress Bar Colors
    progressBarBackground: "#F0F0F0", // Light grey for unfilled line/circle background
    progressBarActive: "#000000", // Black for active circle/filled line
    progressBarTextActive: "#FFFFFF", // White text on active circle
    progressBarTextDefault: "#000000", // Black text on default circle/label
    loadingAnimationBackground: "#ffffff6a", // White background for loading animation
  },
  dark: {
    text: "#ECEDEE",
    background: "#000000ff",
    loginBackground: "#00331D",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    secondaryText: "#aaa",
    accent: "#0BE880",
    subHeader: "#0BE880",
    buttonBackground: "#23B659",
    activebar: "#183b25ff",
    progressLine: "#29e668ff",
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
    loginGradient: ["#012514", "#006837", "#23B659"],
    cardBackground: "rgba(0, 0, 0, 0.7)", // Semi-transparent dark for frosted card
    // New Progress Bar Colors (In dark mode, we reverse the colors for contrast on the progress bar)
    progressBarBackground: "#444444", // Dark grey for unfilled line/circle background
    progressBarActive: "#FFFFFF", // White for active circle/filled line
    progressBarTextActive: "#000000", // Black text on active circle
    progressBarTextDefault: "#FFFFFF", // White text on default circle/label
    loadingAnimationBackground: "#0000006a", // White background for loading animation
  },
} as const;
