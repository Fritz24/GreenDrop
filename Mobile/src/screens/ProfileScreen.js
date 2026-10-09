import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  User,
  Settings,
  LogOut,
  Shield,
  CircleHelp,
  Moon,
  Trash2,
  MapPin,
  Plus,
  Star,
  X,
  Navigation,
  Search,
  Home,
  Briefcase,
  GraduationCap,
  Building2,
  Coins,
} from 'lucide-react-native';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';
import { searchLocations, reverseGeocode } from '../lib/maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CITIES = [
  { name: 'Yaoundé', latitude: 3.8480, longitude: 11.5021 },
  { name: 'Douala', latitude: 4.0511, longitude: 9.7679 },
  { name: 'Bafoussam', latitude: 5.4778, longitude: 10.4178 },
  { name: 'Bamenda', latitude: 5.9631, longitude: 10.1591 },
];

const NICKNAMES = [
  { label: 'Home', icon: Home },
  { label: 'Office', icon: Briefcase },
  { label: 'School', icon: GraduationCap },
  { label: 'Business', icon: Building2 },
];

export const ProfileScreen = () => {
  const { theme, isDarkTheme, themeMode, setThemeMode } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [currencySetting, setCurrencySetting] = useState('auto');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Saved locations states
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Add location modal form states
  const [newLocName, setNewLocName] = useState('');
  const [selectedCity, setSelectedCity] = useState('Yaoundé');
  const [expandedLocations, setExpandedLocations] = useState(false);
  const [expandedAddresses, setExpandedAddresses] = useState({});
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(3.8480);
  const [longitude, setLongitude] = useState(11.5021);

  const toggleAddressExpand = (locId) => {
    setExpandedAddresses(prev => ({
      ...prev,
      [locId]: !prev[locId]
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchLocations();
    loadCurrencySetting();
  }, []);

  const loadCurrencySetting = async () => {
    try {
      const saved = await AsyncStorage.getItem('@user_currency');
      if (saved) {
        setCurrencySetting(saved);
      }
    } catch (e) {
      console.error('Error loading currency setting:', e);
    }
  };

  const getCurrencyLabel = () => {
    if (currencySetting === 'auto') return 'Automatic (Location)';
    if (currencySetting === 'USD') return 'Dollar ($)';
    if (currencySetting === 'XAF') return 'CFA Franc (FCFA)';
    if (currencySetting === 'EUR') return 'Euro (€)';
    return 'Automatic (Location)';
  };

  const cycleCurrency = async () => {
    let next = 'auto';
    if (currencySetting === 'auto') next = 'USD';
    else if (currencySetting === 'USD') next = 'XAF';
    else if (currencySetting === 'XAF') next = 'EUR';
    else if (currencySetting === 'EUR') next = 'auto';

    setCurrencySetting(next);
    try {
      await AsyncStorage.setItem('@user_currency', next);
    } catch (e) {
      console.error('Error saving currency setting:', e);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email);
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      setLocationsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('user_locations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (data) setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLocationsLoading(false);
    }
  };

  const handleSetDefault = async (locId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Set all other locations to is_default = false
      const { error: err1 } = await supabase
        .from('user_locations')
        .update({ is_default: false })
        .eq('user_id', user.id);
      if (err1) throw err1;

      // 2. Set chosen one to is_default = true
      const { error: err2 } = await supabase
        .from('user_locations')
        .update({ is_default: true })
        .eq('id', locId);
      if (err2) throw err2;

      // Refetch
      fetchLocations();
    } catch (error) {
      console.error('Error setting default location:', error);
      Alert.alert('Error', 'Failed to update default location.');
    }
  };

  const handleDeleteLocation = async (locId) => {
    Alert.alert(
      'Delete Location',
      'Are you sure you want to remove this saved location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_locations')
                .delete()
                .eq('id', locId);
              if (error) throw error;
              fetchLocations();
            } catch (error) {
              console.error('Error deleting location:', error);
              Alert.alert('Error', 'Failed to delete location.');
            }
          },
        },
      ]
    );
  };

  const getClosestCity = (lat, lng) => {
    let closest = CITIES[0];
    let minDist = Infinity;
    for (const city of CITIES) {
      const dist = Math.hypot(city.latitude - lat, city.longitude - lng);
      if (dist < minDist) {
        minDist = dist;
        closest = city;
      }
    }
    return closest.name;
  };

  const handleCitySelect = (city) => {
    setSelectedCity(city.name);
    setLatitude(city.latitude);
    setLongitude(city.longitude);
    setAddress(`Center, ${city.name}, Cameroon`);
  };

  const handleGPSDetect = async () => {
    setIsDetectingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to use GPS.');
        setIsDetectingGPS(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = location.coords;
      setLatitude(lat);
      setLongitude(lng);

      const detectedAddress = await reverseGeocode(lat, lng);
      setAddress(detectedAddress);

      const closestCityName = getClosestCity(lat, lng);
      setSelectedCity(closestCityName);
    } catch (error) {
      console.error('GPS error:', error);
      Alert.alert('Error', 'Failed to auto-detect location. Please enter manually.');
    } finally {
      setIsDetectingGPS(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchLocations(query + ', Cameroon');
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSearchResultSelect = (result) => {
    setAddress(result.formattedAddress);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setSearchQuery('');
    setSearchResults([]);

    const closestCityName = getClosestCity(result.latitude, result.longitude);
    setSelectedCity(closestCityName);
  };

  const handleAddLocationSubmit = async () => {
    const finalName = newLocName.trim() || 'Home';
    if (!address) {
      Alert.alert('Address Required', 'Please enter or search for an address.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // If this is the first location, make it default automatically
      const isDefault = locations.length === 0;

      // If user marks this as default and they already have locations, reset others first
      if (isDefault) {
        // do nothing
      }

      const { error } = await supabase.from('user_locations').insert({
        user_id: user.id,
        name: finalName,
        city: selectedCity,
        address,
        latitude,
        longitude,
        is_default: isDefault,
      });

      if (error) throw error;

      // Reset form states
      setNewLocName('');
      setSelectedCity('Yaoundé');
      setAddress('');
      setModalVisible(false);

      fetchLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      Alert.alert('Error', 'Failed to save new location.');
    }
  };

  const getModeLabel = () => {
    if (themeMode === 'light') return 'Light';
    if (themeMode === 'dark') return 'Dark';
    return 'System';
  };

  const cycleTheme = () => {
    if (themeMode === 'light') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('system');
    else setThemeMode('light');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      setLoading(true);
      const { error } = await supabase.rpc('delete_user');

      if (error) throw error;
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', error.message || 'Could not delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const MenuItem = ({ icon: Icon, label, value, onPress, isLast, isDestructive }) => (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
      onPress={onPress}
    >
      <View style={styles.menuLeft}>
        <View style={[styles.menuIcon, { backgroundColor: isDestructive ? theme.colors.error + '12' : theme.colors.cardSecondary }]}>
          <Icon size={20} color={isDestructive ? theme.colors.error : theme.colors.primary} />
        </View>
        <Text style={[styles.menuLabel, { color: isDestructive ? theme.colors.error : theme.colors.text }]}>{label}</Text>
      </View>
      <View style={styles.menuRight}>
        {value && <Text style={[styles.menuValue, { color: theme.colors.textLight }]}>{value}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingBottom: 120 }, isDesktop && { maxWidth: 800, width: '100%', alignSelf: 'center' }]}>
        {/* Header Profile Info */}
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.surface }]}>
            <User size={50} color={theme.colors.primary} />
          </View>
          <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.full_name || 'User'}</Text>
          <Text style={[styles.email, { color: theme.colors.textLight }]}>{email}</Text>
        </View>

        {/* Saved Locations Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textLight }]}>Saved Locations</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.addLocBtn, { backgroundColor: theme.colors.primary }]}>
              <Plus size={14} color={theme.colors.white} />
              <Text style={[styles.addLocBtnText, { color: theme.colors.white }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {locationsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />
          ) : locations.length === 0 ? (
            <Card style={styles.emptyCard}>
              <MapPin size={24} color={theme.colors.textLight} />
              <Text style={[styles.emptyCardText, { color: theme.colors.textLight }]}>No locations saved yet.</Text>
            </Card>
          ) : (
            <Card style={styles.menuCard}>
              {(expandedLocations ? locations : locations.slice(0, 2)).map((loc, index) => {
                const isLast = index === (expandedLocations ? locations.length - 1 : Math.min(locations.length, 2) - 1);
                const isExpanded = !!expandedAddresses[loc.id];
                return (
                  <View 
                    key={loc.id} 
                    style={[
                      styles.locationRow, 
                      !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                      <TouchableOpacity 
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingRight: 8 }}
                        onPress={() => toggleAddressExpand(loc.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.locationIconBg, { backgroundColor: loc.is_default ? theme.colors.primary + '12' : theme.colors.cardSecondary, marginTop: 2 }]}>
                          <MapPin size={18} color={loc.is_default ? theme.colors.primary : theme.colors.textLight} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={[styles.locationRowName, { color: theme.colors.text }]}>{loc.name}</Text>
                            {loc.is_default && (
                              <View style={[styles.defaultBadge, { backgroundColor: theme.colors.primary + '1F' }]}>
                                <Star size={8} color={theme.colors.primary} fill={theme.colors.primary} />
                                <Text style={[styles.defaultBadgeText, { color: theme.colors.primary }]}>Default</Text>
                              </View>
                            )}
                          </View>
                          <Text 
                            style={[styles.locationRowAddress, { color: theme.colors.textLight }]} 
                            numberOfLines={isExpanded ? undefined : 1}
                          >
                            {loc.address}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.locationActionsRow}>
                        {!loc.is_default ? (
                          <TouchableOpacity onPress={() => handleSetDefault(loc.id)} style={styles.locStarBtn}>
                            <Star size={18} color={theme.colors.textLight} />
                          </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity onPress={() => handleDeleteLocation(loc.id)} style={styles.locDeleteBtn}>
                          <Trash2 size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
              
              {locations.length > 2 && (
                <TouchableOpacity
                  onPress={() => setExpandedLocations(!expandedLocations)}
                  style={[
                    styles.expandRow, 
                    { borderTopWidth: 1, borderTopColor: theme.colors.border }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.expandRowText, { color: theme.colors.primary }]}>
                    {expandedLocations ? 'Show Less' : `Show More (${locations.length - 2} more)`}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        </View>

        {/* Appearance Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textLight }]}>Appearance</Text>
          <Card style={styles.menuCard}>
            <MenuItem
              id="darkModeItem"
              icon={Moon}
              label="Dark Mode"
              value={getModeLabel()}
              onPress={cycleTheme}
              isLast={true}
            />
          </Card>
        </View>

        {/* Account Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textLight }]}>Account</Text>
          <Card style={styles.menuCard}>
            <MenuItem icon={Settings} label="Settings" onPress={() => setSettingsModalVisible(true)} />
            <MenuItem icon={Shield} label="Privacy & Security" onPress={() => { }} />
            <MenuItem icon={CircleHelp} label="Help & Support" isLast={true} onPress={() => { }} />
          </Card>
        </View>

        {/* Danger Zone Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Danger Zone</Text>
          <Card style={[styles.menuCard, { borderColor: theme.colors.error + '33', borderWidth: 1, marginTop: 10 }]}>
            <MenuItem
              icon={LogOut}
              label="Log Out"
              onPress={handleLogout}
              isDestructive={true}
            />
            <MenuItem
              icon={Trash2}
              label="Delete Account"
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'Are you sure you want to delete your account? This action is permanent and all your eco coins will be lost.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount },
                  ]
                );
              }}
              isLast={true}
              isDestructive={true}
            />
          </Card>
        </View>
      </ScrollView>

      {/* Add Location Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add New Location</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Location Name Input */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textLight }]}>Location Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.colors.inputBg, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="e.g. Home, Office, Beach House"
                placeholderTextColor={theme.colors.textLight}
                value={newLocName}
                onChangeText={setNewLocName}
              />

              {/* Search Bar + GPS */}
              <Text style={[styles.fieldLabel, { color: theme.colors.textLight, marginTop: 20 }]}>Address</Text>
              <View style={styles.searchRow}>
                <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border }]}>
                  <Search size={16} color={theme.colors.textLight} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search street, building or landmark..."
                    placeholderTextColor={theme.colors.textLight}
                    value={searchQuery}
                    onChangeText={handleSearch}
                  />
                </View>
                <TouchableOpacity onPress={handleGPSDetect} disabled={isDetectingGPS} style={[styles.gpsBtn, { backgroundColor: theme.colors.primary }]}>
                  {isDetectingGPS ? (
                    <ActivityIndicator size="small" color={theme.colors.white} />
                  ) : (
                    <Navigation size={16} color={theme.colors.white} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Search Autocomplete */}
              {searchResults.length > 0 && (
                <View style={[styles.searchResultsList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  {isSearching ? (
                    <ActivityIndicator style={{ padding: 10 }} color={theme.colors.primary} />
                  ) : (
                    searchResults.map((result) => (
                      <TouchableOpacity
                        key={result.id}
                        onPress={() => handleSearchResultSelect(result)}
                        style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
                      >
                        <MapPin size={14} color={theme.colors.primary} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.resultMain, { color: theme.colors.text }]} numberOfLines={1}>
                            {result.mainText}
                          </Text>
                          <Text style={[styles.resultSub, { color: theme.colors.textLight }]} numberOfLines={1}>
                            {result.secondaryText}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Selected Address Card */}
              {address ? (
                <View style={[styles.selectedAddressCard, { backgroundColor: theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
                  <MapPin size={18} color={theme.colors.accent} style={{ marginRight: 8, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedAddressLabel, { color: theme.colors.textLight }]}>Selected Address</Text>
                    <Text style={[styles.selectedAddressText, { color: theme.colors.text }]} numberOfLines={2}>
                      {address}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary, marginTop: 4 }}>
                      City: {selectedCity} (automatically detected)
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Submit Buttons */}
              <TouchableOpacity onPress={handleAddLocationSubmit} style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.saveBtnText, { color: theme.colors.white }]}>Save Location</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Settings</Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textLight }]}>Preferences</Text>
              <Card style={styles.menuCard}>
                <MenuItem
                  icon={Coins}
                  label="Preferred Currency"
                  value={getCurrencyLabel()}
                  onPress={cycleCurrency}
                  isLast={true}
                />
              </Card>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  addLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  addLocBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyCardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  locationCard: {
    padding: 16,
    marginVertical: 4,
  },
  locCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  locCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locName: {
    fontSize: 16,
    fontWeight: '700',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  locCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setDefaultBtn: {
    padding: 4,
  },
  setDefaultBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteLocBtn: {
    padding: 4,
  },
  locAddress: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginLeft: 26,
  },
  menuCard: {
    padding: 0,
    borderRadius: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  cityChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nicknameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  nicknameChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  locationRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  locationIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationRowName: {
    fontSize: 15,
    fontWeight: '700',
  },
  locationRowAddress: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  locationActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  locStarBtn: {
    padding: 4,
  },
  locDeleteBtn: {
    padding: 4,
  },
  expandRow: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandRowText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
  },
  gpsBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultsList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 180,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  resultMain: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultSub: {
    fontSize: 11,
    marginTop: 1,
  },
  selectedAddressCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
  },
  selectedAddressLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  selectedAddressText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  saveBtn: {
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
