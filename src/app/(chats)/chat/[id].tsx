import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ChatView } from '@/components/chat-view'

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ChatView id={id} />
}
