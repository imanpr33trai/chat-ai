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

function generateId() {
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
  sendMessage: (conversationId: string, content: string, replyTo?: ReplyTo) => void
  editMessage: (conversationId: string, messageId: string, newContent: string) => void
  retryMessage: (conversationId: string, messageId: string) => void
  regenerateLastAssistant: (conversationId: string) => void
  toggleReaction: (conversationId: string, messageId: string, reaction: Reaction) => void
  togglePin: (conversationId: string, messageId: string) => void
  toggleStar: (conversationId: string, messageId: string) => void
  cancelStream: () => void
  setDefaultModel: (modelId: string) => void
  changeModel: (conversationId: string, modelName: string) => void
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

  const sendMessage = useCallback(
    (conversationId: string, content: string, replyTo?: ReplyTo) => {
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

      // --- prepare messages array for API (omit assistant content until stream done) ---
      const apiMessages = [
        ...conv.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content },
      ]

      // --- kick off streaming ---
      // Reset refs for batching
      streamingContentRef.current = ''
      streamingThinkingRef.current = ''
      setStreaming({ content: '', conversationId, thinking: '' })

      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

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

      startStream(
        {
          model: conv.modelName,
          messages: apiMessages,
          signal: abort.signal,
          temperature: 0.7,
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
          onDone: (fullContent, thinkingContent) => {
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
    [state.conversations],
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
      const apiMessages = conv.messages.slice(0, msgIndex).map((m) => ({
        role: m.role,
        content: m.content,
      }))
      apiMessages.push({ role: 'user' as const, content: newContent })

      streamingContentRef.current = ''
      streamingThinkingRef.current = ''
      setStreaming({ content: '', conversationId, thinking: '' })
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

      startStream(
        {
          model: conv.modelName,
          messages: apiMessages,
          signal: abort.signal,
          temperature: 0.7,
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
          onDone: (fullContent, thinkingContent) => {
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
    [state.conversations],
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
      sendMessage(conversationId, msg.content)
    },
    [state.conversations, sendMessage],
  )

  const regenerateLastAssistant = useCallback(
    (conversationId: string) => {
      const conv = state.conversations.find((c) => c.id === conversationId)
      if (!conv || conv.messages.length === 0) return
      // Find the last assistant message
      for (let i = conv.messages.length - 1; i >= 0; i--) {
        const msg = conv.messages[i]
        if (msg.role === 'assistant') {
          // Remove this assistant message and regenerate
          dispatch({ type: 'DELETE_MESSAGE', payload: { conversationId, messageId: msg.id } })
          // Also remove the user message before it if it triggered this response
          if (i > 0) {
            const prevMsg = conv.messages[i - 1]
            if (prevMsg.role === 'user') {
              dispatch({ type: 'DELETE_MESSAGE', payload: { conversationId, messageId: prevMsg.id } })
              sendMessage(conversationId, prevMsg.content)
              return
            }
          }
          return
        }
      }
    },
    [state.conversations, sendMessage],
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
