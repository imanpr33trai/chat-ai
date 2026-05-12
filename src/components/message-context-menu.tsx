import React from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'

import { useTheme } from '@/hooks/use-theme'
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
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.menu,
            {
              backgroundColor: theme.background === '#ffffff'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(28, 28, 30, 0.95)',
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          {actions.map((action, index) => (
            <Pressable
              key={action.label}
              onPress={() => handleAction(action)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: theme.backgroundSelected },
                index < actions.length - 1 && {
                  borderBottomWidth: 0.5,
                  borderBottomColor: theme.backgroundSelected,
                },
              ]}
            >
              <Text
                style={[
                  styles.menuIcon,
                  { color: action.destructive ? '#FF453A' : theme.text },
                ]}
              >
                {action.icon}
              </Text>
              <Text
                style={[
                  styles.menuLabel,
                  { color: action.destructive ? '#FF453A' : theme.text },
                ]}
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
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.reactionPicker,
            {
              backgroundColor: theme.background === '#ffffff'
                ? 'rgba(255, 255, 255, 0.95)'
                : 'rgba(28, 28, 30, 0.95)',
              borderColor: theme.backgroundSelected,
            },
          ]}
        >
          {REACTIONS.map((r) => (
            <Pressable
              key={r.reaction}
              onPress={() => handleSelect(r.reaction)}
              style={({ pressed }) => [
                styles.reactionButton,
                pressed && { backgroundColor: theme.backgroundSelected },
                currentReactions?.includes(r.reaction) && {
                  backgroundColor: theme.backgroundSelected,
                },
              ]}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    minWidth: 200,
    maxWidth: 280,
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  reactionPicker: {
    flexDirection: 'row',
    borderRadius: 24,
    borderWidth: 0.5,
    padding: 8,
    gap: 4,
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
  reactionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  reactionEmoji: {
    fontSize: 24,
  },
})
