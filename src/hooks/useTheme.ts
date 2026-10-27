import { useContext } from 'react';
import { ThemeContext, type Theme, type ThemeContextValue } from '../context/theme-context';

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export type { Theme };
