import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { useChat } from '@/hooks/use-chat-store'
import { useTheme } from '@/hooks/use-theme'

type SearchResult = {
  conversationId: string
  conversationTitle: string
  messageId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: number
  matchStart: number
  matchEnd: number
}

export function ConversationSearch() {
  const theme = useTheme()
  const router = useRouter()
  const { state } = useChat()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const results = useMemo<SearchResult[]>(() => {
    if (query.trim().length < 2) return []

    const lowerQuery = query.toLowerCase()
    const searchResults: SearchResult[] = []

    state.conversations.forEach((conv) => {
      conv.messages.forEach((msg) => {
        const lowerContent = msg.content.toLowerCase()
        const matchIndex = lowerContent.indexOf(lowerQuery)
        if (matchIndex !== -1) {
          searchResults.push({
            conversationId: conv.id,
            conversationTitle: conv.title,
            messageId: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: msg.timestamp,
            matchStart: matchIndex,
            matchEnd: matchIndex + query.length,
          })
        }
      })
    })

    // Sort by timestamp, newest first
    return searchResults.sort((a, b) => b.timestamp - a.timestamp)
  }, [query, state.conversations])

  const highlightMatch = (content: string, matchStart: number, matchEnd: number) => {
    const before = content.slice(0, matchStart)
    const match = content.slice(matchStart, matchEnd)
    const after = content.slice(matchEnd)
    return { before, match, after }
  }

  const handleSelectResult = (result: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/chat/${result.conversationId}` as any)
  }

  const formatTime = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <>
      {/* Trigger button - could be added to a header */}
      <Pressable onPress={() => setIsOpen(true)}>
        <Text style={{ fontSize: 18, opacity: 0.6 }}>🔍</Text>
      </Pressable>

      {/* Search Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Header with search input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 0.5,
              borderBottomColor: theme.backgroundSelected,
            }}
          >
            <Pressable onPress={() => setIsOpen(false)} style={{ marginRight: 16 }}>
              <Text style={{ fontSize: 18, color: '#007AFF' }}>Cancel</Text>
            </Pressable>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.backgroundElement,
                borderRadius: 10,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontSize: 16, color: theme.textSecondary, marginRight: 8 }}>🔍</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search all conversations..."
                placeholderTextColor={theme.textSecondary}
                autoFocus
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: theme.text,
                  paddingVertical: 12,
                }}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')}>
                  <Text style={{ fontSize: 18, color: theme.textSecondary }}>✕</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Results */}
          <ScrollView style={{ flex: 1 }}>
            {query.trim().length < 2 && (
              <Text
                style={{
                  textAlign: 'center',
                  color: theme.textSecondary,
                  marginTop: 40,
                  fontSize: 15,
                }}
              >
                Type at least 2 characters to search
              </Text>
            )}

            {query.trim().length >= 2 && results.length === 0 && (
              <Text
                style={{
                  textAlign: 'center',
                  color: theme.textSecondary,
                  marginTop: 40,
                  fontSize: 15,
                }}
              >
                No messages found for "{query}"
              </Text>
            )}

            {results.length > 0 && (
              <View style={{ paddingTop: 8 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.textSecondary,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                >
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </Text>

                {results.map((result) => {
                  const { before, match, after } = highlightMatch(
                    result.content,
                    result.matchStart,
                    result.matchEnd
                  )

                  return (
                    <Pressable
                      key={`${result.conversationId}-${result.messageId}`}
                      onPress={() => handleSelectResult(result)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 0.5,
                        borderBottomColor: theme.backgroundSelected,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: 500 }}>
                          {result.conversationTitle}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 8 }}>
                          {formatTime(result.timestamp)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, marginRight: 6 }}>
                          {result.role === 'user' ? 'You:' : 'AI:'}
                        </Text>
                        <Text style={{ fontSize: 14, color: theme.text, flex: 1 }} numberOfLines={2}>
                          <Text>{before}</Text>
                          <Text style={{ backgroundColor: 'rgba(0, 122, 255, 0.3)' }}>{match}</Text>
                          <Text>{after}</Text>
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  )
}
