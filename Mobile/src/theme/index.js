import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const LightColors = {
  primary: '#455A3F', // Cool military green
  primaryDark: '#34442F', // Dark military green
  secondary: '#4A607A', // Muted slate blue
  accent: '#B08047', // Warm leather/coffee accent
  background: '#FAF7F2', // Coffee white (not too brownish)
  surface: '#FFFFFF',
  text: '#202B1D', // Deep charcoal/forest green-black
  textLight: '#5A6B57', // Earthy sage/gray
  error: '#EF4444',
  white: '#FFFFFF',
  black: '#000000',
  glass: 'rgba(250, 247, 242, 0.7)',
  cardSecondary: '#F5F1E9', // Slightly darker coffee white
  inputBg: '#F5F1E9',
  border: '#E8E2D5',
  tint: 'rgba(69, 90, 63, 0.1)', // 10% opacity primary green
};

const DarkColors = {
  primary: '#6D8E67', // Light sage green
  primaryDark: '#506F4B',
  secondary: '#5C748F',
  accent: '#E6A756',
  background: '#0B0E0A', // Darker forest/charcoal background
  surface: '#121611',    // Darker surface
  text: '#F1F5F0',
  textLight: '#8C9E88',
  error: '#F87171',
  white: '#FFFFFF',
  black: '#000000',
  glass: 'rgba(26, 33, 24, 0.7)',
  cardSecondary: 'rgba(255, 255, 255, 0.05)',
  inputBg: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.08)',
  tint: 'rgba(109, 142, 103, 0.15)',
};

export const CombinedDefaultTheme = {
  ...NavigationDefaultTheme,
  ...MD3LightTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    ...MD3LightTheme.colors,
    ...LightColors,
  },
};

export const CombinedDarkTheme = {
  ...NavigationDarkTheme,
  ...MD3DarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    ...MD3DarkTheme.colors,
    ...DarkColors,
  },
};

export const theme = {
  colors: LightColors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
    full: 9999,
  },
};