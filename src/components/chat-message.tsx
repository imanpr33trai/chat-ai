import React, { memo, useMemo, useState, useCallback } from 'react'
import {
  Image,
  Platform,
  Pressable,
  Text,
  View
} from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated'

import type { Message, MessageStatus, Reaction } from '@/hooks/use-chat-store'
import { useTheme } from '@/hooks/use-theme'
import { MessageContextMenu, ReactionPicker } from './message-context-menu'

// ─── Status indicator ────────────────────────────────────────────

function StatusIcon({ status }: { status?: MessageStatus }) {
  const theme = useTheme()

  if (!status || status === 'delivered') return null

  const icons: Record<MessageStatus, string> = {
    sending: '○',
    sent: '✓',
    delivered: '✓✓',
    failed: '✗',
  }

  return (
    <Text
      style={{
        fontSize: 11,
        color: status === 'failed' ? '#FF453A' : theme.textSecondary,
        marginLeft: 4,
      }}
    >
      {icons[status]}
    </Text>
  )
}

// ─── Reaction display ────────────────────────────────────────────

const REACTION_EMOJIS: Record<Reaction, string> = {
  like: '👍',
  dislike: '👎',
  heart: '❤️',
  laugh: '😂',
  star: '⭐',
}

function ReactionDisplay({
  reactions,
  onPress,
}: {
  reactions?: Reaction[]
  onPress: () => void
}) {
  if (!reactions || reactions.length === 0) return null

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.06)',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          marginTop: 4,
        }}
      >
        {reactions.map((r) => (
          <Text key={r} style={{ fontSize: 14, marginRight: 2 }}>
            {REACTION_EMOJIS[r]}
          </Text>
        ))}
      </View>
    </Pressable>
  )
}

// ─── Reply indicator ─────────────────────────────────────────────

function ReplyIndicator({ content, role }: { content: string; role: 'user' | 'assistant' | 'system' }) {
  const theme = useTheme()
  const preview = content.length > 50 ? content.substring(0, 50) + '...' : content

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        paddingLeft: role === 'assistant' ? 0 : 0,
      }}
    >
      <View
        style={{
          width: 2,
          height: 16,
          backgroundColor: role === 'user' ? '#007AFF' : theme.textSecondary,
          borderRadius: 1,
          marginRight: 8,
        }}
      />
      <Text
        style={{
          fontSize: 13,
          color: theme.textSecondary,
          fontStyle: 'italic',
          flex: 1,
        }}
        numberOfLines={1}
      >
        {role === 'user' ? 'You: ' : ''}{preview}
      </Text>
    </View>
  )
}

// ─── Markdown types ────────────────────────────────────────────────

type Token =
  | { type: 'h1'; parts: TextPart[] }
  | { type: 'h2'; parts: TextPart[] }
  | { type: 'h3'; parts: TextPart[] }
  | { type: 'bullet_item'; parts: TextPart[] }
  | { type: 'ordered_item'; num: number; parts: TextPart[] }
  | { type: 'blockquote'; parts: TextPart[] }
  | { type: 'code_block'; lang?: string; code: string }
  | { type: 'paragraph'; parts: TextPart[] };

type TextPart =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }
  | { t: 'inlineCode'; v: string }
  | { t: 'link'; href: string; text: string };

// ─── Inline parser ──────────────────────────────────────────────────

