import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ReplyTo } from '@/hooks/use-chat-store';
import { useTheme } from '@/hooks/use-theme';

// ─── Slash Commands ──────────────────────────────────────

type SlashCommand = {
  command: string;
  label: string;
  description: string;
  insert: string;
};

const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/code', label: 'Code', description: 'Format as code', insert: '```\n\n```' },
  { command: '/bold', label: 'Bold', description: 'Bold text', insert: '**text**' },
  { command: '/italic', label: 'Italic', description: 'Italic text', insert: '*text*' },
  { command: '/list', label: 'List', description: 'Create a list', insert: '\n- ' },
  { command: '/image', label: 'Image', description: 'Generate an image', insert: 'Generate an image of: ' },
];

// ─── Formatting Toolbar ──────────────────────────────────

type FormatButton = {
  label: string;
  icon: string;
  wrap: [string, string];
  block?: boolean;
};

const FORMAT_BUTTONS: FormatButton[] = [
  { label: 'Bold', icon: 'B', wrap: ['**', '**'] },
  { label: 'Italic', icon: 'I', wrap: ['*', '*'], block: true },
  { label: 'Code', icon: '</>', wrap: ['`', '`'] },
];

// ─── Reply Preview ──────────────────────────────────────

function ReplyPreview({
  replyTo,
  onCancel,
}: {
  replyTo: ReplyTo;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const preview = replyTo.content.length > 40
    ? replyTo.content.substring(0, 40) + '...'
    : replyTo.content;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.metallicLight,
        borderTopWidth: 0.5,
        borderTopColor: theme.metallicBorder,
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
    </View>
  );
}

// ─── Format Toolbar ─────────────────────────────────────

function FormatToolbar({
  onFormat,
}: {
  onFormat: (before: string, after: string) => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.metallicLight,
        borderTopWidth: 0.5,
        borderTopColor: theme.metallicBorder,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 12, color: theme.textSecondary, marginRight: 4 }}>
        Format:
      </Text>
      {FORMAT_BUTTONS.map((btn) => (
        <Pressable
          key={btn.label}
          onPress={() => { onFormat(btn.wrap[0], btn.wrap[1]); }}
          style={({ pressed }) => ({
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
            backgroundColor: pressed
              ? theme.backgroundSelected
              : theme.metallicLight,
            borderWidth: 1,
            borderColor: theme.metallicBorder,
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
          backgroundColor: pressed ? theme.backgroundSelected : theme.metallicLight,
          borderWidth: 1,
          borderColor: theme.metallicBorder,
        })}
      >
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>
          Type / for commands
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Main ChatInput Component ─────────────────────────────

export default function ChatInput({
  text,
  onChangeText,
  onSend,
  onImageSelect,
  replyTo,
  onCancelReply,
  onFormat,
  onSaveDraft,
}: {
  text: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onImageSelect: (uri: string, base64: string) => void;
  replyTo?: ReplyTo;
  onCancelReply?: () => void;
  onFormat?: (before: string, after: string) => void;
  onSaveDraft?: (text: string) => void;
}) {
  const theme = useTheme();
  const [showSlash, setShowSlash] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const inputRef = useRef<TextInput>(null);

  // Auto-save draft
  useEffect(() => {
    if (text && onSaveDraft) {
      const timer = setTimeout(() => {
        onSaveDraft(text);
      }, 500);
      return () => { clearTimeout(timer); };
    }
  }, [text, onSaveDraft]);

  // Slash command detection
  useEffect(() => {
    if (text.startsWith('/')) {
      const query = text.toLowerCase();
      const filtered = SLASH_COMMANDS.filter(cmd =>
        cmd.command.includes(query) || cmd.label.toLowerCase().includes(query)
      );
      setShowSlash(filtered.length > 0);
      setFilteredCommands(filtered);
    } else {
      setShowSlash(false);
    }
  }, [text]);

  const handleSlashSelect = (cmd: SlashCommand) => {
    if (onChangeText) {
      onFormat?.(cmd.wrap[0], cmd.wrap[1]);
      onSaveDraft?.('');
    }
    setShowSlash(false);
  };

  const handleImagePick = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].base64) {
      onImageSelect(
        result.assets[0].uri,
        result.assets[0].base64
      );
    }
  };

  const handleSend = () => {
    if (text.trim()) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onSend();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ backgroundColor: theme.background }}
    >
      {/* Reply Preview */}
      {replyTo && onCancelReply && (
        <ReplyPreview replyTo={replyTo} onCancel={onCancelReply} />
      )}

      {/* Formatting Toolbar */}
      {onFormat && (
        <FormatToolbar onFormat={onFormat} />
      )}

      {/* Slash Command Suggestions */}
      {showSlash && (
        <View
          style={{
            backgroundColor: theme.metallicLight,
            borderTopWidth: 0.5,
            borderTopColor: theme.metallicBorder,
          }}
        >
          {filteredCommands.map((cmd) => (
            <Pressable
              key={cmd.command}
              onPress={() => handleSlashSelect(cmd)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: pressed
                  ? theme.backgroundSelected
                  : 'transparent',
                borderBottomWidth: 0.5,
                borderBottomColor: theme.metallicBorder,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginRight: 8 }}>
                {cmd.label}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                {cmd.description}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input Area */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: theme.metallicLight,
          borderTopWidth: 1,
          borderTopColor: theme.metallicBorder,
        }}
      >
        {/* Image Picker */}
        <Pressable
          onPress={handleImagePick}
          style={({ pressed }) => ({
            padding: 8,
            borderRadius: 8,
            backgroundColor: pressed
              ? theme.backgroundSelected
              : theme.metallicLight,
            marginRight: 4,
          })}
        >
          <Text style={{ fontSize: 20, color: theme.textSecondary }}>🖼️</Text>
        </Pressable>

        {/* Text Input */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.background,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.metallicBorder,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginRight: 4,
            minHeight: 40,
          }}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={onChangeText}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={{
              fontSize: 16,
              color: theme.text,
              minHeight: 20,
            }}
            onSubmitEditing={handleSend}
          />
        </View>

        {/* Send Button */}
        <Pressable
          onPress={handleSend}
          disabled={!text.trim()}
          style={({ pressed }) => ({
            padding: 10,
            borderRadius: 8,
            backgroundColor: text.trim()
              ? '#007AFF'
              : theme.metallicMid,
            opacity: text.trim() ? (pressed ? 0.8 : 1) : 0.5,
          })}
        >
          <Text style={{ fontSize: 18, color: text.trim() ? '#fff' : theme.textSecondary }}>
            ➤
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
