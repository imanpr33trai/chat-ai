import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '@/hooks/use-theme'
import { Spacing, BorderRadius } from '@/constants/theme'
import type { Reaction } from '@/hooks/use-chat-store'

type MessageAction = {
  label: string
  icon: string
  destructive?: boolean
  onPress: () => void
}

type Props = {
  visible: boolean
  onClose: () => void
  actions: MessageAction[]
  position?: { x: number; y: number }
}

export function MessageContextMenu({ visible, onClose, actions, position }: Props) {
  const theme = useTheme()

  const handleAction = (action: MessageAction) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onClose()
    action.onPress()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay }} onPress={onClose}>
        <View
          style={[
            {
              minWidth: 200,
              maxWidth: 280,
              borderRadius: BorderRadius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.separator,
              overflow: 'hidden',
              backgroundColor: theme.surface,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                },
                android: {
                  elevation: 8,
                },
              }),
            },
            position && { position: 'absolute', left: position.x, top: position.y },
          ]}
        >
          {actions.map((action, index) => (
            <Pressable
              key={action.label}
              onPress={() => handleAction(action)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  backgroundColor: pressed ? theme.separator : 'transparent',
                },
                index < actions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.separator,
                },
              ]}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  marginRight: Spacing.sm,
                }}
              >
                <Text style={{ fontSize: 20 }}>{action.icon}</Text>
              </View>
              <Text
                style={{
                  fontSize: Spacing.md,
                  color: action.destructive ? theme.danger : theme.text,
                  fontWeight: 500,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  )
}

// ─── Reaction Picker ────────────────────────────────────────────

type ReactionButton = {
  emoji: string
  reaction: Reaction
  label: string
}

const REACTIONS: ReactionButton[] = [
  { emoji: '👍', reaction: 'like', label: 'Like' },
  { emoji: '👎', reaction: 'dislike', label: 'Dislike' },
  { emoji: '❤️', reaction: 'heart', label: 'Love' },
  { emoji: '😂', reaction: 'laugh', label: 'Laugh' },
  { emoji: '⭐', reaction: 'star', label: 'Star' },
]

type ReactionPickerProps = {
  visible: boolean
  onClose: () => void
  onSelect: (reaction: Reaction) => void
  currentReactions?: Reaction[]
}

export function ReactionPicker({ visible, onClose, onSelect, currentReactions }: ReactionPickerProps) {
  const theme = useTheme()

  const handleSelect = (reaction: Reaction) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onSelect(reaction)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay }} onPress={onClose}>
        <View
          style={{
            flexDirection: 'row',
            borderRadius: BorderRadius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.separator,
            padding: Spacing.sm,
            backgroundColor: theme.surface,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
              },
              android: {
                elevation: 8,
              },
            }),
          }}
        >
          {REACTIONS.map((r) => (
            <Pressable
              key={r.reaction}
              onPress={() => handleSelect(r.reaction)}
              style={({ pressed }) => [
                {
                  width: 44,
                  height: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: BorderRadius.md,
                  backgroundColor: pressed
                    ? theme.separator
                    : 'transparent',
                },
                currentReactions?.includes(r.reaction) && {
                  backgroundColor: theme.accentDimmed,
                },
              ]}
            >
              <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  )
}