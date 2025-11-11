const tintColorLight = "#000000"; // Changed to black for minimal theme
const tintColorDark = "#FFFFFF"; // Changed to white for minimal theme

export const Colors = {
  light: {
    text: "#000000", // Black text
    background: "#FFFFFF", // White background
    loginBackground: "#F0F2F5", // A very light grey, almost white
    tint: tintColorLight,
    icon: "#000000",
    tabIconDefault: "#666666",
    tabIconSelected: tintColorLight,
    secondaryText: "#333333",
    accent: "#000000",
    subHeader: "#000000", // Black
    buttonBackground: "#000000", // Black button
    buttonText: "#FFFFFF", // White text on button
    activebar: "#E5E5E5",
    progressLine: "#000000",
    // Glassy properties
    card: "transparent",
    headerChip: "rgba(0, 0, 0, 0.05)",
    // SwipeButton properties
    buttonGradient: ["#222222", "#000000"],
    swipeHandleBackground: "#000000",
    swipeHandleIcon: "#FFFFFF",
    // New Landing page properties
    landingGradient: ["#EEEEEE", "#DDDDDD", "#FFFFFF"],
    // === Updated Login/Register Screen Properties (Light Mode) ===
    inputBackground: "rgba(0, 0, 0, 0.04)", // Very light glassy grey
    inputBorder: "rgba(0, 0, 0, 0.1)",
    inputPlaceholder: "#666666",
    loginGradient: ["#000000", "#000000"], // Solid black
    cardBackground: "rgba(255, 255, 255, 0.85)", // Glassy white
    // New Progress Bar Colors
    progressBarBackground: "#F0F0F0",
    progressBarActive: "#000000",
    progressBarTextActive: "#FFFFFF",
    progressBarTextDefault: "#000000",
    loadingAnimationBackground: "rgba(255, 255, 255, 0.7)",
    loaderBackground: "rgba(250, 250, 250, 0.9)",
    authGradient: ["#F7F7F7", "#E9E9E9", "#F0F2F5"], // New auth gradient
    forgotPasswordHeader: "#F7F7F7",
  },
  dark: {
    text: "#FFFFFF", // White text
    background: "#000000", // Black background
    loginBackground: "#000000", // Pure black
    tint: tintColorDark,
    icon: "#FFFFFF",
    tabIconDefault: "#999999",
    tabIconSelected: tintColorDark,
    secondaryText: "#AAAAAA",
    accent: "#FFFFFF",
    subHeader: "#FFFFFF", // White
    buttonBackground: "#FFFFFF", // White button
    buttonText: "#000000", // Black text on button
    activebar: "#1a1a1a",
    progressLine: "#FFFFFF",
    // Glassy properties
    card: "#1C1C1E",
    headerChip: "rgba(255, 255, 255, 0.1)",
    // SwipeButton properties
    buttonGradient: ["#DDDDDD", "#FFFFFF"],
    swipeHandleBackground: "#FFFFFF",
    swipeHandleIcon: "#000000",
    // New Landing page properties
    landingGradient: ["#333333", "#111111", "#000000"],
    headerBackground: "#000000",
    // === Updated Login/Register Screen Properties (Dark Mode) ===
    inputBackground: "rgba(255, 255, 255, 0.1)", // Light glassy white
    inputBorder: "rgba(255, 255, 255, 0.2)",
    inputPlaceholder: "#999999",
    loginGradient: ["#FFFFFF", "#FFFFFF"], // Solid white
    cardBackground: "rgba(20, 20, 20, 0.85)", // Glassy dark
    // New Progress Bar Colors
    progressBarBackground: "#444444",
    progressBarActive: "#FFFFFF",
    progressBarTextActive: "#000000",
    progressBarTextDefault: "#FFFFFF",
    loadingAnimationBackground: "rgba(0, 0, 0, 0.7)",
    loaderBackground: "rgba(28, 28, 30, 0.9)",
    authGradient: ["#151515ff", "#020202ff", "#050505ff"], // New auth gradient
    forgotPasswordHeader: "#151515ff",
  },
} as const;
