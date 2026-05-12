import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, ActivityIndicator } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useChat } from "@/hooks/use-chat-store";
import { useTheme } from "@/hooks/use-theme";
import { useModels } from "@/hooks/use-models";

export default function NewChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { createChat, sendMessage, state } = useChat();
  const [selectedModel, setSelectedModel] = useState(state.defaultModel);
  const [message, setMessage] = useState("");
  const { models, loading, error } = useModels();

  const handleStart = () => {
    const model = models.find((m) => m.id === selectedModel);
    const title = message.trim()
      ? message.trim().substring(0, 40) + (message.length > 40 ? "..." : "")
      : `Chat with ${model?.name ?? selectedModel}`;

    const id = createChat(title, selectedModel);
    if (message.trim()) {
      sendMessage(id, message.trim());
    }
    router.replace(`/chat/${id}` as any);
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      >
        <Stack.Screen options={{ title: "New Chat" }} />

        <Text
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: theme.text,
            marginTop: 24,
            marginBottom: 4,
          }}
        >
          Choose a model
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: theme.textSecondary,
            marginBottom: 20,
          }}
        >
          Select the AI model for this conversation
        </Text>

        {loading && (
          <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>
              Loading models...
            </Text>
          </View>
        )}

        {error && (
          <View style={{ padding: 16, alignItems: "center" }}>
            <Text style={{ fontSize: 14, color: "#FF453A", textAlign: "center" }}>
              {error}
            </Text>
          </View>
        )}

        {!loading && !error && models.map((model, idx) => {
          const isSelected = selectedModel === model.id;
          return (
            <Animated.View key={model.id} entering={FadeInUp.delay(idx * 50).duration(300)}>
              <Pressable
                onPress={() => setSelectedModel(model.id)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: isSelected ? theme.backgroundSelected : theme.backgroundElement,
                  marginBottom: 8,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected ? "#007AFF" : theme.textSecondary,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  {isSelected && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "#007AFF",
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: theme.text,
                      }}
                    >
                      {model.name}
                    </Text>
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: theme.backgroundSelected,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: theme.textSecondary,
                        }}
                      >
                        {model.provider}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {model.description}
                  </Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        <Text
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: theme.text,
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Optional: start with a message
        </Text>
        <View
          style={{
            backgroundColor: theme.backgroundElement,
            borderRadius: 12,
            borderCurve: "continuous",
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type your first message..."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={{
              fontSize: 16,
              lineHeight: 22,
              color: theme.text,
              maxHeight: 120,
              padding: 0,
            }}
          />
        </View>

        <Pressable
          onPress={handleStart}
          style={({ pressed }) => ({
            backgroundColor: "#007AFF",
            paddingVertical: 14,
            borderRadius: 12,
            borderCurve: "continuous",
            alignItems: "center",
            marginTop: 24,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: 600 }}>Start Conversation</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
