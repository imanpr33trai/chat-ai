import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import React, { useEffect, useRef, useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View
} from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'

import type { ReplyTo } from '@/hooks/use-chat-store'
import { useTheme } from '@/hooks/use-theme'

// ─── Slash Commands ─────────────────────────────────────────────

type SlashCommand = {
  command: string
  label: string
  description: string
  insert: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  { command: 'code', label: '/code', description: 'Format as code', insert: '```\n\n```' },
  { command: 'bold', label: '/bold', description: 'Bold text', insert: '**text**' },
  { command: 'italic', label: '/italic', description: 'Italic text', insert: '*text*' },
  { command: 'list', label: '/list', description: 'Create a list', insert: '\n- ' },
  { command: 'image', label: '/image', description: 'Generate an image', insert: 'Generate an image of: ' },
]

// ─── Formatting Toolbar ──────────────────────────────────────────

type FormatButton = {
  label: string
  icon: string
  wrap: [string, string] // before, after
  block?: boolean
}

const FORMAT_BUTTONS: FormatButton[] = [
  { label: 'Bold', icon: 'B', wrap: ['**', '**'] },
  { label: 'Italic', icon: 'I', wrap: ['*', '*'], block: true },
  { label: 'Code', icon: '</>', wrap: ['`', '`'] },
]

// ─── Reply Preview ──────────────────────────────────────────────

function ReplyPreview({
  replyTo,
  onCancel,
}: {
  replyTo: ReplyTo
  onCancel: () => void
}) {
  const theme = useTheme()
  const preview = replyTo.content.length > 40
    ? replyTo.content.substring(0, 40) + '...'
    : replyTo.content

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.backgroundElement,
        borderTopWidth: 0.5,
        borderTopColor: theme.backgroundSelected,
      }}
    >
      <View
        style={{
          width: 2,
          height: 24,
          backgroundColor: '#007AFF',
          borderRadius: 1,
          marginRight: 10,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: 600 }}>
          Replying to {replyTo.role === 'user' ? 'you' : 'assistant'}
        </Text>
        <Text
          style={{ fontSize: 13, color: theme.textSecondary }}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
      <Pressable onPress={onCancel} hitSlop={8}>
        <Text style={{ fontSize: 18, color: theme.textSecondary }}>✕</Text>
      </Pressable>
    </Animated.View>
  )
}

// ─── Formatting Toolbar Component ───────────────────────────────

function FormatToolbar({
  onFormat,
}: {
  onFormat: (before: string, after: string) => void
}) {
  const theme = useTheme()

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition.springify()}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.backgroundElement,
        borderTopWidth: 0.5,
        borderTopColor: theme.backgroundSelected,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 12, color: theme.textSecondary, marginRight: 4 }}>
        Format:
      </Text>
      {FORMAT_BUTTONS.map((btn) => (
        <Pressable
          key={btn.label}
          onPress={() =>{  onFormat(btn.wrap[0], btn.wrap[1]); }}
          style={({ pressed }) => ({
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
            backgroundColor: pressed
              ? theme.backgroundSelected
              : theme.background,
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.text,
            }}
          >
            {btn.icon}
          </Text>
        </Pressable>
      ))}

      {/* Slash command hint */}
      <Pressable
        style={({ pressed }) => ({
          marginLeft: 'auto',
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 6,
          backgroundColor: pressed ? theme.backgroundSelected : theme.background,
        })}
      >
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>
          Type / for commands
        </Text>
      </Pressable>
    </Animated.View>
  )
}

// ─── Slash Command Picker ───────────────────────────────────────

