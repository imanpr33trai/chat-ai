import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useState,
  useRef,
} from 'react'
import { startStream } from '@/lib/chat-stream'

// ─── Types ────────────────────────────────────────────────────

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'failed'

export type Reaction = 'like' | 'dislike' | 'heart' | 'laugh' | 'star'

export interface ReplyTo {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status?: MessageStatus
  reactions?: Reaction[]
  pinned?: boolean
  starred?: boolean
  replyTo?: ReplyTo
  thinking?: string
  images?: string[]  // base64 image data URIs for multimodal
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  tool_calls?: { id: string; type: string; function: { name: string; arguments: string } }[]
}

export interface Conversation {
  id: string
  title: string
  modelName: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

// ─── State ─────────────────────────────────────────────────────

type State = {
  conversations: Conversation[]
  defaultModel: string
}

type Action =
  | {
      type: 'CREATE_CHAT'
      payload: { id: string; title: string; modelName: string }
    }
  | { type: 'DELETE_CHAT'; payload: { id: string } }
  | { type: 'DELETE_MESSAGE'; payload: { conversationId: string; messageId: string } }
  | { type: 'ADD_MESSAGE'; payload: { conversationId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { conversationId: string; messageId: string; updates: Partial<Message> } }
  | { type: 'SET_DEFAULT_MODEL'; payload: string }
  | { type: 'CHANGE_MODEL'; payload: { conversationId: string; modelName: string } }
  | { type: 'REGENERATE_MESSAGE'; payload: { conversationId: string; messageId: string } }
  | { type: 'UPDATE_CONVERSATION'; payload: { conversationId: string; updates: Partial<Pick<Conversation, 'title'>> } }

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8)
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2, 10)
}

const initialState: State = {
  conversations: [],
  defaultModel: 'nvidia/llama-3.1-nemotron-70b-instruct',
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CREATE_CHAT':
      return {
        ...state,
        conversations: [
          {
            id: action.payload.id,
            title: action.payload.title,
            modelName: action.payload.modelName,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          ...state.conversations,
        ],
      }
    case 'DELETE_CHAT': {
      const updated = state.conversations.filter(
        (c) => c.id !== action.payload.id,
      )
      return { ...state, conversations: updated }
    }
    case 'DELETE_MESSAGE': {
      const convIndex = state.conversations.findIndex(
        (c) => c.id === action.payload.conversationId,
      )
      if (convIndex === -1) return state
      const conv = state.conversations[convIndex]
      const updatedConv: Conversation = {
        ...conv,
        messages: conv.messages.filter((m) => m.id !== action.payload.messageId),
        updatedAt: Date.now(),
      }
      const newList = [...state.conversations]
      newList[convIndex] = updatedConv
      return { ...state, conversations: newList }
    }
    case 'ADD_MESSAGE': {
      const convIndex = state.conversations.findIndex(
        (c) => c.id === action.payload.conversationId,
      )
      if (convIndex === -1) return state
      const conv = state.conversations[convIndex]
      const updatedConv: Conversation = {
        ...conv,
        messages: [...conv.messages, action.payload.message],
        updatedAt: Date.now(),
      }
      const newList = [...state.conversations]
      newList.splice(convIndex, 1)
      newList.unshift(updatedConv)
      return { ...state, conversations: newList }
    }
    case 'UPDATE_MESSAGE': {
      const convIndex = state.conversations.findIndex(
        (c) => c.id === action.payload.conversationId,
      )
      if (convIndex === -1) return state
      const conv = state.conversations[convIndex]
      const updatedConv: Conversation = {
        ...conv,
        messages: conv.messages.map((m) =>
          m.id === action.payload.messageId
            ? { ...m, ...action.payload.updates }
            : m,
        ),
        updatedAt: Date.now(),
      }
      const newList = [...state.conversations]
      newList[convIndex] = updatedConv
      return { ...state, conversations: newList }
    }
    case 'SET_DEFAULT_MODEL':
      return { ...state, defaultModel: action.payload }
    case 'CHANGE_MODEL': {
      const convIndex = state.conversations.findIndex(
        (c) => c.id === action.payload.conversationId,
      )
      if (convIndex === -1) return state
      const newList = [...state.conversations]
      newList[convIndex] = { ...newList[convIndex], modelName: action.payload.modelName }
      return { ...state, conversations: newList }
    }
    case 'UPDATE_CONVERSATION': {
      const convIndex = state.conversations.findIndex(
        (c) => c.id === action.payload.conversationId,
      )
      if (convIndex === -1) return state
      const newList = [...state.conversations]
      newList[convIndex] = {
        ...newList[convIndex],
        ...action.payload.updates,
        updatedAt: Date.now(),
      }
      return { ...state, conversations: newList }
    }
    default:
      return state
  }
}

