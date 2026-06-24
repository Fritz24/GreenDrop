import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CombinedDefaultTheme, CombinedDarkTheme } from './src/theme'; // Import Combined themes
import { ThemeProvider, useTheme } from './src/context/ThemeContext'; // Import ThemeProvider and useTheme
import { HomeScreen } from './src/screens/HomeScreen';
import { BookingScreen } from './src/screens/BookingScreen';

import { RewardsScreen } from './src/screens/RewardsScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AgentHomeScreen } from './src/screens/AgentHomeScreen';
import { Home, Scan, Award, BarChart3, User, Leaf } from 'lucide-react-native';
import { supabase } from './src/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationOnboardingScreen } from './src/screens/LocationOnboardingScreen';

function MainApp() {
  const { theme, isDarkTheme, themeMode, setThemeMode } = useTheme(); // Use theme, isDarkTheme, and themeMode from context
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showLocationOnboarding, setShowLocationOnboarding] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Check onboarding states in storage
    const checkOnboarding = async () => {
      try {
        const onboardingCompleted = await AsyncStorage.getItem('@onboarding_completed');
        const locationOnboardingCompleted = await AsyncStorage.getItem('@location_onboarding_completed');
        
        if (onboardingCompleted === 'true') {
          setShowOnboarding(false);
          if (locationOnboardingCompleted !== 'true') {
            setShowLocationOnboarding(true);
          }
        }
      } catch (err) {
        console.error('Error reading onboarding status:', err);
      } finally {
        setLoadingOnboarding(false);
      }
    };
    checkOnboarding();

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    supabase.auth.onAuthStateChange(async (event, session) => {
      handleSession(session);
      if (event === 'SIGNED_OUT') {
        setActiveTab('home');
        try {
          await AsyncStorage.removeItem('@onboarding_completed');
          await AsyncStorage.removeItem('@location_onboarding_completed');
          await AsyncStorage.removeItem('@onboarding_location');
          setShowOnboarding(true);
          setShowLocationOnboarding(false);
        } catch (e) {
          console.error('Error clearing onboarding status on signout:', e);
        }
      } else if (event === 'SIGNED_IN') {
        setActiveTab('home');
      }
    });
  }, []);

  const handleSession = async (currentSession) => {
    setLoadingAuth(true);
    if (currentSession) {
      let userRole = 'user';
      let needsLocationOnboarding = false;

      // Fetch user's profile/role
      try {
        const { data } = await supabase.from('profiles').select('role').eq('id', currentSession.user.id).single();
        if (data) {
          userRole = data.role;
        }
      } catch (err) {
        console.error('Error fetching role:', err);
      }

      // Check if user has locations in database
      try {
        const userLocOnboardingKey = '@location_onboarding_completed_' + currentSession.user.id;
        const locationOnboardingCompleted = await AsyncStorage.getItem(userLocOnboardingKey);
        
        if (locationOnboardingCompleted !== 'true') {
          const { data: userLocs, error: locError } = await supabase
            .from('user_locations')
            .select('id')
            .eq('user_id', currentSession.user.id);
          
          if (!locError && (!userLocs || userLocs.length === 0)) {
            // Force location onboarding since user has 0 saved locations
            needsLocationOnboarding = true;
          } else if (!locError && userLocs && userLocs.length > 0) {
            // User already has locations, mark onboarding as completed for this user
            await AsyncStorage.setItem(userLocOnboardingKey, 'true');
          }
        }
      } catch (err) {
        console.error('Error checking user locations in database:', err);
      }

      // Sync onboarding location to database
      try {
        const onboardingLocation = await AsyncStorage.getItem('@onboarding_location');
        if (onboardingLocation) {
          const parsed = JSON.parse(onboardingLocation);
          const { error } = await supabase.from('user_locations').insert({
            user_id: currentSession.user.id,
            name: parsed.name,
            city: parsed.city,
            address: parsed.address,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
            is_default: true,
          });

          if (!error) {
            await AsyncStorage.removeItem('@onboarding_location');
            await AsyncStorage.setItem('@location_onboarding_completed', 'true');
            await AsyncStorage.setItem('@location_onboarding_completed_' + currentSession.user.id, 'true');
            needsLocationOnboarding = false;
          } else {
            console.error('Error syncing onboarding location:', error);
          }
        }
      } catch (err) {
        console.error('Error syncing location onboarding:', err);
      }

      setRole(userRole);
      setShowLocationOnboarding(needsLocationOnboarding);
      setSession(currentSession);
    } else {
      setRole(null);
      setSession(null);
    }
    setLoadingAuth(false);
  };

  const handleOnboardingDone = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      setShowOnboarding(false);
      const locationOnboardingCompleted = await AsyncStorage.getItem('@location_onboarding_completed');
      if (locationOnboardingCompleted !== 'true') {
        setShowLocationOnboarding(true);
      }
    } catch (e) {
      setShowOnboarding(false);
      setShowLocationOnboarding(true);
    }
  };

  const handleLocationOnboardingDone = async () => {
    try {
      await AsyncStorage.setItem('@location_onboarding_completed', 'true');
      if (session?.user?.id) {
        await AsyncStorage.setItem('@location_onboarding_completed_' + session.user.id, 'true');
      }
    } catch (e) {}
    setShowLocationOnboarding(false);
  };

  if (loadingOnboarding) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

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

  if (showLocationOnboarding && role !== 'agent') {
    return <LocationOnboardingScreen onDone={handleLocationOnboardingDone} />;
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
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: activeTab === 'home' ? 'flex' : 'none' }}>
          <HomeScreen onNavigate={setActiveTab} activeTab={activeTab} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'booking' ? 'flex' : 'none' }}>
          <BookingScreen onNavigate={setActiveTab} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'rewards' ? 'flex' : 'none' }}>
          <RewardsScreen onNavigate={setActiveTab} activeTab={activeTab} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'leaderboard' ? 'flex' : 'none' }}>
          <LeaderboardScreen parentActiveTab={activeTab} />
        </View>
        <View style={{ flex: 1, display: activeTab === 'profile' ? 'flex' : 'none' }}>
          <ProfileScreen onNavigate={setActiveTab} />
        </View>
      </View>
    );
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
