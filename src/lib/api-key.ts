import * as SecureStore from 'expo-secure-store'

const STORAGE_KEY = 'hermes_nvidia_api_key'

// In-memory cache for synchronous reads (chat-stream needs sync access)
let cachedKey: string | null = null

/** Read the API key (synchronous — uses in-memory cache). */
export function getApiKey(): string | null {
  return cachedKey
}

/** Load the key from SecureStore into cache (call on app init). */
export async function loadApiKey(): Promise<string | null> {
  try {
    cachedKey = await SecureStore.getItemAsync(STORAGE_KEY)
    return cachedKey
  } catch {
    cachedKey = null
    return null
  }
}

/** Save a new key to SecureStore and update cache. */
export async function setApiKey(key: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, key)
    cachedKey = key
  } catch {
    // storage unavailable
  }
}

/** Remove the key from SecureStore and clear cache. */
export async function clearApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY)
    cachedKey = null
  } catch {
    // ignore
  }
}
