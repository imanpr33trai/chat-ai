import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
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
      <View style={[styles.tabButtonView, { backgroundColor: isFocused ? "#007AFF" : "#E0E1E6" }]}>
        <Text style={[styles.tabButtonText, { color: isFocused ? "#fff" : "#60646C" }]}>
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
      <View style={[styles.innerContainer, { backgroundColor: colors.backgroundElement }]}>
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
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    gap: 8,
    maxWidth: 800,
  },
  brandText: {
    fontSize: 14,
    fontWeight: 700,
    marginRight: "auto",
  },
  spacer: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: 600,
  },
});
