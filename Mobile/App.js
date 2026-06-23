import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CombinedDefaultTheme, CombinedDarkTheme } from './src/theme'; // Import Combined themes
import { ThemeProvider, useTheme } from './src/context/ThemeContext'; // Import ThemeProvider and useTheme
import { HomeScreen } from './src/screens/HomeScreen';

import { RewardsScreen } from './src/screens/RewardsScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AgentHomeScreen } from './src/screens/AgentHomeScreen';
import { Home, Scan, Award, BarChart3, User, Leaf } from 'lucide-react-native';
import { supabase } from './src/lib/supabase';

function MainApp() {
  const { theme, isDarkTheme, themeMode, setThemeMode } = useTheme(); // Use theme, isDarkTheme, and themeMode from context
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });
  }, []);

  const handleSession = async (currentSession) => {
    setSession(currentSession);
    if (currentSession) {
      const { data } = await supabase.from('profiles').select('role').eq('id', currentSession.user.id).single();
      if (data) {
        setRole(data.role);
      } else {
        setRole('user');
      }
    } else {
      setRole(null);
    }
    setLoadingAuth(false);
  };

  const handleOnboardingDone = () => {
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingScreen onDone={handleOnboardingDone} />;
  }

  if (loadingAuth) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
        <AuthScreen />
      </>
    );
  }

  if (role === 'agent') {
    return (
      <View style={[{ backgroundColor: theme.colors.background }, styles.container]}>
        <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <AgentHomeScreen />
        </View>
      </View>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen onNavigate={setActiveTab} />;

      case 'rewards': return <RewardsScreen onNavigate={setActiveTab} />;
      case 'leaderboard': return <LeaderboardScreen onNavigate={setActiveTab} />;
      case 'profile': return <ProfileScreen onNavigate={setActiveTab} />;
      default: return <HomeScreen onNavigate={setActiveTab} />;
    }
  };

  const getNextMode = () => {
    if (themeMode === 'light') return 'dark';
    if (themeMode === 'dark') return 'system';
    return 'light';
  };

  const getModeLabel = () => {
    if (themeMode === 'light') return 'Light';
    if (themeMode === 'dark') return 'Dark';
    return 'Auto';
  };

  return (
    <View style={[{ backgroundColor: theme.colors.background }, styles.container]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
      <View style={[styles.content, { paddingTop: insets.top }]}>

        {renderContent()}
      </View>

      <BlurView 
        intensity={80} 
        tint={isDarkTheme ? 'dark' : 'light'} 
        style={[
          styles.tabBar, 
          { 
            borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            bottom: Math.max(insets.bottom, 15)
          }
        ]}
      >
        <TabItem
          label="Home"
          icon={<Home size={24} color={activeTab === 'home' ? theme.colors.primary : theme.colors.textLight} />}
          isActive={activeTab === 'home'}
          onPress={() => setActiveTab('home')}
        />
        <TabItem
          label="Stats"
          icon={<BarChart3 size={24} color={activeTab === 'leaderboard' ? theme.colors.primary : theme.colors.textLight} />}
          isActive={activeTab === 'leaderboard'}
          onPress={() => setActiveTab('leaderboard')}
        />

        <TabItem
          label="Rewards"
          icon={<Award size={24} color={activeTab === 'rewards' ? theme.colors.primary : theme.colors.textLight} />}
          isActive={activeTab === 'rewards'}
          onPress={() => setActiveTab('rewards')}
        />
        <TabItem
          label="Profile"
          icon={<User size={24} color={activeTab === 'profile' ? theme.colors.primary : theme.colors.textLight} />}
          isActive={activeTab === 'profile'}
          onPress={() => setActiveTab('profile')}
        />
      </BlurView>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const TabItem = ({ icon, label, isActive, onPress }) => {
  const { theme, isDarkTheme } = useTheme();
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, isActive && { backgroundColor: theme.colors.primary + '1A' }]}>
        {icon}
        {isActive && (
          <View style={[styles.activeLeaf, { backgroundColor: isDarkTheme ? theme.colors.surface : '#FFFFFF' }]}>
            <Leaf size={16} color={theme.colors.primary} fill={theme.colors.primary} />
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, { color: theme.colors.textLight }, isActive && { color: theme.colors.primary, fontWeight: '800' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 70,
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 35,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  activeLeaf: {
    position: 'absolute',
    top: -4,
    right: -4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 1,
  },

});
