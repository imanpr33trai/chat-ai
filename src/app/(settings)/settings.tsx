import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useChat } from '@/hooks/use-chat-store';
import { useTheme } from '@/hooks/use-theme';
import { useModels } from '@/hooks/use-models';

function SettingsRow({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: theme.text }}>{title}</Text>
        {subtitle && (
          <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {right && <View style={{ marginLeft: 8 }}>{right}</View>}
      {onPress && (
        <Text style={{ fontSize: 16, color: theme.textSecondary, marginLeft: 8 }}>›</Text>
      )}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: theme.textSecondary,
        textTransform: 'uppercase',
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
        letterSpacing: 0.5,
      }}
    >
      {title}
    </Text>
  );
}

function ModelRadioItem({
  id,
  name,
  subtitle,
  isSelected,
  onPress,
}: {
  id: string;
  name: string;
  subtitle: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInUp.duration(300)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
        })}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: isSelected ? '#007AFF' : theme.textSecondary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          {isSelected && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#007AFF',
              }}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, color: theme.text }}>{name}</Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { state, setDefaultModel } = useChat();
  const { models, loading, error } = useModels();

  const sections = [
    {
      title: 'Models',
      data: [
        {
          key: 'model',
          render: () => {
            if (loading) {
              return (
                <View
                  style={{
                    padding: 24,
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                    Loading models...
                  </Text>
                </View>
              );
            }
            if (error) {
              return (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#FF453A', textAlign: 'center' }}>
                    {error}
                  </Text>
                </View>
              );
            }
            return (
              <View>
                {models.map((model) => {
                  const isSelected = state.defaultModel === model.id;
                  return (
                    <ModelRadioItem
                      key={model.id}
                      id={model.id}
                      name={model.name}
                      subtitle={`${model.provider} — ${model.description}`}
                      isSelected={isSelected}
                      onPress={() => setDefaultModel(model.id)}
                    />
                  );
                })}
              </View>
            );
          },
        },
      ],
    },
    {
      title: 'Appearance',
      data: [
        {
          key: 'theme',
          render: () => (
            <SettingsRow
              title="Auto"
              subtitle="Follows system appearance"
              right={
                <View
                  style={{
                    width: 50,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: '#34C759',
                    justifyContent: 'center',
                    paddingHorizontal: 3,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: '#fff',
                      alignSelf: 'flex-end',
                    }}
                  />
                </View>
              }
            />
          ),
        },
      ],
    },
    {
      title: 'About',
      data: [
        {
          key: 'version',
          render: () => (
            <SettingsRow title="Version" right={<Text style={{ color: theme.textSecondary }}>1.0.0</Text>} />
          ),
        },
        {
          key: 'models',
          render: () => (
            <SettingsRow
              title="Available Models"
              subtitle={`${models.length} models available`}
            />
          ),
        },
      ],
    },
  ];

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Stack.Screen.Title large>Settings</Stack.Screen.Title>

        {sections.map((section) => (
          <View key={section.title}>
            <SectionHeader title={section.title} />
            <View
              style={{
                backgroundColor: theme.backgroundElement,
                marginHorizontal: 16,
                borderRadius: 12,
                borderCurve: 'continuous',
                overflow: 'hidden',
              }}
            >
              {section.data.map((item) => (
                <View key={item.key}>{item.render()}</View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </>
  );
}
