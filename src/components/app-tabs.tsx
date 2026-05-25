import { NativeTabs } from 'expo-router/unstable-native-tabs'
import React from 'react'
import { useColorScheme } from 'react-native'

import { Colors } from '@/constants/theme'

export default function AppTabs() {
  const scheme = useColorScheme()
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme]

  return (
    <NativeTabs
      backgroundColor={colors.background}
      labelStyle={{
        fontSize: 14,
        fontWeight: 600,
        color: colors.textSecondary,
        selected: { color: colors.accent },
      }}
    >
      <NativeTabs.Trigger name="(chats)">
        <NativeTabs.Trigger.Icon sf="message.fill" md="chat" />
        <NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(settings)">
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}