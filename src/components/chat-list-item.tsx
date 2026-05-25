import React, { useRef } from 'react'
import {
  View,
  Text,
  Pressable,
  Animated,
  PanResponder,
  Alert,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@/hooks/use-theme'
import { Spacing, BorderRadius } from '@/constants/theme'

type ChatListItemProps = {
  title: string
  lastMessage: string
  timestamp: number
  modelName: string
  onPress: () => void
  onDelete?: () => void
  onRename?: () => void
}

function formatTime(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function ChatListItem({
  title,
  lastMessage,
  timestamp,
  modelName,
  onPress,
  onDelete,
  onRename,
}: ChatListItemProps) {
  const theme = useTheme()
  const translateX = useRef(new Animated.Value(0)).current
  const SWIPE_THRESHOLD = -Spacing.lg // -16

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Spacing.xs && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -Spacing['2xl'])) // -32
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < SWIPE_THRESHOLD) {
          // Snap to reveal delete
          Animated.spring(translateX, {
            toValue: -Spacing.lg, // -16
            useNativeDriver: true,
          }).start()
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start()
        }
      },
    }),
  ).current

  const handleDelete = () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      )
    }
    Alert.alert('Delete Chat', `Delete "${title}"?`, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resetSwipe(),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Animated.timing(translateX, {
            toValue: -Spacing['4xl'], // -48
            duration: Spacing.md * 10, // 120
            useNativeDriver: true,
          }).start(() => onDelete?.())
        },
      },
    ])
  }

  const resetSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start()
  }

  const shortName = modelName.split('/').pop() ?? modelName

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* Delete background */}
      {onDelete && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: Spacing.lg, // 16
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.danger,
          }}
        >
          <Pressable onPress={handleDelete} style={{ padding: Spacing.md }}>
            <Text style={{ color: '#fff', fontSize: Spacing.xs, fontWeight: 600 }}>
              Delete
            </Text>
          </Pressable>
        </View>
      )}

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...(onDelete ? panResponder.panHandlers : {})}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.md,
            backgroundColor: pressed
              ? theme.separator
              : 'transparent',
          })}
        >
          <View
            style={{
              width: Spacing.lg * 2.75, // 44
              height: Spacing.lg * 2.75, // 44
              borderRadius: BorderRadius.full,
              backgroundColor: theme.accent,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: Spacing.md,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: Spacing.lg, // 16
                fontWeight: 600,
              }}
            >
              {title.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: Spacing.lg, // 16
                  fontWeight: 600,
                  color: theme.text,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
              {onRename && (
                <Pressable
                  onPress={onRename}
                  hitSlop={Spacing.xs}
                  style={{
                    marginLeft: Spacing.xs,
                    padding: Spacing.xs,
                  }}
                >
                  <Text style={{ fontSize: Spacing.sm, color: theme.textSecondary }}>
                    ✎
                  </Text>
                </Pressable>
              )}
              <Text
                style={{
                  fontSize: Spacing.xs,
                  color: theme.textSecondary,
                  marginLeft: Spacing.xs,
                  fontVariant: ['tabular-nums'],
                }}
                numberOfLines={1}
              >
                {formatTime(timestamp)}
              </Text>
            </View>
            <Text
              style={{
                fontSize: Spacing.sm,
                color: theme.textSecondary,
                marginTop: Spacing.xs,
              }}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            <Text
              style={{
                fontSize: Spacing.xs,
                color: theme.textSecondary,
                marginTop: Spacing.xs,
                opacity: 0.6,
              }}
              numberOfLines={1}
            >
              {shortName}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  )
}