// ─── Context ───────────────────────────────────────────────────

interface StreamingState {
  content: string
  conversationId: string | null
  thinking: string
}

interface ChatContextValue {
  state: State
  streaming: StreamingState
  isStreaming: boolean
  drafts: Record<string, string>
  createChat: (title: string, modelName?: string) => string
  deleteChat: (id: string) => void
  deleteMessage: (conversationId: string, messageId: string) => void
  sendMessage: (conversationId: string, content: string, replyTo?: ReplyTo, images?: string[], temperature?: number, maxTokens?: number) => void
  editMessage: (conversationId: string, messageId: string, newContent: string) => void
  retryMessage: (conversationId: string, messageId: string) => void
  regenerateLastAssistant: (conversationId: string) => void
  toggleReaction: (conversationId: string, messageId: string, reaction: Reaction) => void
  togglePin: (conversationId: string, messageId: string) => void
  toggleStar: (conversationId: string, messageId: string) => void
  cancelStream: () => void
  setDefaultModel: (modelId: string) => void
  changeModel: (conversationId: string, modelName: string) => void
  updateConversation: (conversationId: string, updates: Partial<Pick<Conversation, 'title'>>) => void
  getConversation: (id: string) => Conversation | undefined
  saveDraft: (conversationId: string, draft: string) => void
  clearDraft: (conversationId: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

// ─── Provider ──────────────────────────────────────────────────

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [streaming, setStreaming] = useState<StreamingState>({
    content: '',
    conversationId: null,
    thinking: '',
  })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const abortRef = useRef<AbortController | null>(null)

  // Refs for batching streaming updates
  const streamingContentRef = useRef('')
  const streamingThinkingRef = useRef('')
  const rafIdRef = useRef<number | null>(null)

  // Flush accumulated streaming content to state
  const flushStreaming = useCallback(() => {
    const content = streamingContentRef.current
    const thinking = streamingThinkingRef.current
    setStreaming((prev) => ({
      ...prev,
      content,
      thinking,
    }))
    rafIdRef.current = null
  }, [])

  // Schedule a flush using requestAnimationFrame (batches at ~60fps)
  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushStreaming)
    }
  }, [flushStreaming])

  const isStreaming = streaming.conversationId !== null

  const createChat = useCallback((title: string, modelName?: string) => {
    const id = generateId()
    dispatch({
      type: 'CREATE_CHAT',
      payload: { id, title, modelName: modelName ?? state.defaultModel },
    })
    return id
  }, [])

  const deleteChat = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CHAT', payload: { id } })
  }, [])

  const deleteMessage = useCallback((conversationId: string, messageId: string) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: { conversationId, messageId } })
  }, [])

  // ─── Shared streaming logic (avoids stale closure issues) ─────────────────

  const startStreamFromMessages = useCallback(
    (conversationId: string, modelName: string, apiMessages: { role: string; content: string | null | { type: string; text?: string; image_url?: { url: string } }[] }[], temperature?: number, maxTokens?: number) => {
      streamingContentRef.current = ''
      streamingThinkingRef.current = ''
      setStreaming({ content: '', conversationId, thinking: '' })

      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

      startStream(
        {
          model: modelName,
          messages: apiMessages,
          signal: abort.signal,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens,
        },
        {
          onToken: (token) => {
            streamingContentRef.current += token
            scheduleFlush()
          },
          onThinkingToken: (token) => {
            streamingThinkingRef.current += token
            scheduleFlush()
          },
          onDone: (fullContent, thinkingContent, toolCalls, usage) => {
            if (rafIdRef.current !== null) {
              cancelAnimationFrame(rafIdRef.current)
              rafIdRef.current = null
            }
            const aiMsg: Message = {
              id: generateId(),
              role: 'assistant',
              content: fullContent,
              timestamp: Date.now(),
              status: 'delivered',
              thinking: thinkingContent,
              tool_calls: toolCalls,
              usage,
            }
            dispatch({
              type: 'ADD_MESSAGE',
              payload: { conversationId, message: aiMsg },
            })
            setStreaming({ content: '', conversationId: null, thinking: '' })
            abortRef.current = null
          },
          onError: (err) => {
            if (rafIdRef.current !== null) {
              cancelAnimationFrame(rafIdRef.current)
              rafIdRef.current = null
            }
            const errMsg: Message = {
              id: generateId(),
              role: 'assistant',
              content: `Error: ${err.message}`,
              timestamp: Date.now(),
              status: 'failed',
            }
            dispatch({
              type: 'ADD_MESSAGE',
              payload: { conversationId, message: errMsg },
            })
            setStreaming({ content: '', conversationId: null, thinking: '' })
            abortRef.current = null
          },
        },
      )
    },
    [scheduleFlush],
  )

  const sendMessage = useCallback(
    (conversationId: string, content: string, replyTo?: ReplyTo, images?: string[], temperature?: number, maxTokens?: number) => {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv) return

      // --- add user message ---
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'sending',
        replyTo,
        images,
      }
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { conversationId, message: userMsg },
      })

      // Clear draft when sending
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[conversationId]
        return next
      })

      // --- prepare messages array for API (multimodal content arrays for images) ---
      function formatContent(msgContent: string, msgImages?: string[]): string | { type: string; text?: string; image_url?: { url: string } }[] {
        if (!msgImages || msgImages.length === 0) return msgContent
        const parts: { type: string; text?: string; image_url?: { url: string } }[] = []
        if (msgContent) parts.push({ type: 'text', text: msgContent })
        for (const img of msgImages) parts.push({ type: 'image_url', image_url: { url: img } })
        return parts
      }

      const apiMessages = [
        ...conv.messages
          .filter((m) => m.status !== 'failed')
          .map((m) => ({
            role: m.role,
            content: formatContent(m.content, m.images),
          })),
        { role: 'user' as const, content: formatContent(content, images) },
      ]

      // --- kick off streaming via shared helper ---
      startStreamFromMessages(conversationId, conv.modelName, apiMessages, temperature, maxTokens)

      // Update message status to 'sent' immediately (optimistic)
      setTimeout(() => {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId,
            messageId: userMsg.id,
            updates: { status: 'sent' },
          },
        })
      }, 100)
    },
    [state.conversations, startStreamFromMessages],
  )

  const editMessage = useCallback(
    (conversationId: string, messageId: string, newContent: string) => {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId,
          messageId,
          updates: { content: newContent, status: 'sending' },
        },
      })
      // Re-send the edited message to get a new response
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const msgIndex = conv.messages.findIndex((m) => m.id === messageId)
      if (msgIndex === -1) return
      // Get all messages up to and including this edited one
      const apiMessages = conv.messages.slice(0, msgIndex)
        .filter((m) => m.status !== 'failed')
        .map((m) => ({
        role: m.role,
        content: m.content,
      }))
      apiMessages.push({ role: 'user' as const, content: newContent })
      startStreamFromMessages(conversationId, conv.modelName, apiMessages)
    },
    [state.conversations, startStreamFromMessages],
  )

  const retryMessage = useCallback(
    (conversationId: string, messageId: string) => {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const msgIndex = conv.messages.findIndex((m) => m.id === messageId)
      if (msgIndex === -1) return
      const msg = conv.messages[msgIndex]
      // Remove the failed message and re-send
      dispatch({ type: 'DELETE_MESSAGE', payload: { conversationId, messageId } })
      // Build API messages WITHOUT the just-deleted message to avoid stale closure
      const apiMessages = conv.messages
        .filter((m) => m.id !== messageId && m.status !== 'failed')
        .map((m) => ({ role: m.role, content: m.content }))
      apiMessages.push({ role: 'user' as const, content: msg.content })
      startStreamFromMessages(conversationId, conv.modelName, apiMessages)
    },
    [state.conversations, sendMessage, startStreamFromMessages],
  )

  const regenerateLastAssistant = useCallback(
    (conversationId: string) => {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv || conv.messages.length === 0) return
      // Find the last assistant message
      for (let i = conv.messages.length - 1; i >= 0; i--) {
        const msg = conv.messages[i]
        if (msg.role === 'assistant') {
          const idsToDelete = [msg.id]
          // Also remove the user message before it if it triggered this response
          let userContent = ''
          if (i > 0) {
            const prevMsg = conv.messages[i - 1]
            if (prevMsg.role === 'user') {
              idsToDelete.push(prevMsg.id)
              userContent = prevMsg.content
            }
          }
          if (!userContent) return

          // Batch-delete in the store
          for (const id of idsToDelete) {
            dispatch({ type: 'DELETE_MESSAGE', payload: { conversationId, messageId: id } })
          }

          // Build API messages WITHOUT the deleted ones (from stale state, which still has them)
          const deleteIds = new Set(idsToDelete)
          const apiMessages = conv.messages
            .filter((m) => !deleteIds.has(m.id) && m.status !== 'failed')
            .map((m) => ({ role: m.role, content: m.content }))
          apiMessages.push({ role: 'user' as const, content: userContent })

          // Add a new user message to the store
          const userMsg: Message = {
            id: generateId(),
            role: 'user',
            content: userContent,
            timestamp: Date.now(),
            status: 'sent',
          }
          dispatch({
            type: 'ADD_MESSAGE',
            payload: { conversationId, message: userMsg },
          })

          startStreamFromMessages(conversationId, conv.modelName, apiMessages)
          return
        }
      }
    },
    [state.conversations, startStreamFromMessages],
  )

  const toggleReaction = useCallback(
    (conversationId: string, messageId: string, reaction: Reaction) => {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const msg = conv.messages.find((m) => m.id === messageId)
      if (!msg) return
      const currentReactions = msg.reactions || []
      const hasReaction = currentReactions.includes(reaction)
      const newReactions = hasReaction
        ? currentReactions.filter((r) => r !== reaction)
        : [...currentReactions, reaction]
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId,
          messageId,
          updates: { reactions: newReactions.length > 0 ? newReactions : undefined },
        },
      })
    },
    [state.conversations],
  )

  const togglePin = useCallback(
    (conversationId: string, messageId: string) => {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const msg = conv.messages.find((m) => m.id === messageId)
      if (!msg) return
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId,
          messageId,
          updates: { pinned: !msg.pinned },
        },
      })
    },
    [state.conversations],
  )

  const toggleStar = useCallback(
    (conversationId: string, messageId: string) => {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const msg = conv.messages.find((m) => m.id === messageId)
      if (!msg) return
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId,
          messageId,
          updates: { starred: !msg.starred },
        },
      })
    },
    [state.conversations],
  )

  const saveDraft = useCallback((conversationId: string, draft: string) => {
    setDrafts((prev) => ({ ...prev, [conversationId]: draft }))
  }, [])

  const clearDraft = useCallback((conversationId: string) => {
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[conversationId]
      return next
    })
  }, [])

  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
    // If there was partial content, save it as the assistant message
    if (streaming.content && streaming.conversationId) {
      const partialMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: streaming.content,
        timestamp: Date.now(),
      }
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { conversationId: streaming.conversationId, message: partialMsg },
      })
    }
    setStreaming({ content: '', conversationId: null, thinking: '' })
    abortRef.current = null
  }, [streaming])

  const setDefaultModel = useCallback((modelId: string) => {
    dispatch({ type: 'SET_DEFAULT_MODEL', payload: modelId })
  }, [])

  const changeModel = useCallback((conversationId: string, modelName: string) => {
    dispatch({ type: 'CHANGE_MODEL', payload: { conversationId, modelName } })
  }, [])

  const updateConversation = useCallback(
    (conversationId: string, updates: Partial<Pick<Conversation, 'title'>>) => {
      dispatch({ type: 'UPDATE_CONVERSATION', payload: { conversationId, updates } })
    },
    [],
  )

  const getConversation = useCallback(
    (id: string) => state.conversations.find((c) => c.id === id),
    [state.conversations],
  )

  return (
    <ChatContext.Provider
      value={{
        state,
        streaming,
        isStreaming,
        drafts,
        createChat,
        deleteChat,
        deleteMessage,
        sendMessage,
        editMessage,
        retryMessage,
        regenerateLastAssistant,
        toggleReaction,
        togglePin,
        toggleStar,
        cancelStream,
        setDefaultModel,
        changeModel,
        updateConversation,
        getConversation,
        saveDraft,
        clearDraft,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
