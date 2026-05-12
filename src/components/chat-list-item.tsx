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

type ChatListItemProps = {
  title: string
  lastMessage: string
  timestamp: number
  modelName: string
  onPress: () => void
  onDelete?: () => void
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
}: ChatListItemProps) {
  const theme = useTheme()
  const translateX = useRef(new Animated.Value(0)).current
  const SWIPE_THRESHOLD = -80

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -120))
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < SWIPE_THRESHOLD) {
          // Snap to reveal delete
          Animated.spring(translateX, {
            toValue: -80,
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }
    Alert.alert('Delete Chat', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel', onPress: () => resetSwipe() },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Animated.timing(translateX, {
            toValue: -400,
            duration: 200,
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
            width: 80,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#FF453A',
          }}
        >
          <Pressable onPress={handleDelete} style={{ padding: 16 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
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
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#007AFF',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>
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
                  fontSize: 16,
                  fontWeight: 600,
                  color: theme.text,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textSecondary,
                  marginLeft: 8,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatTime(timestamp)}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: theme.textSecondary,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: theme.textSecondary,
                marginTop: 2,
                opacity: 0.6,
              }}
            >
              {shortName}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  )
}
