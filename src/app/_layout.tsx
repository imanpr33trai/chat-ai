import React, { useEffect } from 'react';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

import { ChatProvider } from '@/hooks/use-chat-store';
import AppTabs from '@/components/app-tabs';
import { loadApiKey } from '@/lib/api-key';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Load API key from SecureStore into in-memory cache on app start
  useEffect(() => { loadApiKey() }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ChatProvider>
        <AppTabs />
      </ChatProvider>
    </ThemeProvider>
  );
}
