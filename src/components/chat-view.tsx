import * as Clipboard from "expo-clipboard";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ChatInput from "@/components/chat-input";
import { ChatMessage, ThinkingBubble } from "@/components/chat-message";
import { TypingIndicator } from "@/components/typing-indicator";
import type { Reaction, ReplyTo } from "@/hooks/use-chat-store";
import { useChat } from "@/hooks/use-chat-store";
import { useModels } from "@/hooks/use-models";
import { useTheme } from "@/hooks/use-theme";

// ─── Edit Modal ─────────────────────────────────────────────────

function EditMessageModal({
  visible,
  onClose,
  onSave,
  initialContent,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (newContent: string) => void;
  initialContent: string;
}) {
  const theme = useTheme();
  const [text, setText] = useState(initialContent);

  useEffect(() => {
    if (visible) setText(initialContent);
  }, [visible, initialContent]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: theme.background,
            borderRadius: 16,
            padding: 20,
            width: "90%",
            maxWidth: 400,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 600, color: theme.text, marginBottom: 16 }}>
            Edit Message
          </Text>
          <View
            style={{
              backgroundColor: theme.backgroundElement,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              style={{
                fontSize: 16,
                color: theme.text,
                maxHeight: 150,
                padding: 0,
              }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
            <Pressable onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 16 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={{
                backgroundColor: "#007AFF",
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Search Modal ───────────────────────────────────────────────

function SearchModal({
  visible,
  onClose,
  onSearch,
  messages,
}: {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  messages: { id: string; content: string; role: string }[];
}) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; content: string; role: string; index: number }[]
  >([]);

  useEffect(() => {
    if (query.trim().length > 1) {
      const lowerQuery = query.toLowerCase();
      const found = messages
        .map((msg, index) => ({ ...msg, index }))
        .filter((msg) => msg.content.toLowerCase().includes(lowerQuery));
      setResults(found);
    } else {
      setResults([]);
    }
  }, [query, messages]);

  const handleSelect = (msgId: string) => {
    onSearch(query);
    onClose();
    // In a real implementation, we'd scroll to the message
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: theme.backgroundSelected,
          }}
        >
          <Pressable onPress={onClose} style={{ marginRight: 16 }}>
            <Text style={{ fontSize: 18, color: "#007AFF" }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: 600, color: theme.text }}>Search Messages</Text>
        </View>

        {/* Search input */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            margin: 16,
            backgroundColor: theme.backgroundElement,
            borderRadius: 10,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: theme.textSecondary, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search in conversation..."
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
            <Pressable onPress={() => setQuery("")}>
              <Text style={{ fontSize: 18, color: theme.textSecondary }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Results */}
        <ScrollView style={{ flex: 1 }}>
          {results.length === 0 && query.length > 1 && (
            <Text style={{ textAlign: "center", color: theme.textSecondary, marginTop: 40 }}>
              No messages found
            </Text>
          )}
          {results.map((result) => (
            <Pressable
              key={result.id}
              onPress={() => handleSelect(result.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 0.5,
                borderBottomColor: theme.backgroundSelected,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: "#007AFF", fontWeight: 500 }}>
                  {result.role === "user" ? "You" : "Assistant"}
                </Text>
              </View>
              <Text style={{ fontSize: 14, color: theme.text }} numberOfLines={2}>
                {result.content}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Model Picker Sheet ─────────────────────────────────────────

function ModelPickerSheet({
  visible,
  onClose,
  currentModel,
  onSelect,
}: {
  visible: boolean
  onClose: () => void
  currentModel: string
  onSelect: (modelId: string) => void
}) {
  const theme = useTheme()
  const { models, loading, error } = useModels()
  const [search, setSearch] = useState('')

  const filtered = models.filter(
    (m) =>
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase()),
  )

  // Group by provider
  const groups: Record<string, typeof models> = {}
  for (const m of filtered) {
    const key = m.provider
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: theme.backgroundSelected,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ fontSize: 17, color: '#007AFF' }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>
            Switch Model
          </Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            margin: 12,
            backgroundColor: theme.backgroundElement,
            borderRadius: 10,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: theme.textSecondary, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search models..."
            placeholderTextColor={theme.textSecondary}
            style={{ flex: 1, fontSize: 16, color: theme.text, paddingVertical: 10 }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text style={{ fontSize: 16, color: theme.textSecondary }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Model list */}
        <ScrollView style={{ flex: 1 }}>
          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={{ marginTop: 12, color: theme.textSecondary }}>Loading models...</Text>
            </View>
          )}

          {error && (
            <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
              <Text style={{ color: '#FF453A', textAlign: 'center' }}>Failed to load models</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 8 }}>
                {error}
              </Text>
            </View>
          )}

          {!loading && !error &&
            Object.entries(groups).map(([provider, groupModels]) => (
              <View key={provider}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: theme.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 6,
                  }}
                >
                  {provider}
                </Text>
                {groupModels.map((model) => {
                  const isSelected = model.id === currentModel
                  return (
                    <Pressable
                      key={model.id}
                      onPress={() => {
                        onSelect(model.id)
                        onClose()
                      }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor:
                          isSelected ? theme.backgroundSelected : pressed ? theme.backgroundElement : 'transparent',
                        borderBottomWidth: 0.5,
                        borderBottomColor: theme.backgroundSelected,
                      })}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: isSelected ? '#007AFF' : theme.textSecondary,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}
                      >
                        {isSelected && (
                          <View
                            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF' }}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 15, fontWeight: '500', color: theme.text }}>
                            {model.name}
                          </Text>
                        </View>
                        <Text
                          style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {model.id}
                        </Text>
                      </View>
                      {isSelected && (
                        <Text style={{ fontSize: 14, color: '#007AFF' }}>✓</Text>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            ))}

          {!loading && !error && filtered.length === 0 && (
            <Text
              style={{
                textAlign: 'center',
                color: theme.textSecondary,
                marginTop: 40,
                fontSize: 15,
              }}
            >
              No models match "{search}"
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Date Separator ─────────────────────────────────────────────

function DateSeparator({ date }: { date: Date }) {
  const theme = useTheme();
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  let label: string;
  if (isToday) label = "Today";
  else if (isYesterday) label = "Yesterday";
  else {
    label = date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ flex: 1, height: 0.5, backgroundColor: theme.backgroundSelected }} />
      <Text
        style={{
          fontSize: 12,
          color: theme.textSecondary,
          paddingHorizontal: 12,
          fontWeight: 500,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, height: 0.5, backgroundColor: theme.backgroundSelected }} />
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function ChatView({ id }: { id: string }) {
  const {
    getConversation,
    sendMessage,
    cancelStream,
    streaming,
    isStreaming,
    drafts,
    saveDraft,
    clearDraft,
    deleteMessage,
    editMessage,
    retryMessage,
    regenerateLastAssistant,
    toggleReaction,
    togglePin,
    toggleStar,
    changeModel,
  } = useChat();

  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [replyTo, setReplyTo] = useState<ReplyTo | undefined>();
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(
    null,
  );
  const [showSearch, setShowSearch] = useState(false);
  const [, setShowSearchResults] = useState(false);
  const [, setSearchQuery] = useState('');
  const [showModelSheet, setShowModelSheet] = useState(false);
  // Message search within conversation
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgMatchIndices, setMsgMatchIndices] = useState<number[]>([]);
  const [currentMsgMatch, setCurrentMsgMatch] = useState(0);
  const msgSearchRef = useRef<TextInput>(null);

  const conversation = getConversation(id);
  const isThisStreaming = isStreaming && streaming.conversationId === id;

  // Scroll to bottom on new messages or streaming token
  const messagesCount = conversation?.messages.length ?? 0;
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  }, [messagesCount, streaming.content]);

  // Group messages by date
  const groupedMessages = useCallback(() => {
    if (!conversation) return [];

    const groups: {
      type: "date" | "message";
      date?: Date;
      message?: (typeof conversation.messages)[0];
      index?: number;
    }[] = [];

    let lastDate: string | null = null;

    conversation.messages.forEach((msg, index) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== lastDate) {
        groups.push({ type: "date", date: new Date(msg.timestamp) });
        lastDate = msgDate;
      }
      groups.push({ type: "message", message: msg, index });
    });

    return groups;
  }, [conversation?.messages]);

  // Message search logic
  const runMsgSearch = useCallback((query: string) => {
    if (!query.trim() || !conversation) {
      setMsgMatchIndices([]);
      setCurrentMsgMatch(0);
      return;
    }
    const q = query.toLowerCase();
    const matches: number[] = [];
    conversation.messages.forEach((msg, idx) => {
      if (msg.content.toLowerCase().includes(q)) {
        matches.push(idx);
      }
    });
    setMsgMatchIndices(matches);
    setCurrentMsgMatch(matches.length > 0 ? 0 : -1);
  }, [conversation?.messages]);

  const handleMsgSearchChange = (text: string) => {
    setMsgSearchQuery(text);
    runMsgSearch(text);
  };

  const scrollToMsg = (index: number) => {
    // The message elements don't have refs, so we scroll the ScrollView
    // and highlight by re-rendering with the match index
    setCurrentMsgMatch(index);
  };

  const goToNextMatch = () => {
    if (msgMatchIndices.length === 0) return;
    const next = (currentMsgMatch + 1) % msgMatchIndices.length;
    scrollToMsg(next);
  };

  const goToPrevMatch = () => {
    if (msgMatchIndices.length === 0) return;
    const prev = (currentMsgMatch - 1 + msgMatchIndices.length) % msgMatchIndices.length;
    scrollToMsg(prev);
  };

  if (!conversation) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.textSecondary }}>Conversation not found</Text>
      </View>
    );
  }

  const handleSend = (text: string, reply?: ReplyTo, images?: string[]) => {
    sendMessage(id, text, reply, images);
    setReplyTo(undefined);
  };

  const handleCopy =async (content: string) => {
    await Clipboard.setStringAsync(content);
  };

  const handleStop = () => {
    cancelStream();
  };

  const handleEdit = (messageId: string, content: string) => {
    setEditingMessage({ id: messageId, content });
  };

  const handleSaveEdit = (newContent: string) => {
    if (editingMessage) {
      editMessage(id, editingMessage.id, newContent);
      setEditingMessage(null);
    }
  };

  const handleDelete = (messageId: string) => {
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMessage(id, messageId),
      },
    ]);
  };

  const handleRetry = (messageId: string) => {
    retryMessage(id, messageId);
  };

  const handleReply = (messageId: string) => {
    const msg = conversation.messages.find((m) => m.id === messageId);
    if (msg) {
      setReplyTo({
        id: msg.id,
        content: msg.content,
        role: msg.role,
      });
    }
  };

  const handleSearch = () => {
    setShowSearch(true);
  };

  const modelName = conversation.modelName.split("/").pop() ?? conversation.modelName;

  const messageGroups = groupedMessages();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen options={{ title: conversation.title }} />

      {/* Model selector row */}
      <Pressable
        onPress={() => setShowModelSheet(true)}
        disabled={isThisStreaming}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: theme.backgroundSelected,
          backgroundColor: theme.background,
          opacity: isThisStreaming ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#34C759',
            marginRight: 6,
          }}
        />
        <Text style={{ fontSize: 13, color: theme.textSecondary }}>
          {conversation.modelName}
        </Text>
        <Text style={{ fontSize: 11, color: theme.textSecondary, marginLeft: 4 }}>▾</Text>
        {/* Message search toggle */}
        <Pressable
          onPress={() => {
            setShowMsgSearch(!showMsgSearch);
            if (!showMsgSearch) {
              setTimeout(() => msgSearchRef.current?.focus(), 100);
            } else {
              setMsgSearchQuery('');
              setMsgMatchIndices([]);
              setCurrentMsgMatch(0);
            }
          }}
          style={({ pressed }) => ({
            marginLeft: 8,
            opacity: pressed ? 0.6 : 0.5,
          })}
        >
          <Text style={{ fontSize: 16 }}>🔍</Text>
        </Pressable>
      </Pressable>

      {/* Message search bar */}
      {showMsgSearch && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: theme.background,
            borderBottomWidth: 0.5,
            borderBottomColor: theme.backgroundSelected,
          }}
        >
          <TextInput
            ref={msgSearchRef}
            value={msgSearchQuery}
            onChangeText={handleMsgSearchChange}
            placeholder="Search messages..."
            placeholderTextColor={theme.textSecondary}
            style={{
              flex: 1,
              fontSize: 15,
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          />
          {msgSearchQuery.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginRight: 6 }}>
                {msgMatchIndices.length > 0
                  ? `${currentMsgMatch + 1}/${msgMatchIndices.length}`
                  : '0/0'}
              </Text>
              <Pressable onPress={goToPrevMatch} style={{ padding: 4 }}>
                <Text style={{ fontSize: 16, color: '#007AFF' }}>▲</Text>
              </Pressable>
              <Pressable onPress={goToNextMatch} style={{ padding: 4 }}>
                <Text style={{ fontSize: 16, color: '#007AFF' }}>▼</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowMsgSearch(false);
                  setMsgSearchQuery('');
                  setMsgMatchIndices([]);
                  setCurrentMsgMatch(0);
                }}
                style={{ padding: 4, marginLeft: 4 }}
              >
                <Text style={{ fontSize: 16, color: '#FF453A' }}>✕</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
        }}
      >
        {messageGroups.length === 0 && !isThisStreaming ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 80,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.backgroundElement,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 24, color: theme.textSecondary }}>♯</Text>
            </View>
            <Text
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: theme.text,
                marginBottom: 4,
              }}
            >
              {conversation.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.textSecondary,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Using {modelName}
              {"\n"}Send a message to begin
            </Text>
          </View>
        ) : (
          <>
            {messageGroups.map((item, idx) => {
              if (item.type === "date" && item.date) {
                return <DateSeparator key={`date-${item.date.toISOString()}`} date={item.date} />;
              }
              if (item.type === "message" && item.message && item.index !== undefined) {
                const msg = item.message;
                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    index={item.index}
                    isStreaming={isThisStreaming && item.index === conversation.messages.length}
                    conversationId={id}
                    onCopy={msg.role === "assistant" ? () => handleCopy(msg.content) : undefined}
                    onEdit={msg.role === "user" ? () => handleEdit(msg.id, msg.content) : undefined}
                    onDelete={() => handleDelete(msg.id)}
                    onRegenerate={
                      msg.role === "assistant" ? () => regenerateLastAssistant(id) : undefined
                    }
                    onRetry={
                      msg.status === "failed" && msg.role === "assistant"
                        ? () => handleRetry(msg.id)
                        : undefined
                    }
                    onReply={() => handleReply(msg.id)}
                    onPin={() => togglePin(id, msg.id)}
                    onStar={() => toggleStar(id, msg.id)}
                    onReaction={(reaction: Reaction) => toggleReaction(id, msg.id, reaction)}
                    onSearch={handleSearch}
                  />
                );
              }
              return null;
            })}

            {/* Streaming content */}
            {isThisStreaming && streaming.content.length > 0 && (
              <ChatMessage
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streaming.content,
                  timestamp: Date.now(),
                  status: "delivered",
                  thinking: streaming.thinking,
                }}
                index={conversation.messages.length}
                isStreaming
                conversationId={id}
              />
            )}

            {/* Streaming thinking indicator */}
            {isThisStreaming && streaming.thinking.length > 0 && streaming.content.length === 0 && (
              <ThinkingBubble content={streaming.thinking} isStreaming />
            )}

            {/* Typing indicator before first token */}
            {isThisStreaming && streaming.content.length === 0 && (
              <TypingIndicator style={{ marginLeft: 4, marginBottom: 10 }} />
            )}
          </>
        )}
      </ScrollView>

      <ChatInput
        onSend={handleSend}
        onSaveDraft={(draft) => saveDraft(id, draft)}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
      />

      {/* Edit Modal */}
      <EditMessageModal
        visible={editingMessage !== null}
        onClose={() => setEditingMessage(null)}
        onSave={handleSaveEdit}
        initialContent={editingMessage?.content || ""}
      />

      {/* Search Modal */}
      <SearchModal
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={(q) => {
          setSearchQuery(q);
          setShowSearchResults(true);
        }}
        messages={conversation.messages.map((m) => ({
          id: m.id,
          content: m.content,
          role: m.role,
        }))}
      />

      {/* Model Picker Sheet */}
      <ModelPickerSheet
        visible={showModelSheet}
        onClose={() => setShowModelSheet(false)}
        currentModel={conversation.modelName}
        onSelect={(modelId) => changeModel(id, modelId)}
      />
    </KeyboardAvoidingView>
  );
}
