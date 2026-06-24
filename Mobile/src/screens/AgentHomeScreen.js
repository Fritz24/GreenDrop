import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import {
  MapPin,
  ClipboardList,
  LogOut,
  Calendar,
  Clock,
  Package,
  ChevronDown,
  ChevronUp,
  CupSoda,
  FileText,
  Layers,
  Wine,
  Scale,
  X,
  Check,
  Phone
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const STATUS_COLOR = {
  pending: '#B08047',
  accepted: '#4A607A',
  collected: '#455A3F',
  cancelled: '#C45B52',
};

const MATERIAL_ICONS = {
  Plastic: CupSoda,
  Paper: FileText,
  Aluminum: Layers,
  Glass: Wine,
};

const PickupCard = ({ pickup, theme, isDarkTheme, onOpenWeighModal }) => {
  const [expanded, setExpanded] = useState(pickup.status === 'accepted');
  const materials = pickup.pickup_items || [];

  const scheduledDate = pickup.scheduled_date
    ? new Date(pickup.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '—';

  const openMaps = () => {
    if (!pickup.latitude || !pickup.longitude) {
      Alert.alert('No coordinates', 'This pickup has no GPS coordinates yet.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pickup.latitude},${pickup.longitude}&travelmode=driving`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps.'));
  };

  return (
    <Card style={styles.pickupCard}>
      {/* Card Header */}
      <TouchableOpacity style={styles.pickupHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={styles.pickupHeaderLeft}>
          <Text style={[styles.pickupUser, { color: theme.colors.text }]}>
            {pickup.user?.full_name || 'User'}
          </Text>
          <View style={styles.pickupMeta}>
            <Calendar size={12} color={theme.colors.textLight} />
            <Text style={[styles.pickupMetaText, { color: theme.colors.textLight }]}>{scheduledDate}</Text>
            {pickup.scheduled_time ? (
              <>
                <Clock size={12} color={theme.colors.textLight} />
                <Text style={[styles.pickupMetaText, { color: theme.colors.textLight }]}>{pickup.scheduled_time}</Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.pickupHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[pickup.status] || '#8C9E88') + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[pickup.status] || '#8C9E88' }]}>
              {pickup.status?.charAt(0).toUpperCase() + pickup.status?.slice(1)}
            </Text>
          </View>
          {expanded ? <ChevronUp size={16} color={theme.colors.textLight} /> : <ChevronDown size={16} color={theme.colors.textLight} />}
        </View>
      </TouchableOpacity>

      {/* Location row */}
      <View style={styles.locationRow}>
        <MapPin size={13} color={theme.colors.primary} />
        <Text style={[styles.locationText, { color: theme.colors.textLight }]} numberOfLines={1}>
          {pickup.address || 'No address provided'}
        </Text>
      </View>

      {/* Materials list overview */}
      {materials.length > 0 && (
        <View style={styles.materialsPillsRow}>
          {materials.map(m => {
            const IconComponent = MATERIAL_ICONS[m.materials?.name] || Package;
            return (
              <View key={m.id} style={[styles.materialPill, { backgroundColor: theme.colors.cardSecondary }]}>
                <IconComponent size={12} color={theme.colors.primary} />
                <Text style={[styles.materialPillText, { color: theme.colors.text }]}>
                  {m.materials?.name || 'Unknown'}: {m.weight_kg || 0} kg
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Expanded details */}
      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: theme.colors.border }]}>
          {/* Notes */}
          {pickup.notes ? (
            <View style={styles.notesBox}>
              <Text style={[styles.notesLabel, { color: theme.colors.textLight }]}>Notes</Text>
              <Text style={[styles.notesText, { color: theme.colors.text }]}>{pickup.notes}</Text>
            </View>
          ) : null}

          {/* Photo */}
          {pickup.photo_url ? (
            <View style={styles.photoContainer}>
              <Text style={[styles.notesLabel, { color: theme.colors.textLight, marginBottom: 4 }]}>Item Photo</Text>
              <Image
                source={{ uri: pickup.photo_url }}
                style={[styles.pickupImage, { borderColor: theme.colors.border }]}
                resizeMode="cover"
              />
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: theme.colors.primary, borderWidth: 1, backgroundColor: 'transparent' }]}
              onPress={openMaps}
            >
              <MapPin size={14} color={theme.colors.primary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>Navigate</Text>
            </TouchableOpacity>

            {pickup.user?.phone_number && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: theme.colors.primary, borderWidth: 1, backgroundColor: 'transparent' }]}
                onPress={() => Linking.openURL(`tel:${pickup.user.phone_number}`).catch(err => console.error(err))}
              >
                <Phone size={14} color={theme.colors.primary} />
                <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>Call</Text>
              </TouchableOpacity>
            )}

            {pickup.status === 'accepted' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => onOpenWeighModal(pickup)}
              >
                <Scale size={14} color="#fff" />
                <Text style={styles.actionBtnText}>Weigh & Collect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </Card>
  );
};