function SlashCommandPicker({
  visible,
  onSelect,
  onClose,
  filter,
}: {
  visible: boolean
  onSelect: (insert: string) => void
  onClose: () => void
  filter: string
}) {
  const theme = useTheme()
  const filteredCommands = filter
    ? SLASH_COMMANDS.filter((cmd) =>
        cmd.command.toLowerCase().includes(filter.toLowerCase()) ||
        cmd.label.toLowerCase().includes(filter.toLowerCase())
      )
    : SLASH_COMMANDS

  if (filteredCommands.length === 0) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <View
          style={{
            position: 'absolute',
            bottom: 100,
            left: 12,
            right: 12,
            backgroundColor: theme.background === '#ffffff'
              ? 'rgba(255, 255, 255, 0.98)'
              : 'rgba(28, 28, 30, 0.98)',
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: theme.backgroundSelected,
            overflow: 'hidden',
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
              },
              android: { elevation: 8 },
            }),
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: theme.textSecondary,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            Commands
          </Text>
          {filteredCommands.map((cmd, idx) => (
            <Pressable
              key={cmd.command}
              onPress={() => {
                onSelect(cmd.insert)
                onClose()
              }}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: pressed ? theme.backgroundSelected : 'transparent',
                },
                idx < filteredCommands.length - 1 && {
                  borderTopWidth: 0.5,
                  borderTopColor: theme.backgroundSelected,
                },
              ]}
            >
              <Text style={{ fontSize: 15, fontWeight: 500, color: theme.text }}>
                {cmd.label}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                {cmd.description}
              </Text>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  )
}

// ─── Main Component ─────────────────────────────────────────────

