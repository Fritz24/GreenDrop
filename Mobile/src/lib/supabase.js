import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Expo automatically loads variables prefixed with EXPO_PUBLIC_
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://mvxysniqyglbtcjhcclo.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eHlzbmlxeWdsYnRjamhjY2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzUxNzEsImV4cCI6MjA5NzU1MTE3MX0.d5MRNDy-wvCcAyJMagguVwXWLsrk7uMN3fRsegxjC7E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