export const AgentHomeScreen = () => {
  const { theme, isDarkTheme } = useTheme();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('Agent');

  // Weigh modal states
  const [weighModalVisible, setWeighModalVisible] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [actualWeights, setActualWeights] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch agent profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profile) setAgentName(profile.full_name?.split(' ')[0] || 'Agent');

      // Fetch assigned pickups with full material info
      const { data } = await supabase
        .from('pickups')
        .select(`
          id, status, scheduled_date, scheduled_time, address, notes, latitude, longitude, photo_url,
          user:profiles!pickups_user_id_fkey(id, full_name, phone_number),
          pickup_items(id, weight_kg, material_id, materials(id, name, eco_coins_per_kg))
        `)
        .eq('agent_id', user.id)
        .order('scheduled_date', { ascending: true });

      setPickups(data || []);
    } catch (err) {
      console.error('AgentHomeScreen fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const handleOpenWeighModal = (pickup) => {
    setSelectedPickup(pickup);
    const initialWeights = {};
    pickup.pickup_items.forEach(item => {
      initialWeights[item.id] = String(item.weight_kg || '');
    });
    setActualWeights(initialWeights);
    setWeighModalVisible(true);
  };

  const handleWeightChange = (itemId, val) => {
    // Only allow decimals/numbers
    const clean = val.replace(/[^0-9.]/g, '');
    setActualWeights(prev => ({ ...prev, [itemId]: clean }));
  };

  const handleConfirmCollection = async () => {
    if (!selectedPickup) return;

    // Validate weights
    const itemsArray = [];
    for (const item of selectedPickup.pickup_items) {
      const weightVal = parseFloat(actualWeights[item.id]);
      if (isNaN(weightVal) || weightVal < 0) {
        Alert.alert('Invalid Weight', `Please enter a valid weight for ${item.materials?.name || 'materials'}.`);
        return;
      }
      itemsArray.push({
        item_id: item.id,
        weight_kg: weightVal,
      });
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('collect_pickup', {
        p_pickup_id: selectedPickup.id,
        p_items: itemsArray,
      });

      if (error) throw error;

      Alert.alert('Success! 🎉', 'Pickup completed and user balance credited.');
      setWeighModalVisible(false);
      setSelectedPickup(null);
      fetchPickups();
    } catch (err) {
      console.error('Confirm collection error:', err);
      Alert.alert('Error', err.message || 'Could not record collection.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = pickups.filter(p => p.status === 'accepted').length;
  const collectedCount = pickups.filter(p => p.status === 'collected').length;

  // Calculate dynamic summary inside modal
  const getModalSummary = () => {
    if (!selectedPickup) return { totalWeight: 0, totalCoins: 0 };
    let totalWeight = 0;
    let totalCoins = 0;
    selectedPickup.pickup_items.forEach(item => {
      const weight = parseFloat(actualWeights[item.id]) || 0;
      const rate = item.materials?.eco_coins_per_kg || 0;
      totalWeight += weight;
      totalCoins += Math.round(weight * rate);
    });
    return { totalWeight, totalCoins };
  };

  const modalSummary = getModalSummary();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <Header title="Agent Dashboard" subtitle={`Welcome, ${agentName}`} showIcons={false} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: isDarkTheme ? 'rgba(69,90,63,0.15)' : 'rgba(69,90,63,0.08)', borderRadius: 16 }]}>
          <Text style={[styles.statNum, { color: theme.colors.primary }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDarkTheme ? 'rgba(176,128,71,0.15)' : 'rgba(176,128,71,0.08)', borderRadius: 16 }]}>
          <Text style={[styles.statNum, { color: theme.colors.accent }]}>{collectedCount}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>Collected</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDarkTheme ? 'rgba(74,96,122,0.15)' : 'rgba(74,96,122,0.08)', borderRadius: 16 }]}>
          <Text style={[styles.statNum, { color: theme.colors.secondary }]}>{pickups.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textLight }]}>Total</Text>
        </View>
      </View>

      {/* Pickups list */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Assigned Pickups</Text>
          <TouchableOpacity onPress={fetchPickups}>
            <Text style={[styles.refreshBtn, { color: theme.colors.primary }]}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 30 }} />
        ) : pickups.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.04)' : theme.colors.cardSecondary, borderRadius: 20 }]}>
            <ClipboardList size={40} color={theme.colors.textLight} />
            <Text style={[styles.emptyText, { color: theme.colors.textLight }]}>No pickups assigned yet.</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textLight }]}>Check back after the admin assigns you a job.</Text>
          </View>
        ) : (
          pickups.map(p => (
            <PickupCard
              key={p.id}
              pickup={p}
              theme={theme}
              isDarkTheme={isDarkTheme}
              onOpenWeighModal={handleOpenWeighModal}
            />
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={theme.colors.error} />
        <Text style={[styles.logoutText, { color: theme.colors.error }]}>Log Out</Text>
      </TouchableOpacity>

      {/* Weigh & Confirm Modal */}
      {selectedPickup && (
        <Modal visible={weighModalVisible} animationType="slide" transparent={true}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableOpacity
              style={styles.modalDismissArea}
              activeOpacity={1}
              onPress={() => setWeighModalVisible(false)}
            />
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Weigh Materials</Text>
                  <Text style={[styles.modalSubtitle, { color: theme.colors.textLight }]}>
                    For {selectedPickup.user?.full_name || 'User'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setWeighModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Items Weigh List */}
              <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                {selectedPickup.pickup_items.map(item => {
                  const IconComponent = MATERIAL_ICONS[item.materials?.name] || Package;
                  const rate = item.materials?.eco_coins_per_kg || 0;
                  const weight = parseFloat(actualWeights[item.id]) || 0;
                  const calculatedCoins = Math.round(weight * rate);

                  return (
                    <View key={item.id} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
                      <View style={styles.itemLeft}>
                        <View style={[styles.itemIconBg, { backgroundColor: theme.colors.primary + '12' }]}>
                          <IconComponent size={18} color={theme.colors.primary} />
                        </View>
                        <View>
                          <Text style={[styles.itemName, { color: theme.colors.text }]}>
                            {item.materials?.name || 'Unknown'}
                          </Text>
                          <Text style={[styles.itemRate, { color: theme.colors.textLight }]}>
                            {rate} coins/kg • Est: {item.weight_kg || 0}kg
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemRight}>
                        <View style={[styles.inputContainer, { backgroundColor: theme.colors.inputBg, borderColor: theme.colors.border }]}>
                          <TextInput
                            style={[styles.weightInput, { color: theme.colors.text }]}
                            keyboardType="numeric"
                            value={actualWeights[item.id]}
                            onChangeText={(val) => handleWeightChange(item.id, val)}
                            placeholder="0.0"
                            placeholderTextColor={theme.colors.textLight}
                          />
                          <Text style={[styles.unitText, { color: theme.colors.textLight }]}>kg</Text>
                        </View>

                        <Text style={[styles.coinsEarned, { color: theme.colors.accent }]}>
                          +{calculatedCoins}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Bottom Summary Section */}
              <View style={[styles.summarySection, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.cardSecondary }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textLight }]}>Total Weight</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                    {modalSummary.totalWeight.toFixed(1)} kg
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textLight }]}>Eco-Coins Attributed</Text>
                  <Text style={[styles.summaryTotalCoins, { color: theme.colors.primary }]}>
                    {modalSummary.totalCoins}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleConfirmCollection}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Check size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Confirm & Credit Coins</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 4, marginBottom: 8 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  refreshBtn: { fontSize: 13, fontWeight: '600' },

  pickupCard: { padding: 14, marginBottom: 4, borderRadius: 16 },
  pickupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  pickupHeaderLeft: { flex: 1 },
  pickupHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickupUser: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  pickupMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pickupMetaText: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontSize: 12, flex: 1 },

  materialsPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  materialPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  materialPillText: { fontSize: 11, fontWeight: '600' },

  expandedSection: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, gap: 10 },
  notesBox: { gap: 2 },
  notesLabel: { fontSize: 11, fontWeight: '600' },
  notesText: { fontSize: 13 },
  photoContainer: { marginTop: 8 },
  pickupImage: { width: '100%', height: 160, borderRadius: 12, borderWidth: 1, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyState: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptySubtext: { fontSize: 12, textAlign: 'center' },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 },
  logoutText: { fontSize: 16, fontWeight: '700' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
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
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  itemIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemRate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 85,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  weightInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  coinsEarned: {
    fontSize: 13,
    fontWeight: '800',
    width: 75,
    textAlign: 'right',
  },

  summarySection: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryTotalCoins: {
    fontSize: 20,
    fontWeight: '800',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
