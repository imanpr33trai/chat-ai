import { Stack } from "expo-router/stack";
import React from "react";
import { Platform, PlatformColor } from "react-native";

export default function SettingsLayout() {
  const titleColor =
    Platform.OS === "ios"
      ? PlatformColor("label")
      : Platform.OS === "android"
        ? PlatformColor("?android:attr/textColorPrimary")
        : "#000000";

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: { color: titleColor as any },
        headerLargeTitle: true,
        headerBlurEffect: "none",
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
