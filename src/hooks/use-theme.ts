import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;
  const isDark = theme === 'dark';
  return { ...Colors[theme], isDark };
}