function parseInline(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let i = 0;
  while (i < text.length) {
    // Link [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 1);
        if (closeParen !== -1) {
          parts.push({
            t: 'link',
            href: text.slice(closeBracket + 2, closeParen),
            text: text.slice(i + 1, closeBracket),
          });
          i = closeParen + 1;
          continue;
        }
      }
    }
    // inline code `…`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        parts.push({ t: 'inlineCode', v: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // bold **…**
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        parts.push({ t: 'bold', v: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    // italic *…*
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && text[end - 1] !== '*') {
        parts.push({ t: 'italic', v: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    // regular text
    let j = i;
    while (
      j < text.length && text[j] !== '`' &&
      !(text[j] === '*' && text[j + 1] === '*') &&
      !(text[j] === '*' && text[j + 1] !== '*') &&
      text[j] !== '['
    ) {
      j++;
    }
    if (j > i) {
      parts.push({ t: 'text', v: text.slice(i, j) });
      i = j;
    } else {
      i++;
    }
  }
  return parts;
}

// ─── Block parser ──────────────────────────────────────────────────

function parseBlocks(content: string): Token[] {
  const lines = content.split('\n');
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block ```...```
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      tokens.push({ type: 'code_block', lang, code: codeLines.join('\n') });
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      tokens.push({ type: 'h3', parts: parseInline(line.slice(4)) });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      tokens.push({ type: 'h2', parts: parseInline(line.slice(3)) });
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      tokens.push({ type: 'h1', parts: parseInline(line.slice(2)) });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      tokens.push({ type: 'blockquote', parts: parseInline(quoteLines.join(' ')) });
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      tokens.push({ type: 'bullet_item', parts: parseInline(items.join(' ')) });
      continue;
    }

// Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items: { num: number; parts: TextPart[] }[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        const match = lines[i].match(/^(\d+)\.\s(.*)$/)
        if (match) {
          items.push({ num: parseInt(match[1], 10), parts: parseInline(match[2]) })
        }
        i++
      }
      // Flatten all item parts into one block
      const allParts = items.flatMap(it => it.parts)
      const startNum = items[0]?.num ?? 1
      if (allParts.length > 0) {
        tokens.push({ type: 'ordered_item', num: startNum, parts: allParts })
      }
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length && lines[i].trim() !== '' &&
      !lines[i].startsWith('```') && !lines[i].startsWith('#') &&
      !lines[i].startsWith('>') && !lines[i].match(/^[-*]\s/) &&
      !lines[i].match(/^\d+\.\s/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      tokens.push({ type: 'paragraph', parts: parseInline(paraLines.join(' ')) });
    }
  }

  return tokens;
}

// ─── Inline text renderer ────────────────────────────────────────────

// Helper to render a single TextPart
function renderPart(p: TextPart, key: number, textColor: string): React.ReactNode {
  if (p.t === 'bold')
    {return <Text key={key} style={{ fontWeight: '700', color: textColor }}>{p.v ?? ''}</Text>}
  if (p.t === 'italic')
    {return <Text key={key} style={{ fontStyle: 'italic', color: textColor }}>{p.v ?? ''}</Text>}
  if (p.t === 'inlineCode')
    {return (
      <Text
        key={key}
        style={{
          fontFamily: 'ui-monospace',
          fontSize: 14,
          backgroundColor: 'rgba(128,128,128,0.15)',
          paddingHorizontal: 4,
          borderRadius: 3,
          color: textColor,
        }}
      >
        {p.v ?? ''}
      </Text>
    )}
  if (p.t === 'link')
    {return (
      <Text
        key={key}
        style={{ color: '#007AFF', textDecorationLine: 'underline' }}
      >
        {p.text ?? ''}
      </Text>
    )}
  return <Text key={key}>{p.v ?? ''}</Text>
}

function InlineText({ content, textColor, isStreaming }: { content: string; textColor: string; isStreaming?: boolean }) {
  if (isStreaming) {
    return (
      <Text style={{ color: textColor, fontSize: 16, lineHeight: 22 }}>
        {content}
      </Text>
    );
  }

  const parts = useMemo(() => parseInline(content), [content]);
  return (
    <Text style={{ color: textColor, fontSize: 16, lineHeight: 22 }}>
      {parts.map((p, i) => renderPart(p, i, textColor))}
    </Text>
  );
}

// ─── Code block renderer ─────────────────────────────────────────