type ChatInputProps = {
  onSend: (text: string, replyTo?: ReplyTo, images?: string[]) => void
  onStop?: () => void
  onSaveDraft?: (draft: string) => void
  initialDraft?: string
  replyTo?: ReplyTo
  onCancelReply?: () => void
  isStreaming?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  onStop,
  onSaveDraft,
  initialDraft = '',
  replyTo,
  onCancelReply,
  isStreaming,
  placeholder = 'Message',
}: ChatInputProps) {
  const [text, setText] = useState(initialDraft)
  const [showFormatToolbar, setShowFormatToolbar] = useState(false)
  const [showSlashPicker, setShowSlashPicker] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [images, setImages] = useState<string[]>([])
  const theme = useTheme()
  const inputRef = useRef<TextInput>(null)
  const slashStartIndex = useRef<number>(0)

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    })
    if (!result.canceled && result.assets[0]?.base64) {
      const uri = `data:${result.assets[0].mimeType ?? 'image/jpeg'};base64,${result.assets[0].base64}`
      setImages((prev) => [...prev, uri])
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Auto-save draft
  useEffect(() => {
    if (text && onSaveDraft) {
      const timer = setTimeout(() => {
        onSaveDraft(text)
      }, 500)
      return () =>{  clearTimeout(timer); }
    }
  }, [text, onSaveDraft])

  const handleTextChange = (newText: string) => {
    setText(newText)

    // Check for slash command
    const lastSlashIndex = newText.lastIndexOf('/')
    if (lastSlashIndex !== -1 && lastSlashIndex === newText.length - slashFilter.length - 1) {
      const potentialCommand = newText.slice(lastSlashIndex + 1)
      // Check if the character before / is whitespace or start
      const beforeSlash = newText[lastSlashIndex - 1]
      if (!beforeSlash || beforeSlash === ' ' || beforeSlash === '\n') {
        slashStartIndex.current = lastSlashIndex
        setSlashFilter(potentialCommand)
        setShowSlashPicker(true)
      }
    } else if (!newText.includes('/')) {
      setShowSlashPicker(false)
      setSlashFilter('')
    } else {
      // Update filter
      const currentSlashIndex = newText.lastIndexOf('/')
      if (currentSlashIndex !== -1) {
        setSlashFilter(newText.slice(currentSlashIndex + 1))
      }
    }
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }

    // Remove slash command if still present
    let finalText = trimmed
    if (trimmed.startsWith('/')) {
      const cmd = SLASH_COMMANDS.find((c) =>
        trimmed.toLowerCase().startsWith(`/${c.command}`)
      )
      if (cmd) {
        // For commands like /code, /image, insert the template
        finalText = cmd.insert
      }
    }

    onSend(finalText, replyTo, images.length > 0 ? images : undefined)
    setText('')
    setImages([])
    setShowSlashPicker(false)
    setSlashFilter('')
  }

  const handleFormat = (before: string, after: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    // Simple format insertion at cursor position
    // For a full implementation, we'd need cursor position tracking
    setText((prev) => prev + before + after)
  }

  const handleSlashSelect = (insert: string) => {
    const currentText = text
    const slashIndex = slashStartIndex.current
    const newText = currentText.slice(0, slashIndex) + insert
    setText(newText)
    setShowSlashPicker(false)
    setSlashFilter('')
    inputRef.current?.focus()
  }

  const canSend = text.trim().length > 0 && !isStreaming

  // Detect if user typed a slash at the start
  const hasSlashCommand = text.startsWith('/')
  const matchingCommand = hasSlashCommand
    ? SLASH_COMMANDS.find((cmd) =>
        text.toLowerCase().startsWith(`/${cmd.command}`)
      )
    : null

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Reply preview */}
      {replyTo && onCancelReply && (
        <ReplyPreview
          replyTo={replyTo}
          onCancel={onCancelReply}
        />
      )}

      {/* Slash command auto-complete preview */}
      {matchingCommand && (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 6,
            backgroundColor: theme.backgroundElement,
            borderTopWidth: 0.5,
            borderTopColor: theme.backgroundSelected,
          }}
        >
          <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: 500 }}>
            {matchingCommand.label}
          </Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 8 }}>
            {matchingCommand.description}
          </Text>
        </Animated.View>
      )}

      {/* Format toolbar toggle */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}
      >
        <Pressable
          onPress={() =>{  setShowFormatToolbar(!showFormatToolbar); }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 0.5,
          })}
        >
          <Text style={{ fontSize: 20 }}>Aa</Text>
        </Pressable>
      </View>

      {/* Format toolbar */}
      {showFormatToolbar && (
        <FormatToolbar onFormat={handleFormat} />
      )}

      {/* Main input area */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 0.5,
          borderTopColor: theme.backgroundSelected,
          backgroundColor: theme.background,
        }}
      >
        {/* Image previews row */}
        {images.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 4,
              paddingBottom: 4,
              gap: 4,
            }}
          >
            {images.map((uri, idx) => (
              <View key={idx} style={{ position: 'relative' }}>
                <Image
                  source={{ uri }}
                  style={{ width: 40, height: 40, borderRadius: 6 }}
                />
                <Pressable
                  onPress={() => removeImage(idx)}
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: '#FF453A',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {/* Text field */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: theme.backgroundElement,
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderCurve: 'continuous',
            marginRight: 8,
          }}
        >
          {/* Image picker button */}
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => ({
              marginRight: 6,
              marginBottom: 2,
              opacity: pressed ? 0.6 : 0.5,
            })}
          >
            <Text style={{ fontSize: 20 }}>📷</Text>
          </Pressable>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            multiline
            editable={!isStreaming}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 22,
              color: theme.text,
              maxHeight: 100,
              padding: 0,
            }}
          />
        </View>

        {/* Send / Stop button */}
        {isStreaming ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Pressable
              onPress={onStop}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#FF453A',
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: '#fff',
                }}
              />
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: canSend ? '#007AFF' : theme.backgroundSelected,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <Text
                style={{
                  color: canSend ? '#fff' : theme.textSecondary,
                  fontSize: 18,
                  lineHeight: 20,
                }}
              >
                ↑
              </Text>
            </Animated.View>
          </Pressable>
        )}
      </View>

      {/* Slash command picker */}
      <SlashCommandPicker
        visible={showSlashPicker}
        onSelect={handleSlashSelect}
        onClose={() => {
          setShowSlashPicker(false)
          setSlashFilter('')
        }}
        filter={slashFilter}
      />
    </KeyboardAvoidingView>
  )
}
