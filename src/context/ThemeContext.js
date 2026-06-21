import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CombinedDefaultTheme, CombinedDarkTheme } from '../theme';

export const ThemeContext = createContext();

const THEME_STORAGE_KEY = '@theme_mode';

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'

  useEffect(() => {
    // Load persisted theme preference
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode) {
          setThemeMode(savedMode);
        }
      } catch (e) {
        console.error('Failed to load theme mode', e);
      }
    };
    loadTheme();
  }, []);

  const updateThemeMode = async (newMode) => {
    setThemeMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  };

  const isDarkTheme = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const theme = isDarkTheme ? CombinedDarkTheme : CombinedDefaultTheme;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      isDarkTheme, 
      themeMode, 
      setThemeMode: updateThemeMode 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