function CodeBlock({ code }: { code: string }) {
  const theme = useTheme()
  const bg =
    theme.background === '#ffffff'
      ? 'rgba(0,0,0,0.06)'
      : 'rgba(255,255,255,0.08)'

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 8,
        borderCurve: 'continuous',
        padding: 12,
        marginVertical: 4,
      }}
    >
      <Text
        selectable
        style={{
          fontFamily: 'ui-monospace',
          fontSize: 13,
          lineHeight: 18,
          color: theme.text,
        }}
      >
        {code}
      </Text>
    </View>
  )
}

// ─── Main component ──────────────────────────────────────────────

type ChatMessageProps = {
  message: Message
  index: number
  isStreaming?: boolean
  onCopy?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onRegenerate?: () => void
  onRetry?: () => void
  onReply?: () => void
  onPin?: () => void
  onStar?: () => void
  onReaction?: (reaction: Reaction) => void
  onSearch?: () => void
  conversationId: string
}

// ─── Thinking bubble ─────────────────────────────────────────────

export function ThinkingBubble({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const theme = useTheme()
  const [collapsed, setCollapsed] = useState(true)

  // Clean up the thinking content (remove tags if any)
  const cleanContent = content
    .replace(/<[^>]*>/g, '') // Remove any remaining tags
    .trim()

  if (!cleanContent) return null

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={{
        marginBottom: 8,
        marginTop: collapsed ? 0 : 8,
      }}
    >
      <Pressable
        onPress={() =>{  setCollapsed(!collapsed); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: collapsed ? 0 : 6,
        }}
      >
        <Text style={{ fontSize: 12, color: '#FF9F0A', marginRight: 4 }}>
          💭
        </Text>
        <Text style={{ fontSize: 12, color: '#FF9F0A', fontWeight: 600 }}>
          Thinking
        </Text>
        <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 4 }}>
          {collapsed ? '▼' : '▲'}
        </Text>
      </Pressable>

      {!collapsed && (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={{
            backgroundColor: 'rgba(255, 159, 10, 0.1)',
            borderRadius: 12,
            borderCurve: 'continuous',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderLeftWidth: 3,
            borderLeftColor: '#FF9F0A',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: theme.textSecondary,
              lineHeight: 18,
            }}
          >
            {cleanContent}
            {isStreaming && (
              <Text style={{ opacity: 0.6 }}>|</Text>
            )}
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  )
}

