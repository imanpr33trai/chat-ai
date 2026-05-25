import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChatListItem } from '@/components/chat-list-item';
import { useChat } from '@/hooks/use-chat-store';
import { useModels } from '@/hooks/use-models';
import { useTheme } from '@/hooks/use-theme';

// ─── Model Selection Modal ─────────────────────────────────

function ModelSelectionModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (modelId: string, modelName: string) => void;
}) {
  const theme = useTheme();
  const { models, loading, error } = useModels();
  const [selectedModel, setSelectedModel] = useState(models[0]?.id || '');

  React.useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id);
    }
  }, [models, selectedModel]);

  const handleStart = () => {
    const model = models.find(m => m.id === selectedModel);
    if (model) {
      onSelect(model.id, model.name);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 0.5,
            borderBottomColor: theme.separator,
            backgroundColor: theme.highlight,
          }}
        >
          <Pressable onPress={onClose}>
            <Text style={{ fontSize: 17, color: '#007AFF' }}>Cancel</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: 600, color: theme.text }}>
            Select Model
          </Text>
          <Pressable onPress={handleStart} disabled={!selectedModel}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: selectedModel ? '#007AFF' : theme.textSecondary,
              }}
            >
              Start
            </Text>
          </Pressable>
        </View>

        {/* Model List */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text
            style={{
              fontSize: 13,
              color: theme.textSecondary,
              marginBottom: 12,
            }}
          >
            Choose an AI model for this conversation
          </Text>

          {loading && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={{ marginTop: 12, color: theme.textSecondary }}>
                Loading models...
              </Text>
            </View>
          )}

          {error && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: '#FF453A', textAlign: 'center' }}>
                Failed to load models
              </Text>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 13,
                  marginTop: 8,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {!loading &&
            !error &&
            models.map(model => {
              const isSelected = selectedModel === model.id;
              return (
                <Pressable
                  key={model.id}
                  onPress={() => setSelectedModel(model.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: 8,
                    backgroundColor: isSelected
                      ? theme.separator
                      : theme.highlight,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: isSelected ? '#007AFF' : theme.separator,
                    opacity: 1,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
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
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#007AFF',
                        }}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: theme.text,
                        }}
                      >
                        {model.name}
                      </Text>
                      <View
                        style={{
                          marginLeft: 8,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          backgroundColor: theme.separator,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: theme.textSecondary,
                          }}
                        >
                          {model.provider}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {model.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function ChatsScreen() {
  const { state, deleteChat, createChat, updateConversation } = useChat();
  const theme = useTheme();
  const router = useRouter();
  const [showModelModal, setShowModelModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameText, setRenameText] = useState('');

  const handleNewChat = (modelId: string, modelName: string) => {
    const title = `Chat with ${modelName}`;
    const id = createChat(title, modelId);
    router.push(`/chat/${id}`);
  };

  const handleRenameStart = (convId: string, currentTitle: string) => {
    setRenameText(currentTitle);
    setRenameTarget({ id: convId, title: currentTitle });
  };

  const handleRenameConfirm = () => {
    if (renameTarget && renameText.trim()) {
      updateConversation(renameTarget.id, { title: renameText.trim() });
    }
    setRenameTarget(null);
    setRenameText('');
  };

  const handleRenameCancel = () => {
    setRenameTarget(null);
    setRenameText('');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Chats' }} />

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {state.conversations.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 120,
              paddingHorizontal: 32,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.highlight,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: theme.separator,
              }}
            >
              <Text style={{ fontSize: 28, color: theme.textSecondary }}>
                ♯
              </Text>
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: theme.text,
                marginBottom: 4,
              }}
            >
              No conversations yet
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: theme.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 24,
              }}
            >
              Start a new chat to begin{'\\n'}conversing with AI models
            </Text>

            {/* New Chat Button */}
            <Pressable
              onPress={() => {
                setShowModelModal(true);
              }}
              style={{
                backgroundColor: '#007AFF',
                paddingVertical: 14,
                paddingHorizontal: 32,
                borderRadius: 8,
                borderCurve: 'continuous',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>
                New Chat
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={{ paddingTop: 8 }}
          >
            {state.conversations.map(conv => (
              <ChatListItem
                key={conv.id}
                title={conv.title}
                lastMessage={
                  conv.messages.length > 0
                    ? conv.messages[conv.messages.length - 1].content
                    : 'No messages yet'
                }
                timestamp={conv.updatedAt}
                modelName={conv.modelName}
                onPress={() => {
                  router.push(`/chat/${conv.id}`);
                }}
                onDelete={() => {
                  deleteChat(conv.id);
                }}
                onRename={() => handleRenameStart(conv.id, conv.title)}
              />
            ))}

            {/* New Chat Button at Bottom */}
            <Pressable
              onPress={() => {
                setShowModelModal(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 16,
                marginTop: 8,
                marginHorizontal: 16,
                borderRadius: 8,
                backgroundColor: theme.highlight,
                borderWidth: 1,
                borderColor: theme.separator,
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 8, color: '#007AFF' }}>
                +
              </Text>
              <Text style={{ fontSize: 16, fontWeight: 500, color: '#007AFF' }}>
                New Chat
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Model Selection Modal */}
      <ModelSelectionModal
        visible={showModelModal}
        onClose={() => {
          setShowModelModal(false);
        }}
        onSelect={handleNewChat}
      />

      {/* Rename Conversation Modal */}
      <Modal
        visible={renameTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={handleRenameCancel}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={handleRenameCancel}
          />
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 10,
              padding: 24,
              width: '80%',
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: theme.text,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              Rename Conversation
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.highlight,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: theme.text,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: theme.separator,
              }}
              placeholder="Enter new title"
              placeholderTextColor={theme.textSecondary}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
              selectTextOnFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable
                onPress={handleRenameCancel}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  marginRight: 8,
                  borderRadius: 8,
                  backgroundColor: theme.highlight,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.separator,
                }}
              >
                <Text style={{ fontSize: 16, color: theme.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRenameConfirm}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  marginLeft: 8,
                  borderRadius: 8,
                  backgroundColor: '#007AFF',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
