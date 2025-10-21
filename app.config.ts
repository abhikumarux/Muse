import "dotenv/config";

export default {
  expo: {
    name: "expo-multiscreen-app",
    slug: "expo-multiscreen-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "expomultiscreenapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.jake14turner.expo-multiscreen-app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.jake14turner.expomultiscreenapp",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-font",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      AWS_REGION: process.env.AWS_REGION,
      AWS_IDENTITY_POOL_ID: process.env.AWS_IDENTITY_POOL_ID,
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
      MUSE_REFERENCE_IMAGE_URL: process.env.MUSE_REFERENCE_IMAGE_URL,
    },
  },
};
