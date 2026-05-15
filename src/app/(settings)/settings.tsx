import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useChat } from '@/hooks/use-chat-store';
import { useTheme } from '@/hooks/use-theme';
import { useModels } from '@/hooks/use-models';
import { writeModelCache, clearModelCache, mergeIntoCache, readModelCache } from '@/lib/model-cache';

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
  const { models, allModels, loading, error } = useModels();

  // Per-model verification state: modelId → 'idle' | 'verifying' | 'available' | 'unavailable' | 'timeout'
  const [verifyState, setVerifyState] = useState<Record<string, string>>({});
  // Elapsed time for currently verifying models
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval);
    };
  }, []);

  const verifyModel = useCallback(async (modelId: string) => {
    setVerifyState((prev) => ({ ...prev, [modelId]: 'verifying' }));
    setElapsed((prev) => ({ ...prev, [modelId]: 0 }));

    // Start elapsed timer
    const timer = setInterval(() => {
      setElapsed((prev) => ({ ...prev, [modelId]: (prev[modelId] ?? 0) + 1 }));
    }, 1000);
    timersRef.current[modelId] = timer;

    try {
      // 3-minute timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180_000);

      const res = await fetch('/api/models/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, timeout: 160_000 }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      const isAvailable = data.available === true;

      // Update cache
      mergeIntoCache({ [modelId]: isAvailable });

      setVerifyState((prev) => ({ ...prev, [modelId]: isAvailable ? 'available' : 'unavailable' }));
    } catch {
      // Timeout or network error → mark unavailable
      mergeIntoCache({ [modelId]: false });
      setVerifyState((prev) => ({ ...prev, [modelId]: 'timeout' }));
    } finally {
      clearInterval(timersRef.current[modelId]);
      delete timersRef.current[modelId];
    }
  }, []);

  const resetModel = useCallback((modelId: string) => {
    clearInterval(timersRef.current[modelId]);
    delete timersRef.current[modelId];
    // Remove from cache by writing without it
    const { [modelId]: _, ...rest } = readModelCache()?.models ?? {};
    writeModelCache(Object.fromEntries(Object.entries(rest).filter(([k]) => k !== modelId)));
    setVerifyState((prev) => ({ ...prev, [modelId]: 'idle' }));
    setElapsed((prev) => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
  }, []);

  // For the All Models section, merge cached availability into each model
  // Since allModels from useModels already includes cache, we just need to
  // override with verifyState when it's non-idle
  const getModelStatus = (modelId: string, cachedAvailable: boolean | null): string => {
    const vs = verifyState[modelId];
    if (vs && vs !== 'idle') return vs;
    if (cachedAvailable === true) return 'available';
    if (cachedAvailable === false) return 'unavailable';
    return 'idle';
  };

  const availableCount = (allModels ?? models).filter(
    (m) => getModelStatus(m.id, m.available) === 'available',
  ).length;
  const unavailableCount = (allModels ?? models).filter(
    (m) => getModelStatus(m.id, m.available) === 'unavailable',
  ).length;
  const idleCount = (allModels ?? models).filter(
    (m) => getModelStatus(m.id, m.available) === 'idle',
  ).length;

  const sections = [
    {
      title: 'Default Model',
      data: [
        {
          key: 'model',
          render: () => {
            if (loading) {
              return (
                <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
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
      title: `Models (${availableCount} ok, ${unavailableCount} bad, ${idleCount} unchecked)`,
      data: [
        {
          key: 'list',
          render: () => {
            const target = allModels ?? models;
            if (target.length === 0 && !loading) {
              return (
                <View style={{ padding: 16 }}>
                  <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                    No models loaded.
                  </Text>
                </View>
              );
            }
            return (
              <View>
                {target.map((model, idx) => {
                  const status = getModelStatus(model.id, model.available);
                  const isVerifying = status === 'verifying';
                  const elapsedSec = elapsed[model.id] ?? 0;

                  return (
                    <Animated.View key={model.id} entering={FadeInUp.delay(idx % 20 * 20).duration(200)}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                        }}
                      >
                        {/* Status dot */}
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            marginRight: 10,
                            backgroundColor:
                              status === 'available'
                                ? '#30D158'
                                : status === 'unavailable'
                                  ? '#FF453A'
                                  : isVerifying
                                    ? '#FF9F0A'
                                    : '#8E8E93',
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: theme.text }} numberOfLines={1}>
                            {model.name}
                          </Text>
                          <Text
                            style={{ fontSize: 11, color: theme.textSecondary }}
                            numberOfLines={1}
                          >
                            {model.id}
                          </Text>
                        </View>

                        {/* Status / Action button */}
                        {status === 'idle' && (
                          <Pressable
                            onPress={() => verifyModel(model.id)}
                            style={({ pressed }) => ({
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                            })}
                          >
                            <Text style={{ fontSize: 12, color: '#007AFF' }}>Verify</Text>
                          </Pressable>
                        )}
                        {isVerifying && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <ActivityIndicator size="small" color="#FF9F0A" />
                            <Text style={{ fontSize: 11, color: '#FF9F0A' }}>
                              {elapsedSec}s
                            </Text>
                          </View>
                        )}
                        {status === 'available' && (
                          <Pressable
                            onPress={() => resetModel(model.id)}
                            style={({ pressed }) => ({
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <Text style={{ fontSize: 12, color: '#30D158' }}>Available</Text>
                          </Pressable>
                        )}
                        {status === 'unavailable' && (
                          <Pressable
                            onPress={() => verifyModel(model.id)}
                            style={({ pressed }) => ({
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <Text style={{ fontSize: 12, color: '#FF453A' }}>Unavailable</Text>
                          </Pressable>
                        )}
                        {status === 'timeout' && (
                          <Pressable
                            onPress={() => verifyModel(model.id)}
                            style={({ pressed }) => ({
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 6,
                              opacity: pressed ? 0.6 : 1,
                            })}
                          >
                            <Text style={{ fontSize: 12, color: '#FF453A' }}>Timeout</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* Separator */}
                      {idx < target.length - 1 && (
                        <View
                          style={{
                            height: 0.5,
                            backgroundColor: theme.backgroundSelected,
                            marginLeft: 16,
                          }}
                        />
                      )}
                    </Animated.View>
                  );
                })}
                {loading && (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#007AFF" />
                  </View>
                )}
              </View>
            );
          },
        },
      ],
    },
    {
      title: 'Actions',
      data: [
        {
          key: 'validate_all',
          render: () => (
            <Pressable
              onPress={async () => {
                const target = allModels ?? models;
                for (const model of target) {
                  const status = getModelStatus(model.id, model.available);
                  if (status === 'idle' || status === 'timeout') {
                    await verifyModel(model.id);
                  }
                }
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, color: '#007AFF', fontWeight: 500 }}>
                Validate All Unchecked
              </Text>
            </Pressable>
          ),
        },
        {
          key: 'clear_cache',
          render: () => (
            <Pressable
              onPress={() => {
                clearModelCache();
                setVerifyState({});
                setElapsed({});
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, color: '#FF453A', fontWeight: 500 }}>
                Clear Validation Cache
              </Text>
            </Pressable>
          ),
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
