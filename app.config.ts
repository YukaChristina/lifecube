import type { ConfigContext, ExpoConfig } from "expo/config";

declare const process: {
  env: Record<string, string | undefined>;
};

type AppVariant = "development" | "preview" | "production";

const APP_VARIANTS = ["development", "preview", "production"] as const;
const EAS_PROJECT_ID = "4de40a06-a4d2-44ff-8c00-f7449c8f578d";
const PRODUCTION_APP_ID = "com.yukachristina.lifecube";

function getAppVariant(): AppVariant {
  const variant = process.env.APP_VARIANT ?? "development";

  if (APP_VARIANTS.includes(variant as AppVariant)) {
    return variant as AppVariant;
  }

  throw new Error(
    `Invalid APP_VARIANT: ${variant}. Expected one of: ${APP_VARIANTS.join(", ")}.`
  );
}

export default function defineConfig(_context: ConfigContext): ExpoConfig {
  const appVariant = getAppVariant();
  const isDevelopment = appVariant === "development";
  const appId = isDevelopment ? `${PRODUCTION_APP_ID}.dev` : PRODUCTION_APP_ID;
  const scheme = isDevelopment ? "lifecube-dev" : "lifecube";
  const icon = isDevelopment
    ? "./assets/images/icon-dev.png"
    : "./assets/images/icon.png";
  const adaptiveIconBackgroundColor = isDevelopment ? "#dbeafe" : "#f9efd7";

  return {
    name: isDevelopment ? "lifecube-dev" : "lifecube",
    slug: "lifecube",
    version: "1.0.0",
    orientation: "default",
    scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon,
    ios: {
      bundleIdentifier: appId,
      supportsTablet: true,
      infoPlist: {
        NSSpeechRecognitionUsageDescription:
          "Allow $(PRODUCT_NAME) to use speech recognition.",
        NSMicrophoneUsageDescription:
          "Allow $(PRODUCT_NAME) to use the microphone.",
        NSPhotoLibraryAddUsageDescription: "撮影した写真を保存するために使用します。",
        NSPhotoLibraryUsageDescription:
          "撮影した写真を閲覧・保存するために使用します。",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: appId,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      adaptiveIcon: {
        foregroundImage: icon,
        backgroundColor: adaptiveIconBackgroundColor,
      },
      permissions: ["android.permission.RECORD_AUDIO"],
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://lifecube.app",
        },
      ],
      [
        "react-native-vision-camera",
        {
          cameraPermissionText: "カメラを使用して写真・動画を記録します。",
          enableMicrophonePermission: false,
        },
      ],
      "expo-speech-recognition",
      [
        "expo-media-library",
        {
          photosPermission: "撮影した写真を閲覧・保存するために使用します。",
          savePhotosPermission: "撮影した写真を保存するために使用します。",
          isAccessMediaLocationEnabled: false,
        },
      ],
      "expo-sqlite",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      appVariant,
      appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? appVariant,
      router: {},
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
  };
}
