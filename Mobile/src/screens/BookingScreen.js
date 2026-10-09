import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  Animated,
  useWindowDimensions,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { searchLocations, reverseGeocode } from '../lib/maps';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  Calendar,
  Clock,
  Check,
  Search,
  X,
  ImageIcon,
  Leaf,
  Package,
  Navigation,
  Plus,
  CupSoda,
  FileText,
  Layers,
  Wine,
} from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIME_SLOTS = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

const isTimeSlotInPast = (dateStr, slot) => {
  if (!dateStr || !slot) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  if (dateStr !== todayStr) return false;

  const match = slot.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return false;

  let [_, hours, minutes, ampm] = match;
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);
  if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;

  const now = new Date();
  const slotDate = new Date(now);
  slotDate.setHours(hours, minutes, 0, 0);

  return slotDate < now;
};

const generateDates = () => {
  const dates = [];
  const today = new Date();
  
  const todayStr = today.toISOString().split('T')[0];
  const hasFutureSlots = TIME_SLOTS.some(slot => !isTimeSlotInPast(todayStr, slot));
  const startOffset = hasFutureSlots ? 0 : 1;

  for (let i = startOffset; i < 14 + startOffset; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    dates.push({
      display: `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`,
      full: dStr,
      isToday: dStr === todayStr,
      date: d,
    });
  }
  return dates;
};

const MATERIAL_ICONS = {
  Plastic: CupSoda,
  Paper: FileText,
  Aluminum: Layers,
  Glass: Wine,
};

const STEPS = ['Materials', 'Schedule', 'Location', 'Review'];

