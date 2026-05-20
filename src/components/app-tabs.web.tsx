import type {
  TabListProps,
  TabTriggerSlotProps,
} from "expo-router/ui";
import {
  TabList,
  Tabs,
  TabSlot,
  TabTrigger,
} from "expo-router/ui";
import React from "react";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="(chats)" href={"/"} asChild>
            <TabButton>Chats</TabButton>
          </TabTrigger>
          <TabTrigger name="(settings)" href={"/settings"} asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButtonView, { backgroundColor: isFocused ? Colors.metallicMid : Colors.metallicLight, borderColor: isFocused ? '#007AFF' : Colors.metallicBorder }]}>
        <Text style={[styles.tabButtonText, { color: isFocused ? '#007AFF' : Colors.textSecondary }]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : scheme];

  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={[styles.innerContainer, { backgroundColor: colors.tabBarBackground, borderTopColor: colors.metallicBorder }]}>
        <Text style={[styles.brandText, { color: colors.text }]}>AI Chat</Text>
        <View style={styles.spacer} />
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: "absolute",
    width: "100%",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  innerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: 8,
    maxWidth: 800,
    borderTopWidth: 0.5,
  },
  brandText: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: -0.2,
    marginRight: "auto",
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 600,
  },
});