export function ChatMessageInner({
  message,
  index,
  isStreaming,
  onCopy,
  onEdit,
  onDelete,
  onRegenerate,
  onRetry,
  onReply,
  onPin,
  onStar,
  onReaction,
  onSearch,
  conversationId,
}: ChatMessageProps) {
  const theme = useTheme()
  const isUser = message.role === 'user'
  const [showMenu, setShowMenu] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  // const pressTimer = useRef<NodeJS.Timeout | null>(null)

  const bubbleColor = isUser ? '#007AFF' : theme.backgroundElement
  const textColor = isUser ? '#fff' : theme.text
  const align = isUser ? 'flex-end' : 'flex-start'

  // Parse markdown into tokens for rich rendering
  const tokens = useMemo(() => {
    if (isStreaming) return [];
    return parseBlocks(message.content)
  }, [message.content, isStreaming])

  const handleLongPress = () => {
    if (Platform.OS === 'ios') {
      // Haptics would fire on press down, this is just the action
    }
    setShowMenu(true)
  }

  const menuActions = [
    ...(onCopy ? [{ label: 'Copy', icon: '📋', onPress: onCopy }] : []),
    ...(onSearch ? [{ label: 'Search', icon: '🔍', onPress: onSearch }] : []),
    ...(onReply ? [{ label: 'Reply', icon: '↩️', onPress: onReply }] : []),
    ...(onReaction ? [{ label: 'React', icon: '😊', onPress: () =>{  setShowReactions(true); } }] : []),
    ...(!isUser && onRegenerate ? [{ label: 'Regenerate', icon: '🔄', onPress: onRegenerate }] : []),
    ...(isUser && message.status === 'failed' && onRetry ? [{ label: 'Retry', icon: '🔁', onPress: onRetry }] : []),
    ...(isUser && onEdit ? [{ label: 'Edit', icon: '✏️', onPress: onEdit }] : []),
    ...(onPin ? [{ label: message.pinned ? 'Unpin' : 'Pin', icon: '📌', onPress: onPin }] : []),
    ...(onStar ? [{ label: message.starred ? 'Unstar' : 'Star', icon: message.starred ? '⭐' : '☆', onPress: onStar }] : []),
    ...(onDelete ? [{ label: 'Delete', icon: '🗑️', destructive: true, onPress: onDelete }] : []),
  ]

  return (
    <>
      <Animated.View
        entering={
          isStreaming
            ? FadeIn.duration(200)
            : FadeInDown.delay(Math.min(index * 30, 200))
                .duration(250)
                .springify()
        }
        style={{
          alignSelf: align,
          maxWidth: '82%',
          marginBottom: 10,
          marginLeft: isUser ? 48 : 0,
          marginRight: isUser ? 0 : 48,
        }}
      >
        {/* Pin indicator */}
        {message.pinned && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, alignSelf: align }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>📌 Pinned</Text>
          </View>
        )}

        {/* Star indicator */}
        {message.starred && (
          <View style={{ position: 'absolute', left: isUser ? -24 : -24, top: 8 }}>
            <Text style={{ fontSize: 14 }}>⭐</Text>
          </View>
        )}

        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={{}}
        >
          <View
            style={{
              backgroundColor: bubbleColor,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 18,
              borderBottomRightRadius: isUser ? 4 : 18,
              borderBottomLeftRadius: isUser ? 18 : 4,
              borderCurve: 'continuous',
              boxShadow: isUser
                ? '0 2px 6px rgba(0, 122, 255, 0.25)'
                : '0 1px 3px rgba(0, 0, 0, 0.06)',
            }}
          >
            {/* Reply indicator */}
            {message.replyTo && (
              <ReplyIndicator
                content={message.replyTo.content}
                role={message.replyTo.role}
              />
            )}

            {/* Thinking bubble for assistant messages */}
            {message.thinking ? (
              <ThinkingBubble content={message.thinking} isStreaming={isStreaming} />
            ) : null}

            {/* Attached images */}
            {message.images && message.images.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {message.images.map((uri, idx) => (
                  <Image
                    key={idx}
                    source={{ uri }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 12,
                      borderCurve: 'continuous',
                    }}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}

            {tokens.map((token, ti) => {
              // Render based on token type
              if (token.type === 'code_block') {
                return (
                  <CodeBlock key={ti} code={token.code} />
                )
              }

              // Render heading
              if (token.type === 'h1') {
                return (
                  <Text key={ti} style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: textColor,
                    marginTop: 8,
                    marginBottom: 4,
                  }}>
                    {token.parts.map((p, pi) => renderPart(p, pi, textColor))}
                  </Text>
                )
              }
              if (token.type === 'h2') {
                return (
                  <Text key={ti} style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: textColor,
                    marginTop: 6,
                    marginBottom: 3,
                  }}>
                    {token.parts.map((p, pi) => renderPart(p, pi, textColor))}
                  </Text>
                )
              }
              if (token.type === 'h3') {
                return (
                  <Text key={ti} style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: textColor,
                    marginTop: 4,
                    marginBottom: 2,
                  }}>
                    {token.parts.map((p, pi) => renderPart(p, pi, textColor))}
                  </Text>
                )
              }

              // Render blockquote
              if (token.type === 'blockquote') {
                return (
                  <View key={ti} style={{
                    borderLeftWidth: 3,
                    borderLeftColor: textColor === '#fff' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
                    paddingLeft: 10,
                    marginVertical: 4,
                    opacity: 0.8,
                  }}>
                    <Text style={{ fontSize: 16, fontStyle: 'italic', color: textColor }}>
                      {token.parts.map((p, pi) => renderPart(p, pi, textColor))}
                    </Text>
                  </View>
                )
              }

              // Render list item
              if (token.type === 'bullet_item') {
                return (
                  <View key={ti} style={{ flexDirection: 'row', marginVertical: 2 }}>
                    <Text style={{ color: textColor, marginRight: 8 }}>•</Text>
                    <Text style={{ flex: 1, fontSize: 16, lineHeight: 22, color: textColor }}>
                      {token.parts.map((p, pi) => renderPart(p, pi, textColor))}
                    </Text>
                  </View>
                )
              }

              if (token.type === 'ordered_item') {
                return (
                  <View key={ti} style={{ flexDirection: 'row', marginVertical: 2 }}>
                    <Text style={{ color: textColor, marginRight: 8 }}>{token.num}.</Text>
                    <Text style={{ flex: 1, fontSize: 16, lineHeight: 22, color: textColor }}>
                      {token.parts.map((p, pi) => renderPart(p, pi, textColor))}
                    </Text>
                  </View>
                )
              }

              // Default: paragraph
              return (
                <Text key={ti} style={{ fontSize: 16, lineHeight: 22, color: textColor, marginBottom: 6 }}>
                  {token.parts.map((p, pi) => renderPart(p, pi, textColor))}
                </Text>
              )
            })}

            {isStreaming && (
              <View
                style={{
                  width: 6,
                  height: 16,
                  backgroundColor: textColor,
                  borderRadius: 1,
                  opacity: 0.6,
                  marginTop: 2,
                }}
              />
            )}

            {/* Token usage indicator */}
            {message.usage && !isStreaming && (
              <View style={{ flexDirection: 'row', marginTop: 4, gap: 8 }}>
                {message.usage.prompt_tokens !== undefined && (
                  <Text style={{ fontSize: 10, color: theme.textSecondary, opacity: 0.5 }}>
                    ↑{message.usage.prompt_tokens}
                  </Text>
                )}
                {message.usage.completion_tokens !== undefined && (
                  <Text style={{ fontSize: 10, color: theme.textSecondary, opacity: 0.5 }}>
                    ↓{message.usage.completion_tokens}
                  </Text>
                )}
                {message.usage.total_tokens !== undefined && (
                  <Text style={{ fontSize: 10, color: theme.textSecondary, opacity: 0.5 }}>
                    Σ{message.usage.total_tokens}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Status indicator for user messages */}
          {isUser && <StatusIcon status={message.status} />}
        </Pressable>

        {/* Reactions */}
        {!isUser && message.reactions && message.reactions.length > 0 && (
          <ReactionDisplay
            reactions={message.reactions}
            onPress={() =>{  setShowReactions(true); }}
          />
        )}

        {/* Copy button for assistant messages */}
        {!isUser && !!message.content && !isStreaming && onCopy && (
          <Pressable
            onPress={onCopy}
            hitSlop={8}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              marginTop: 3,
              marginLeft: 4,
              opacity: pressed ? 0.5 : 0.4,
              paddingVertical: 2,
              paddingHorizontal: 6,
              borderRadius: 4,
            })}
          >
            <Text
              style={{
                fontSize: 11,
                color: theme.textSecondary,
                fontWeight: 500,
              }}
            >
              Copy
            </Text>
          </Pressable>
        )}
      </Animated.View>

      <MessageContextMenu
        visible={showMenu}
        onClose={() =>{  setShowMenu(false); }}
        actions={menuActions}
      />

      <ReactionPicker
        visible={showReactions}
        onClose={() =>{  setShowReactions(false); }}
        onSelect={onReaction || (() => {})}
        currentReactions={message.reactions}
      />
    </>
  )
}

// Wrap with memo to prevent unnecessary re-renders
export const ChatMessage = memo(ChatMessageInner, (prevProps, nextProps) => {
  // Re-render only if these specific props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.thinking === nextProps.message.thinking &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.conversationId === nextProps.conversationId
  )
})
