import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { reverseGeocode } from '../lib/maps';
import { Leaf, Navigation, MapPin, ChevronLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const CITIES = [
  { name: 'Yaoundé', latitude: 3.8480, longitude: 11.5021, image: require('../../assets/yaounde.png') },
  { name: 'Douala', latitude: 4.0511, longitude: 9.7679, image: require('../../assets/douala.png') },
  { name: 'Bafoussam', latitude: 5.4778, longitude: 10.4178, image: require('../../assets/bafoussam.png') },
  { name: 'Bamenda', latitude: 5.9631, longitude: 10.1591, image: require('../../assets/bamenda.png') },
];

const minimalistMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] }
];

const darkMinimalistMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1e241c" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1e241c" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2a3227" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e241c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d110b" }] }
];

const TypingText = ({ text, style }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setDisplayedText('');
    if (!text) return;
    
    let currentText = '';
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < text.length) {
        currentText += text.charAt(index);
        setDisplayedText(currentText);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 150);
    
    return () => clearInterval(interval);
  }, [text]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return <Text style={style}>{displayedText}{showCursor ? '|' : ' '}</Text>;
};

export const LocationOnboardingScreen = ({ onDone }) => {
  const { theme, isDarkTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [step, setStep] = useState('detect');
  const [randomCity, setRandomCity] = useState(CITIES[0]);
  const [locationName, setLocationName] = useState('Home');
  const [address, setAddress] = useState('Locating...');
  const [city, setCity] = useState('Yaoundé');
  const [region, setRegion] = useState({
    latitude: 3.8480,
    longitude: 11.5021,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pulse animation for the center pin
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Shuffle the random city for the detect screen
    const randomIndex = Math.floor(Math.random() * CITIES.length);
    setRandomCity(CITIES[randomIndex]);
  }, []);

  useEffect(() => {
    if (step === 'success') {
      Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 2.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [step]);

  const handleCurrentLocation = async () => {
    setIsDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission denied. Please select manually on the map.');
        setIsDetecting(false);
        handleSomewhereElse();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = location.coords;
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
      setStep('success');
      setTimeout(() => {
         mapRef.current?.animateToRegion(newRegion, 1000);
      }, 500);
      
      updateAddressForCoords(lat, lng);
    } catch (error) {
      console.error('GPS detection error:', error);
      alert('Could not determine location. Please select manually.');
      handleSomewhereElse();
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSomewhereElse = () => {
    // Navigate to map screen, default to the shuffled city's location
    const newRegion = {
      latitude: randomCity.latitude,
      longitude: randomCity.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    setRegion(newRegion);
    setStep('success');
    updateAddressForCoords(newRegion.latitude, newRegion.longitude);
  };

  const updateAddressForCoords = async (lat, lng) => {
    try {
      setAddress('Fetching address...');
      const detectedAddress = await reverseGeocode(lat, lng);
      setAddress(detectedAddress || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
      // Basic city extraction or default
      if (detectedAddress && detectedAddress.includes('Douala')) setCity('Douala');
      else if (detectedAddress && detectedAddress.includes('Yaoundé')) setCity('Yaoundé');
      else if (detectedAddress && detectedAddress.includes('Bafoussam')) setCity('Bafoussam');
      else if (detectedAddress && detectedAddress.includes('Bamenda')) setCity('Bamenda');
      else setCity('Cameroon');
    } catch (e) {
      setAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
    }
  };

  const onRegionChangeComplete = async (newRegion) => {
    setRegion(newRegion);
    updateAddressForCoords(newRegion.latitude, newRegion.longitude);
  };

  const handleConfirm = async () => {
    if (!locationName.trim()) {
      alert('Please enter a name for this location.');
      return;
    }

    setIsSaving(true);
    const locationData = {
      name: locationName.trim(),
      city: city,
      address: address,
      latitude: region.latitude,
      longitude: region.longitude,
      is_default: true,
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // User is logged in, write directly to database
        const { error } = await supabase.from('user_locations').insert({
          user_id: user.id,
          name: locationData.name,
          city: locationData.city,
          address: locationData.address,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          is_default: true,
        });

        if (error) throw error;
        
        // Also mark as completed for this specific user in storage
        await AsyncStorage.setItem('@location_onboarding_completed_' + user.id, 'true');
      } else {
        // Fallback to onboarding storage if session is not loaded yet
        await AsyncStorage.setItem('@onboarding_location', JSON.stringify(locationData));
      }
      
      await AsyncStorage.setItem('@location_onboarding_completed', 'true');
      onDone();
    } catch (error) {
      console.error('Error saving onboarding location:', error);
      alert('Failed to save location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      await AsyncStorage.removeItem('@onboarding_location');
      onDone();
    } catch (e) {
      onDone();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkTheme ? theme.colors.background : '#F9F9F7' }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* HEADER WITH SKIP (Visible in both steps at top) */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 10, position: 'absolute', top: 0, zIndex: 10 }]}>
        {step === 'success' && (
          <TouchableOpacity
            onPress={() => setStep('detect')}
            style={[
              styles.backCircleBtn,
              { backgroundColor: isDarkTheme ? theme.colors.surface : '#FFFFFF', borderColor: isDarkTheme ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <ChevronLeft size={20} color={isDarkTheme ? theme.colors.text : '#1A1A1A'} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <View style={[styles.skipBadge, { backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)' }]}>
             <Text style={[styles.skipText, { color: isDarkTheme ? '#FFFFFF' : '#1A1A1A' }]}>Skip</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* STEP 1: DETECT VIEW */}
      {step === 'detect' && (
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 60, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
          {/* Title Heading */}
          <Text style={[styles.mainTitle, { color: isDarkTheme ? theme.colors.text : '#1A1A1A' }]}>
            Where's your pickup spot?
          </Text>

          {/* City Graphic Card */}
          <View style={styles.cardContainer}>
            <View style={[styles.cityCardFrame, { shadowColor: theme.colors.black }]}>
              <Image source={randomCity.image} style={styles.cityCardImage} />
              
              {/* Overlay pill displaying Animated City Name */}
              <View style={[styles.cityPill, { backgroundColor: isDarkTheme ? theme.colors.surface : '#FFFFFF' }]}>
                <MapPin size={22} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <TypingText 
                  text={randomCity.name} 
                  style={[styles.cityPillText, { color: isDarkTheme ? theme.colors.text : '#1A1A1A' }]} 
                />
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <TouchableOpacity
              onPress={handleCurrentLocation}
              disabled={isDetecting}
              style={[styles.blackButton, { backgroundColor: theme.colors.primary }]}
            >
              {isDetecting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Navigation size={18} color="#FFFFFF" style={{ marginRight: 8, transform: [{ rotate: '45deg' }] }} />
                  <Text style={styles.blackButtonText}>Current location</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSomewhereElse}
              style={[
                styles.outlinedButton,
                { borderColor: isDarkTheme ? 'rgba(255,255,255,0.15)' : '#E2E8F0' },
              ]}
            >
              <Text style={[styles.outlinedButtonText, { color: isDarkTheme ? theme.colors.text : '#1A1A1A' }]}>
                Somewhere else
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 2: SUCCESS VIEW (Map) */}
      {step === 'success' && (
        <View style={StyleSheet.absoluteFillObject}>
          {/* Full Screen Map */}
          {Platform.OS === 'web' ? (
            <iframe
              title="Location Map"
              width="100%"
              height="100%"
              style={{ border: 0, width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${region.longitude - 0.01}%2C${region.latitude - 0.01}%2C${region.longitude + 0.01}%2C${region.latitude + 0.01}&layer=mapnik&marker=${region.latitude}%2C${region.longitude}`}
            />
          ) : null}

          {/* Center Pin (Leaf) */}
          <View style={styles.centerPinContainer} pointerEvents="none">
            <Animated.View
              style={[
                styles.pulsingRing,
                {
                  borderColor: theme.colors.primary,
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <View style={[styles.pinDrop, { backgroundColor: theme.colors.primary }]}>
              <Leaf size={24} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <View style={[styles.pinPoint, { borderTopColor: theme.colors.primary }]} />
          </View>

          {/* Bottom Card */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.bottomCardWrapper}
            pointerEvents="box-none"
          >
            <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 24), backgroundColor: isDarkTheme ? '#181A16' : '#FFFFFF' }]}>
              
              <View style={styles.cardHeader}>
                 <Text style={[styles.cardTitle, { color: isDarkTheme ? theme.colors.text : '#1A1A1A' }]}>Set Location</Text>
                 <TouchableOpacity 
                   onPress={handleCurrentLocation} 
                   style={[styles.myLocationBtn, { backgroundColor: theme.colors.tint }]}
                 >
                   {isDetecting ? (
                     <ActivityIndicator size="small" color={theme.colors.primary} />
                   ) : (
                     <Navigation size={18} color={theme.colors.primary} />
                   )}
                 </TouchableOpacity>
              </View>

              <View style={[styles.inputContainer, { backgroundColor: isDarkTheme ? '#242820' : '#F1F5F9' }]}>
                <Text style={[styles.inputLabel, { color: theme.colors.textLight }]}>Name this location</Text>
                <TextInput
                  style={[styles.textInput, { color: isDarkTheme ? theme.colors.text : '#1A1A1A' }]}
                  value={locationName}
                  onChangeText={setLocationName}
                  placeholder="e.g. Home, Office, School"
                  placeholderTextColor={theme.colors.textLight}
                  maxLength={30}
                />
              </View>

              <View style={styles.addressContainer}>
                <MapPin size={20} color={theme.colors.primary} style={{ marginTop: 2 }} />
                <Text style={[styles.addressText, { color: isDarkTheme ? theme.colors.textLight : '#64748B' }]} numberOfLines={2}>
                  {address}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isSaving}
                style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Location</Text>
                )}
              </TouchableOpacity>

            </View>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  backCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skipButton: {
    padding: 4,
  },
  skipBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
    marginTop: 10,
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  cityCardFrame: {
    width: '100%',
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cityCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cityPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  cityPillText: {
    fontSize: 18,
    fontWeight: '800',
  },
  footerContainer: {
    width: '100%',
    gap: 12,
  },
  blackButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  blackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  outlinedButton: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  outlinedButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -55, 
    width: 50,
    height: 60,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 5,
  },
  pinDrop: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 2,
  },
  pinPoint: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
    zIndex: 1,
  },
  pulsingRing: {
    position: 'absolute',
    top: 3,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  bottomCardWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  myLocationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
    margin: 0,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 10,
    fontWeight: '500',
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
