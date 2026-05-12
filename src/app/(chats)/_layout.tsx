import { Stack } from 'expo-router/stack'
import React from 'react'
import { Platform, PlatformColor } from 'react-native'

export default function ChatsLayout() {
  const titleColor =
    Platform.OS === 'ios'
      ? PlatformColor('label')
      : Platform.OS === 'android'
        ? PlatformColor('?android:attr/textColorPrimary')
        : '#000000'

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { color: titleColor as any },
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerLargeTitle: true,
        headerBlurEffect: 'none',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Chats' }} />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: 'Chat',
          headerLargeTitle: false,
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'New Chat',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 0.85],
          contentStyle: { backgroundColor: 'transparent' },
          headerLargeTitle: false,
        }}
      />
    </Stack>
  )
}
