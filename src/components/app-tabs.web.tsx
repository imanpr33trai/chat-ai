import { Colors } from '@/constants/theme'
import type {
  TabListProps,
  TabTriggerSlotProps,
} from 'expo-router/ui'
import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
} from 'expo-router/ui'
import React from 'react'
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native'
import { Spacing, BorderRadius } from '@/constants/theme'

export default function AppTabs() {
  const scheme = useColorScheme()
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme]

  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="(chats)" href="/" asChild>
            <TabButton>Chats</TabButton>
          </TabTrigger>
          <TabTrigger name="(settings)" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  )
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const scheme = useColorScheme()
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme]

  return (
    <Pressable {...props} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <View
        style={{
          minWidth: 80,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.lg,
          borderRadius: BorderRadius.md,
          backgroundColor: isFocused ? colors.accentDimmed : 'transparent',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isFocused ? colors.accent : 'transparent',
        }}
      >
        <Text
          style={{
            fontSize: Spacing.md,
            fontWeight: 600,
            color: isFocused ? colors.accent : colors.textSecondary,
          }}
        >
          {children}
        </Text>
      </View>
    </Pressable>
  )
}

function CustomTabList({ children, ...props }: TabListProps) {
  const scheme = useColorScheme()
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme]

  return (
    <View
      {...props}
      style={{
        position: 'absolute',
        width: '100%',
        padding: Spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
      }}
    >
      <View
        style={{
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing['2xl'],
          borderRadius: BorderRadius.md,
          flexDirection: 'row',
          alignItems: 'center',
          flexGrow: 1,
          gap: Spacing.sm,
          maxWidth: 720,
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: colors.separator,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginRight: 'auto' }}>
          AI Chat
        </Text>
        {children}
      </View>
    </View>
  )
}