export const BookingScreen = ({ onNavigate }) => {
  const { theme, isDarkTheme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const scrollRef = useRef(null);
  const mapRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step state
  const [step, setStep] = useState(0);

  // Step 1: Materials
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState({}); // { materialId: { material, weight } }
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Step 2: Date & Time
  const [dates] = useState(generateDates);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Step 3: Location
  const [location, setLocation] = useState({ latitude: 0, longitude: 0, address: '' });
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Saved locations support
  const [savedLocations, setSavedLocations] = useState([]);
  const [loadingSavedLocations, setLoadingSavedLocations] = useState(false);
  const [selectedSavedLocId, setSelectedSavedLocId] = useState(null);

  // Step 4: Photo & Notes
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState('');

  // Submit state
  const [submitting, setSubmitting] = useState(false);

  // Fetch materials & saved locations
  useEffect(() => {
    supabase
      .from('materials')
      .select('id, name, eco_coins_per_kg')
      .order('name')
      .then(({ data }) => {
        setMaterials(data || []);
        setLoadingMaterials(false);
      });

    const loadSavedLocations = async () => {
      setLoadingSavedLocations(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('user_locations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });
          if (!error && data) {
            setSavedLocations(data);
            const defaultLoc = data.find(l => l.is_default);
            if (defaultLoc) {
              setSelectedSavedLocId(defaultLoc.id);
              setLocation({
                latitude: defaultLoc.latitude,
                longitude: defaultLoc.longitude,
                address: defaultLoc.address,
              });
              setLocationSearch(defaultLoc.address);
            } else if (data.length > 0) {
              setSelectedSavedLocId(data[0].id);
              setLocation({
                latitude: data[0].latitude,
                longitude: data[0].longitude,
                address: data[0].address,
              });
              setLocationSearch(data[0].address);
            } else {
              setSelectedSavedLocId('custom');
            }
          } else {
            setSelectedSavedLocId('custom');
          }
        } else {
          setSelectedSavedLocId('custom');
        }
      } catch (err) {
        console.error('Error fetching user locations in BookingScreen:', err);
        setSelectedSavedLocId('custom');
      } finally {
        setLoadingSavedLocations(false);
      }
    };
    
    loadSavedLocations();
  }, []);

  // Select first date by default
  useEffect(() => {
    if (dates.length > 0 && !selectedDate) {
      setSelectedDate(dates[0].full);
    }
  }, [dates]);

  // Adjust selectedTime when selectedDate changes to ensure it's not a past time slot
  useEffect(() => {
    if (selectedDate) {
      const isPast = isTimeSlotInPast(selectedDate, selectedTime);
      const available = TIME_SLOTS.filter(t => !isTimeSlotInPast(selectedDate, t));
      if (isPast || !selectedTime || !available.includes(selectedTime)) {
        if (available.length > 0) {
          setSelectedTime(available[0]);
        } else {
          setSelectedTime(null);
        }
      }
    }
  }, [selectedDate]);

  // Animate step transition
  const animateStep = useCallback((dir) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir === 'forward' ? -30 : 30, duration: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [slideAnim]);

  const goNext = () => {
    // Validate current step
    if (step === 0 && Object.keys(selectedMaterials).length === 0) {
      Alert.alert('Select Materials', 'Please select at least one material to recycle.');
      return;
    }
    if (step === 1 && (!selectedDate || !selectedTime)) {
      Alert.alert('Select Schedule', 'Please choose a date and time for your pickup.');
      return;
    }
    if (step === 2 && !location.address) {
      Alert.alert('Set Location', 'Please set your pickup location on the map.');
      return;
    }
    animateStep('forward');
    setStep(s => s + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const goBack = () => {
    if (step === 0) { onNavigate && onNavigate('home'); return; }
    animateStep('back');
    setStep(s => s - 1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Toggle material selection
  const toggleMaterial = (mat) => {
    setSelectedMaterials(prev => {
      if (prev[mat.id]) {
        const next = { ...prev };
        delete next[mat.id];
        return next;
      }
      return { ...prev, [mat.id]: { material: mat, weight: '' } };
    });
  };

  const setWeight = (matId, weight) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [matId]: { ...prev[matId], weight },
    }));
  };

  // Get current GPS location
  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to pin your pickup spot.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const address = await reverseGeocode(latitude, longitude);
      const newLoc = { latitude, longitude, address };
      setLocation(newLoc);
      setLocationSearch(address);
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 800);
    } catch (err) {
      Alert.alert('Location Error', 'Could not get your current location. Try searching manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Search locations via Nominatim
  const handleSearch = async (text) => {
    setLocationSearch(text);
    if (text.length < 3) { setSearchResults([]); return; }
    setIsSearching(true);
    const results = await searchLocations(text, 5);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectResult = (result) => {
    Keyboard.dismiss();
    const newLoc = { latitude: result.latitude, longitude: result.longitude, address: result.formattedAddress || result.name };
    setLocation(newLoc);
    setLocationSearch(result.name);
    setSearchResults([]);
    mapRef.current?.animateToRegion({ latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 800);
  };

  // Handle map marker drag to fine-tune location
  const handleMarkerDrag = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLocationLoading(true);
    const address = await reverseGeocode(latitude, longitude);
    setLocation({ latitude, longitude, address });
    setLocationSearch(address);
    setLocationLoading(false);
  };

  // Pick photo
  const handlePickPhoto = async (fromCamera) => {
    const picker = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhoto(result.assets[0]);
    }
  };

  // Upload photo to Supabase Storage
  const uploadPhoto = async (userId) => {
    if (!photo) return null;
    try {
      const ext = photo.uri.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${ext}`;
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error } = await supabase.storage
        .from('pickup-photos')
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('pickup-photos').getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      console.error('Photo upload error:', err);
      return null;
    }
  };

  // Submit booking
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload photo
      const photoUrl = await uploadPhoto(user.id);

      // Insert pickup
      const { data: pickup, error: pickupError } = await supabase
        .from('pickups')
        .insert({
          user_id: user.id,
          status: 'pending',
          scheduled_date: selectedDate,
          scheduled_time: selectedTime,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          notes: notes.trim() || null,
          photo_url: photoUrl,
          total_eco_coins_earned: 0,
        })
        .select()
        .single();

      if (pickupError) throw pickupError;

      // Insert pickup_items
      const materialRows = Object.values(selectedMaterials).map(({ material, weight }) => ({
        pickup_id: pickup.id,
        material_id: material.id,
        weight_kg: parseFloat(weight) || 0,
        eco_coins_earned: 0,
      }));
      if (materialRows.length > 0) {
        await supabase.from('pickup_items').insert(materialRows);
      }

      Alert.alert(
        '🌿 Pickup Requested!',
        `Your pickup has been scheduled for ${selectedDate} at ${selectedTime}. We'll notify you once an agent is assigned.`,
        [{ text: 'Great!', onPress: () => onNavigate && onNavigate('home') }]
      );
    } catch (err) {
      console.error('Booking error:', err);
      Alert.alert('Booking Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepIndicatorLine, { backgroundColor: theme.colors.border }]}>
        <View style={[
          styles.stepIndicatorActiveLine,
          {
            backgroundColor: theme.colors.primary,
            width: `${(step / (STEPS.length - 1)) * 100}%`
          }
        ]} />
      </View>
      
      <View style={styles.stepItemsRow}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[
              styles.stepDot,
              {
                borderColor: theme.colors.primary,
                backgroundColor: i < step
                  ? theme.colors.primary
                  : i === step
                    ? (isDarkTheme ? theme.colors.surface : '#fff')
                    : (isDarkTheme ? theme.colors.background : '#fff')
              }
            ]}>
              {i < step
                ? <Check size={12} color="#fff" />
                : <Text style={[styles.stepNum, { color: i === step ? theme.colors.primary : theme.colors.textLight }]}>{i + 1}</Text>
              }
            </View>
            <Text
              style={[
                styles.stepLabel,
                { color: i === step ? theme.colors.primary : theme.colors.textLight }
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderMaterialStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>What are you recycling?</Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textLight }]}>Select all that apply</Text>

      {loadingMaterials ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.materialGrid}>
          {materials.map(mat => {
            const selected = !!selectedMaterials[mat.id];
            return (
              <TouchableOpacity
                key={mat.id}
                style={[
                  styles.materialCard,
                  isDesktop && { width: '31%', maxWidth: 220 },
                  {
                    backgroundColor: isDarkTheme
                      ? selected ? (mat.color || theme.colors.primary) + '22' : 'rgba(255,255,255,0.04)'
                      : selected ? (mat.color || theme.colors.primary) + '12' : theme.colors.surface,
                    borderColor: selected ? (mat.color || theme.colors.primary) : theme.colors.border,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
                onPress={() => toggleMaterial(mat)}
                activeOpacity={0.8}
              >
                <View style={[styles.materialIcon, { backgroundColor: selected ? (mat.color || theme.colors.primary) + '20' : theme.colors.tint }]}>
                  {(() => {
                    const IconComponent = LucideIcons[mat.icon] || Leaf;
                    
                    return (
                      <IconComponent 
                        size={22} 
                        color={selected ? (mat.color || theme.colors.primary) : theme.colors.textLight} 
                        fill={selected && IconComponent === Leaf ? (mat.color || theme.colors.primary) : 'transparent'} 
                      />
                    );
                  })()}
                </View>
                <Text style={[styles.materialName, { color: selected ? (mat.color || theme.colors.primary) : theme.colors.text }]}>{mat.name}</Text>
                {mat.eco_coins_per_kg ? (
                  <Text style={[styles.materialCoins, { color: theme.colors.textLight }]}>~{mat.eco_coins_per_kg} coins/kg</Text>
                ) : null}
                {selected && (
                  <View style={[styles.checkBadge, { backgroundColor: mat.color || theme.colors.primary }]}>
                    <Check size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Weight inputs for selected */}
      {Object.values(selectedMaterials).length > 0 && (
        <View style={[styles.weightSection, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.04)' : theme.colors.cardSecondary, borderRadius: 16 }]}>
          <Text style={[styles.weightTitle, { color: theme.colors.text }]}>Estimated weight (optional)</Text>
          {Object.values(selectedMaterials).map(({ material, weight }) => (
            <View key={material.id} style={styles.weightRow}>
              <Text style={[styles.weightLabel, { color: theme.colors.textLight }]}>{material.name}</Text>
              <View style={[styles.weightInput, { borderColor: theme.colors.border, backgroundColor: theme.colors.inputBg }]}>
                <TextInput
                  style={{ color: theme.colors.text, flex: 1, fontSize: 14 }}
                  value={weight}
                  onChangeText={t => setWeight(material.id, t)}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="numeric"
                />
                <Text style={{ color: theme.colors.textLight, fontSize: 13 }}>kg</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderScheduleStep = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>When should we pick up?</Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textLight }]}>Choose a date and time slot</Text>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionLabel}>
          <Calendar size={16} color={theme.colors.primary} />
          <Text style={[styles.sectionLabelText, { color: theme.colors.text }]}>Date</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 2, paddingRight: 8 }}>
          {dates.map(d => {
            const sel = selectedDate === d.full;
            return (
              <TouchableOpacity
                key={d.full}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: sel
                      ? theme.colors.primary
                      : isDarkTheme ? 'rgba(255,255,255,0.06)' : theme.colors.surface,
                    borderColor: sel ? theme.colors.primary : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedDate(d.full)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateChipDay, { color: sel ? '#fff' : theme.colors.textLight }]}>
                  {d.display.split(',')[0]}
                </Text>
                <Text style={[styles.dateChipDate, { color: sel ? '#fff' : theme.colors.text }]}>
                  {d.display.split(', ')[1]}
                </Text>
                {d.isToday && <View style={[styles.todayDot, { backgroundColor: sel ? 'rgba(255,255,255,0.8)' : theme.colors.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionLabel}>
          <Clock size={16} color={theme.colors.primary} />
          <Text style={[styles.sectionLabelText, { color: theme.colors.text }]}>Time slot</Text>
        </View>
        <View style={styles.timeGrid}>
          {TIME_SLOTS.map(t => {
            const isPast = isTimeSlotInPast(selectedDate, t);
            const sel = selectedTime === t;
            return (
              <TouchableOpacity
                key={t}
                disabled={isPast}
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: sel
                      ? theme.colors.primary
                      : isPast
                        ? (isDarkTheme ? 'rgba(255,255,255,0.02)' : '#f1f5f9')
                        : isDarkTheme ? 'rgba(255,255,255,0.06)' : theme.colors.surface,
                    borderColor: sel 
                      ? theme.colors.primary 
                      : isPast 
                        ? (isDarkTheme ? 'rgba(255,255,255,0.04)' : '#e2e8f0') 
                        : theme.colors.border,
                    opacity: isPast ? 0.35 : 1,
                  },
                ]}
                onPress={() => setSelectedTime(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.timeChipText, { color: sel ? '#fff' : isPast ? theme.colors.textLight : theme.colors.text }]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderLocationStep = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Where are you?</Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textLight }]}>Choose a pickup address</Text>

        {/* Saved locations list */}
        {savedLocations.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={[styles.fieldLabel, { color: theme.colors.textLight }]}>Saved Locations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
              {savedLocations.map(loc => {
                const isSelected = selectedSavedLocId === loc.id;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => {
                      setSelectedSavedLocId(loc.id);
                      setLocation({ latitude: loc.latitude, longitude: loc.longitude, address: loc.address });
                      setLocationSearch(loc.address);
                      mapRef.current?.animateToRegion({ latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 800);
                    }}
                    style={[
                      styles.locSelectChip,
                      {
                        backgroundColor: isSelected ? theme.colors.primary + '1F' : theme.colors.cardSecondary,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <MapPin size={14} color={isSelected ? theme.colors.primary : theme.colors.textLight} />
                    <Text style={[styles.locSelectChipText, { color: isSelected ? theme.colors.primary : theme.colors.text }]}>
                      {loc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => {
                  setSelectedSavedLocId('custom');
                  setLocation({ latitude: 0, longitude: 0, address: '' });
                  setLocationSearch('');
                }}
                style={[
                  styles.locSelectChip,
                  {
                    backgroundColor: selectedSavedLocId === 'custom' ? theme.colors.primary + '1F' : theme.colors.cardSecondary,
                    borderColor: selectedSavedLocId === 'custom' ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Plus size={14} color={selectedSavedLocId === 'custom' ? theme.colors.primary : theme.colors.textLight} />
                <Text style={[styles.locSelectChipText, { color: selectedSavedLocId === 'custom' ? theme.colors.primary : theme.colors.text }]}>
                  New Location
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* If Custom Location is selected, show custom picker UI */}
        {(selectedSavedLocId === 'custom' || savedLocations.length === 0) ? (
          <>
            {/* GPS Button */}
            <TouchableOpacity
              style={[styles.gpsButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleGetLocation}
              disabled={locationLoading}
            >
              {locationLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Navigation size={16} color="#fff" />
              }
              <Text style={styles.gpsButtonText}>Use My Current Location</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.textLight }]}>or search</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            {/* Search */}
            <View style={[styles.searchBox, {
              backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.06)' : theme.colors.surface,
              borderColor: theme.colors.border,
            }]}>
              <Search size={18} color={theme.colors.textLight} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search address…"
                placeholderTextColor={theme.colors.textLight}
                value={locationSearch}
                onChangeText={handleSearch}
              />
              {isSearching && <ActivityIndicator size="small" color={theme.colors.primary} />}
              {locationSearch.length > 0 && !isSearching && (
                <TouchableOpacity onPress={() => { setLocationSearch(''); setSearchResults([]); }}>
                  <X size={16} color={theme.colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <View style={[styles.searchResults, { backgroundColor: isDarkTheme ? '#1E2A1C' : theme.colors.surface, borderColor: theme.colors.border }]}>
                {searchResults.map((r, idx) => (
                  <TouchableOpacity
                    key={r.id || idx}
                    style={[styles.searchResultItem, idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                    onPress={() => handleSelectResult(r)}
                  >
                    <MapPin size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.searchResultMain, { color: theme.colors.text }]} numberOfLines={1}>{r.name}</Text>
                      <Text style={[styles.searchResultSub, { color: theme.colors.textLight }]} numberOfLines={1}>{r.secondaryText}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : null}

        {/* Map */}
        {location.latitude !== 0 ? (
          <View style={[styles.mapWrapper, {
            borderColor: theme.colors.border,
            shadowColor: theme.colors.primary,
            shadowOpacity: isDarkTheme ? 0.15 : 0.08,
            shadowRadius: 12,
            elevation: 4,
            overflow: 'hidden',
          }]}>
            {Platform.OS === 'web' ? (
              <iframe
                title="Pickup Location Map"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: 16 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005}%2C${location.latitude - 0.005}%2C${location.longitude + 0.005}%2C${location.latitude + 0.005}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`}
              />
            ) : (
              <View style={[styles.mapPlaceholder, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.04)' : theme.colors.cardSecondary }]}>
                <MapPin size={36} color={theme.colors.primary} />
                <Text style={[styles.mapPlaceholderText, { color: theme.colors.text }]}>{location.address}</Text>
              </View>
            )}
            {(selectedSavedLocId === 'custom' || savedLocations.length === 0) && (
              <View style={[styles.mapOverlayHint, { backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)' }]}>
                <Text style={[styles.mapHintText, { color: theme.colors.text }]}>📍 Pickup Location</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.04)' : theme.colors.cardSecondary, borderColor: theme.colors.border }]}>
            <MapPin size={36} color={theme.colors.textLight} />
            <Text style={[styles.mapPlaceholderText, { color: theme.colors.textLight }]}>Select a saved location above or search for a new address</Text>
          </View>
        )}

        {location.address ? (
          <View style={[styles.addressChip, { backgroundColor: theme.colors.tint, borderColor: theme.colors.primary + '33' }]}>
            <MapPin size={14} color={theme.colors.primary} />
            <Text style={[styles.addressChipText, { color: theme.colors.primary }]} numberOfLines={2}>{location.address}</Text>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );

  const renderReviewStep = () => {
    const matList = Object.values(selectedMaterials);
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Almost done!</Text>
        <Text style={[styles.stepSubtitle, { color: theme.colors.textLight }]}>Review your booking</Text>

        {/* Summary card - glassmorphic */}
        <View style={[styles.summaryCard, {
          backgroundColor: isDarkTheme ? 'rgba(109,142,103,0.08)' : 'rgba(69,90,63,0.05)',
          borderColor: theme.colors.primary + '22',
        }]}>
          <SummaryRow icon={<Leaf size={16} color={theme.colors.primary} />} label="Materials" value={matList.map(m => m.material.name).join(', ')} theme={theme} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <SummaryRow icon={<Calendar size={16} color={theme.colors.primary} />} label="Date" value={selectedDate} theme={theme} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <SummaryRow icon={<Clock size={16} color={theme.colors.primary} />} label="Time" value={selectedTime} theme={theme} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.border }]} />
          <SummaryRow icon={<MapPin size={16} color={theme.colors.primary} />} label="Location" value={location.address} theme={theme} />
        </View>

        {/* Photo */}
        <Text style={[styles.photoLabel, { color: theme.colors.text }]}>Attach a photo <Text style={{ color: theme.colors.textLight }}>(optional)</Text></Text>
        {photo ? (
          <View style={styles.photoPreviewWrap}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <TouchableOpacity style={[styles.removePhoto, { backgroundColor: theme.colors.error }]} onPress={() => setPhoto(null)}>
              <X size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.06)' : theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => handlePickPhoto(true)}
            >
              <Camera size={20} color={theme.colors.primary} />
              <Text style={[styles.photoBtnText, { color: theme.colors.text }]}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.06)' : theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => handlePickPhoto(false)}
            >
              <ImageIcon size={20} color={theme.colors.primary} />
              <Text style={[styles.photoBtnText, { color: theme.colors.text }]}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Notes */}
        <Text style={[styles.photoLabel, { color: theme.colors.text, marginTop: 16 }]}>Notes <Text style={{ color: theme.colors.textLight }}>(optional)</Text></Text>
        <TextInput
          style={[styles.notesInput, {
            backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.05)' : theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          multiline
          numberOfLines={3}
          placeholder="Any special instructions for the agent?"
          placeholderTextColor={theme.colors.textLight}
          value={notes}
          onChangeText={setNotes}
        />

        {/* Info note */}
        <View style={[styles.infoNote, { backgroundColor: theme.colors.tint, borderColor: theme.colors.primary + '33' }]}>
          <Text style={[styles.infoNoteText, { color: theme.colors.primary }]}>
            🌿 An agent will be assigned and you'll be notified within 24 hours.
          </Text>
        </View>
      </View>
    );
  };

  const stepRender = [renderMaterialStep, renderScheduleStep, renderLocationStep, renderReviewStep][step];

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, isDesktop && { maxWidth: 760, width: '100%', alignSelf: 'center' }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <ChevronLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Book a Pickup</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {stepRender()}
        </Animated.View>
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.bottomNav, {
        bottom: isDesktop ? 20 : (70 + Math.max(insets.bottom, 15) + 10),
        zIndex: 100,
      }, isDesktop && { maxWidth: 760, width: '100%', alignSelf: 'center', left: 0, right: 0 }]}>
        {step < STEPS.length - 1 ? (
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.colors.primary }]} onPress={goNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <ChevronRight size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: submitting ? theme.colors.textLight : theme.colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Leaf size={18} color="#fff" />
                <Text style={styles.nextBtnText}>Confirm Booking</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Small helper component
const SummaryRow = ({ icon, label, value, theme }) => (
  <View style={styles.summaryRow}>
    <View style={styles.summaryIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.summaryLabel, { color: theme.colors.textLight }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.colors.text }]} numberOfLines={2}>{value || '—'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  // Step indicator
  stepIndicator: {
    position: 'relative',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 12,
  },
  stepIndicatorLine: {
    position: 'absolute',
    top: 30,
    left: 48,
    right: 48,
    height: 2,
    zIndex: 0,
  },
  stepIndicatorActiveLine: {
    height: '100%',
  },
  stepItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Content
  stepContent: { paddingHorizontal: 20, paddingTop: 8 },
  stepTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, marginBottom: 20 },

  // Materials
  materialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  materialCard: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  materialIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  materialName: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  materialCoins: { fontSize: 11, textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  weightSection: { padding: 16, marginTop: 4 },
  weightTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  weightLabel: { fontSize: 14, flex: 1 },
  weightInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, width: 90, gap: 4 },

  // Schedule
  sectionBlock: { marginBottom: 24 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionLabelText: { fontSize: 15, fontWeight: '700' },
  dateChip: { borderRadius: 14, borderWidth: 1, padding: 12, marginRight: 10, alignItems: 'center', minWidth: 80 },
  dateChipDay: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  dateChipDate: { fontSize: 12, fontWeight: '700' },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: { borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14 },
  timeChipText: { fontSize: 13, fontWeight: '600' },

  // Location
  gpsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, marginBottom: 16 },
  gpsButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  searchResults: { borderWidth: 1, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  searchResultMain: { fontSize: 13, fontWeight: '600' },
  searchResultSub: { fontSize: 11, marginTop: 1 },

  mapWrapper: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  map: { width: '100%', height: '100%' },
  mapOverlayHint: { position: 'absolute', bottom: 10, left: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  mapHintText: { fontSize: 11, fontWeight: '600' },
  mapPlaceholder: { height: 200, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  mapPlaceholderText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  markerContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  addressChip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  addressChipText: { fontSize: 12, fontWeight: '600', flex: 1 },

  // Review
  summaryCard: { borderRadius: 20, borderWidth: 1, padding: 4, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  summaryIcon: { width: 24, alignItems: 'center', marginTop: 2 },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  summaryValue: { fontSize: 13, fontWeight: '600' },
  summaryDivider: { height: 1, marginHorizontal: 14 },

  photoLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  photoBtnText: { fontSize: 13, fontWeight: '600' },
  photoPreviewWrap: { position: 'relative', marginBottom: 4 },
  photoPreview: { width: '100%', height: 200, borderRadius: 16 },
  removePhoto: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  notesInput: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  infoNote: { marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoNoteText: { fontSize: 13, fontWeight: '600', lineHeight: 20 },

  // Bottom nav
  bottomNav: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  locSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  locSelectChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 2,
  },
});
