import type { ConfigContext, ExpoConfig } from 'expo/config';

// Bundle id comes from .env.local so each developer can sign with their own Apple ID.
export default ({ config }: ConfigContext): ExpoConfig => {
  const bundleId = process.env.APP_BUNDLE_ID ?? 'com.example.claudemobile';
  return {
    ...(config as ExpoConfig),
    ios: { ...config.ios, bundleIdentifier: bundleId },
    android: { ...config.android, package: bundleId },
  };
};
