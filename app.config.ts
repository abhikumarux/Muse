import "dotenv/config";

export default {
  expo: {
    name: "Muse",
    slug: "muse",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/MuseLogo.png",
    scheme: "expomultiscreenapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      icon: "./assets/images/MuseLogo.png",
      bundleIdentifier: "art.usemuse.app",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    android: {
      icon: "./assets/images/MuseLogo.png",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "art.usemuse.app",
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
      "expo-web-browser",
      "expo-secure-store",
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
      REMOVE_BG_API_KEY: process.env.REMOVE_BG_API_KEY,
      "eas":{
        "projectId": "4724cafc-bafc-4e2a-9b8b-6f1ded6d1bd0"
      }
    },
  },
};
