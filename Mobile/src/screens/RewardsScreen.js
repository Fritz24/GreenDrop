import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Coffee, Ticket, Zap, ShoppingBag, Coins, Award, Sparkles, AlertCircle, CheckCircle2, ChevronRight, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

const REWARDS = [
    {
        id: '1',
        title: 'Starbucks Coffee',
        description: 'Get any medium craft beverage for free',
        cost: 500,
        icon: 'coffee',
        category: 'Food & Drinks',
        color: '#1E3932', // Deep green Starbucks brand
        textColor: '#FFFFFF'
    },
    {
        id: '2',
        title: 'Transit Bus Pass',
        description: '1-day unlimited local travel pass',
        cost: 1200,
        icon: 'ticket',
        category: 'Transit',
        color: '#4A607A',
        textColor: '#FFFFFF'
    },
    {
        id: '3',
        title: 'Electricity Credit',
        description: '$10 utility bill discount credit',
        cost: 2000,
        icon: 'zap',
        category: 'Utilities',
        color: '#D97706',
        textColor: '#FFFFFF'
    },
    {
        id: '4',
        title: 'Amazon Voucher',
        description: '$10 Gift Card for any online items',
        cost: 2500,
        icon: 'shopping-bag',
        category: 'Shopping',
        color: '#FF9900',
        textColor: '#111111'
    },
    {
        id: '5',
        title: 'Organic Food Market',
        description: '15% discount on fresh organic veggies',
        cost: 800,
        icon: 'coffee',
        category: 'Food & Drinks',
        color: '#15803D',
        textColor: '#FFFFFF'
    },
    {
        id: '6',
        title: 'Cinema Ticket',
        description: '1 standard entry ticket for any movie',
        cost: 1500,
        icon: 'ticket',
        category: 'Transit', // Matches Ticket icon
        color: '#7C3AED',
        textColor: '#FFFFFF'
    }
];

const CATEGORIES = ['All', 'Food & Drinks', 'Transit', 'Utilities', 'Shopping'];

export const RewardsScreen = ({ onNavigate, activeTab }) => {
    const { theme, isDarkTheme } = useTheme();
    const [profile, setProfile] = useState(null);
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('All');
    
    // Redemption states
    const [selectedReward, setSelectedReward] = useState(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [redeeming, setRedeeming] = useState(false);
    const [voucherCode, setVoucherCode] = useState('');

    useEffect(() => {
        if (activeTab === 'rewards') {
            fetchProfile();
            fetchLevels();
        }
    }, [activeTab]);

    const fetchProfile = async () => {
        try {
            if (!profile) {
                setLoading(true);
            }
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (data) {
                setProfile(data);
            }
        } catch (error) {
            console.error('Error fetching profile for rewards:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchLevels = async () => {
        try {
            const { data, error } = await supabase
                .from('levels')
                .select('*')
                .order('min_points', { ascending: true });
            if (data && !error) {
                setLevels(data);
            }
        } catch (error) {
            console.error('Error fetching levels from DB:', error);
        }
    };

    const getLevelInfo = (points) => {
        if (!levels || levels.length === 0) {
            // Fallback default levels if database levels not yet loaded
            return {
                name: 'Eco Rookie',
                min: 0,
                max: 1000,
                next: 'Eco Enthusiast',
                progress: Math.min(points / 1000, 1)
            };
        }
        
        // Find current level
        let currentLvl = levels[0];
        let nextLvl = null;
        
        for (let i = 0; i < levels.length; i++) {
            if (points >= levels[i].min_points) {
                currentLvl = levels[i];
                nextLvl = levels[i + 1] || null;
            }
        }
        
        const min = currentLvl.min_points;
        const max = currentLvl.max_points;
        const name = currentLvl.name;
        const next = nextLvl ? nextLvl.name : (currentLvl.next_level_name || 'Max Rank');
        
        // Calculate progress
        let progress = 0;
        if (max > min) {
            progress = Math.min((points - min) / (max - min), 1);
        } else {
            progress = 1;
        }
        
        return {
            name,
            min,
            max,
            next,
            progress
        };
    };

    const getIcon = (type, color) => {
        const props = { size: 24, color: color };
        switch (type) {
            case 'coffee': return <Coffee {...props} />;
            case 'ticket': return <Ticket {...props} />;
            case 'zap': return <Zap {...props} />;
            case 'shopping-bag': return <ShoppingBag {...props} />;
            default: return <Sparkles {...props} />;
        }
    };

    const handleOpenConfirm = (reward) => {
        setSelectedReward(reward);
        setConfirmModalVisible(true);
    };

    const handleRedeem = async () => {
        if (!selectedReward || !profile) return;
        const currentBalance = profile.eco_coins_balance || 0;
        
        if (currentBalance < selectedReward.cost) {
            Alert.alert('Insufficient Balance', 'You need more Eco Coins to redeem this reward.');
            setConfirmModalVisible(false);
            return;
        }

        try {
            setRedeeming(true);
            const newBalance = currentBalance - selectedReward.cost;

            // Deduct points
            const { error } = await supabase
                .from('profiles')
                .update({ eco_coins_balance: newBalance })
                .eq('id', profile.id);

            if (error) throw error;

            // Generate voucher code
            const randomCode = 'GD-' + selectedReward.title.substring(0, 3).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            setVoucherCode(randomCode);

            // Update local profile balance immediately
            setProfile(prev => ({ ...prev, eco_coins_balance: newBalance }));
            
            setConfirmModalVisible(false);
            setSuccessModalVisible(true);
        } catch (err) {
            console.error('Error redeeming reward:', err);
            Alert.alert('Redemption Failed', 'An error occurred. Please try again.');
        } finally {
            setRedeeming(false);
        }
    };

    const filteredRewards = REWARDS.filter(item => 
        activeCategory === 'All' || item.category === activeCategory
    );

    const levelInfo = getLevelInfo(profile?.eco_coins_balance || 0);

    const renderRewardItem = ({ item }) => {
        const canAfford = (profile?.eco_coins_balance || 0) >= item.cost;

        return (
            <Card style={styles.rewardCard}>
                <View style={[styles.rewardIconWrapper, { backgroundColor: item.color + '1A' }]}>
                    {getIcon(item.icon, item.color)}
                </View>
                <View style={styles.rewardDetails}>
                    <Text style={[styles.rewardTitle, { color: theme.colors.text }]}>{item.title}</Text>
                    <Text style={[styles.rewardDesc, { color: theme.colors.textLight }]} numberOfLines={1}>
                        {item.description}
                    </Text>
                    <View style={styles.priceRow}>
                        <Coins size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.costText, { color: theme.colors.primary }]}>{item.cost} Eco Coins</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[
                        styles.redeemBtn,
                        canAfford 
                            ? { backgroundColor: theme.colors.primary }
                            : { backgroundColor: theme.colors.cardSecondary }
                    ]}
                    onPress={() => handleOpenConfirm(item)}
                    activeOpacity={canAfford ? 0.7 : 1}
                >
                    <Text style={[
                        styles.redeemBtnText, 
                        canAfford ? { color: '#FFFFFF' } : { color: theme.colors.textLight }
                    ]}>
                        {canAfford ? 'Redeem' : 'Locked'}
                    </Text>
                </TouchableOpacity>
            </Card>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Header 
                title="Green Rewards" 
                subtitle="Redeem your earned eco coins" 
                showIcons={false} 
            />

            {loading && !profile ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
                    {/* Glassmorphic Gradient Balance Card */}
                    <View style={styles.cardContainer}>
                        <LinearGradient
                            colors={[theme.colors.primaryDark, theme.colors.primary, theme.colors.secondary]}
                            start={{ x: 0.1, y: 0.1 }}
                            end={{ x: 0.9, y: 0.9 }}
                            style={[styles.balanceCard, { shadowColor: theme.colors.primaryDark }]}
                        >
                            <View style={styles.balanceHeader}>
                                <View style={styles.badgeRow}>
                                    <Award size={16} color="#FCD34D" fill="#FCD34D" />
                                    <Text style={styles.levelBadge}>{levelInfo.name}</Text>
                                </View>
                                <Text style={styles.cardLabel}>available eco balance</Text>
                            </View>

                            <View style={styles.balanceRow}>
                                <Text style={styles.balanceValue}>
                                    {(profile?.eco_coins_balance || 0).toLocaleString()}
                                </Text>
                                <Text style={styles.pointsSuffix}> coins</Text>
                            </View>

                            {/* Level Progression */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressLabelRow}>
                                    <Text style={styles.progressLabel}>Next Level: {levelInfo.next}</Text>
                                    <Text style={styles.progressPercent}>{Math.round(levelInfo.progress * 100)}%</Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${levelInfo.progress * 100}%` }]} />
                                </View>
                                <Text style={styles.pointsNeededText}>
                                    {levelInfo.max - (profile?.eco_coins_balance || 0)} coins to rank up
                                </Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Category ScrollView */}
                    <View style={styles.categoryWrapper}>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoryScroll}
                        >
                            {CATEGORIES.map(category => {
                                const isActive = activeCategory === category;
                                return (
                                    <TouchableOpacity
                                        key={category}
                                        onPress={() => setActiveCategory(category)}
                                        style={[
                                            styles.categoryPill,
                                            { 
                                                backgroundColor: isActive ? theme.colors.primary : theme.colors.cardSecondary,
                                                borderColor: isActive ? theme.colors.primary : theme.colors.border
                                            }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.categoryText,
                                            { color: isActive ? '#FFFFFF' : theme.colors.text }
                                        ]}>
                                            {category}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Rewards List Header */}
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Featured Rewards</Text>

                    {/* List */}
                    <FlatList
                        data={filteredRewards}
                        renderItem={renderRewardItem}
                        keyExtractor={item => item.id}
                        scrollEnabled={false}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyView}>
                                <AlertCircle size={40} color={theme.colors.textLight} />
                                <Text style={[styles.emptyText, { color: theme.colors.textLight }]}>
                                    No rewards available in this category.
                                </Text>
                            </View>
                        )}
                    />
                </ScrollView>
            )}

            {/* Modal 1: Confirmation */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={confirmModalVisible}
                onRequestClose={() => setConfirmModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.confirmModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Text style={[styles.confirmTitle, { color: theme.colors.text }]}>Confirm Redemption</Text>
                        
                        {selectedReward && (
                            <View style={styles.confirmDetails}>
                                <View style={[styles.modalRewardIcon, { backgroundColor: selectedReward.color + '1A' }]}>
                                    {getIcon(selectedReward.icon, selectedReward.color)}
                                </View>
                                <Text style={[styles.confirmRewardTitle, { color: theme.colors.text }]}>{selectedReward.title}</Text>
                                <Text style={[styles.confirmRewardDesc, { color: theme.colors.textLight }]}>{selectedReward.description}</Text>
                                
                                <View style={[styles.confirmBillBox, { backgroundColor: theme.colors.cardSecondary }]}>
                                    <View style={styles.billRow}>
                                        <Text style={[styles.billLabel, { color: theme.colors.textLight }]}>Your Balance:</Text>
                                        <Text style={[styles.billValue, { color: theme.colors.text }]}>{profile?.eco_coins_balance} coins</Text>
                                    </View>
                                    <View style={styles.billRow}>
                                        <Text style={[styles.billLabel, { color: theme.colors.textLight }]}>Cost:</Text>
                                        <Text style={[styles.billValue, { color: theme.colors.error }]}>-{selectedReward.cost} coins</Text>
                                    </View>
                                    <View style={[styles.billDivider, { backgroundColor: theme.colors.border }]} />
                                    <View style={styles.billRow}>
                                        <Text style={[styles.billLabel, { color: theme.colors.text, fontWeight: '700' }]}>Remaining:</Text>
                                        <Text style={[styles.billValue, { color: theme.colors.primary, fontWeight: '700' }]}>
                                            {(profile?.eco_coins_balance || 0) - selectedReward.cost} coins
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity 
                                style={[styles.modalCancelBtn, { borderColor: theme.colors.border }]}
                                onPress={() => setConfirmModalVisible(false)}
                                disabled={redeeming}
                            >
                                <Text style={[styles.modalCancelText, { color: theme.colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalConfirmBtn, { backgroundColor: theme.colors.primary }]}
                                onPress={handleRedeem}
                                disabled={redeeming}
                            >
                                {redeeming ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Redeem Now</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal 2: Success Redemption Card */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={successModalVisible}
                onRequestClose={() => setSuccessModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.successModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <TouchableOpacity 
                            style={styles.closeModalX} 
                            onPress={() => setSuccessModalVisible(false)}
                        >
                            <X size={24} color={theme.colors.textLight} />
                        </TouchableOpacity>

                        <View style={styles.successHeader}>
                            <View style={styles.successIconOuter}>
                                <CheckCircle2 size={36} color="#22C55E" />
                            </View>
                            <Text style={[styles.successTitle, { color: theme.colors.text }]}>Redeemed Successfully!</Text>
                            <Text style={[styles.successDesc, { color: theme.colors.textLight }]}>
                                Show the barcode below to the store operator to claim your reward.
                            </Text>
                        </View>

                        {selectedReward && (
                            <View style={[styles.voucherCardContainer, { borderColor: theme.colors.border }]}>
                                {/* Voucher Card Design */}
                                <LinearGradient
                                    colors={[selectedReward.color, selectedReward.color + 'DD']}
                                    style={styles.voucherGradient}
                                >
                                    <View style={styles.voucherTopRow}>
                                        <Text style={[styles.voucherBrand, { color: selectedReward.textColor }]}>
                                            {selectedReward.title}
                                        </Text>
                                        {getIcon(selectedReward.icon, selectedReward.textColor)}
                                    </View>
                                    <Text style={[styles.voucherSubtitle, { color: selectedReward.textColor, opacity: 0.8 }]}>
                                        {selectedReward.description}
                                    </Text>
                                    
                                    <View style={styles.voucherDividerDotRow}>
                                        <View style={styles.leftDot} />
                                        <View style={styles.dashedLine} />
                                        <View style={styles.rightDot} />
                                    </View>
                                    
                                    <View style={styles.voucherCodeBlock}>
                                        <Text style={[styles.voucherCodeLabel, { color: selectedReward.textColor, opacity: 0.7 }]}>VOUCHER CODE</Text>
                                        <Text style={[styles.voucherCodeText, { color: selectedReward.textColor }]}>{voucherCode}</Text>
                                    </View>
                                </LinearGradient>
                            </View>
                        )}

                        {/* Simulated Barcode */}
                        <View style={[styles.barcodeWrapper, { backgroundColor: theme.colors.cardSecondary }]}>
                            <View style={styles.barcodeLines}>
                                {[12, 4, 16, 8, 4, 20, 12, 8, 4, 16, 12, 4, 20, 8, 16].map((width, idx) => (
                                    <View 
                                        key={idx} 
                                        style={[
                                            styles.barcodeLine, 
                                            { 
                                                width: width, 
                                                backgroundColor: isDarkTheme ? '#E2E8F0' : '#1E293B',
                                                marginRight: idx % 2 === 0 ? 3 : 5 
                                            }
                                        ]} 
                                    />
                                ))}
                            </View>
                            <Text style={[styles.barcodeText, { color: theme.colors.textLight }]}>{voucherCode}</Text>
                        </View>

                        <TouchableOpacity 
                            style={[styles.closeVoucherBtn, { backgroundColor: theme.colors.primary }]}
                            onPress={() => setSuccessModalVisible(false)}
                        >
                            <Text style={styles.closeVoucherText}>Done</Text>
                        </TouchableOpacity>
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
    cardContainer: {
        paddingHorizontal: 24,
        marginVertical: 16,
    },
    balanceCard: {
        borderRadius: 24,
        padding: 24,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        gap: 4,
    },
    levelBadge: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    cardLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 12,
    },
    balanceValue: {
        fontSize: 38,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    pointsSuffix: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
    },
    progressContainer: {
        marginTop: 20,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontWeight: '600',
    },
    progressPercent: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FCD34D',
        borderRadius: 3,
    },
    pointsNeededText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 10,
        fontWeight: '500',
        marginTop: 6,
        textAlign: 'right',
    },
    categoryWrapper: {
        marginVertical: 8,
    },
    categoryScroll: {
        paddingHorizontal: 24,
        gap: 8,
    },
    categoryPill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    categoryText: {
        fontSize: 13,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        paddingHorizontal: 24,
        marginTop: 18,
        marginBottom: 10,
    },
    listContainer: {
        paddingHorizontal: 24,
        gap: 12,
        paddingBottom: 20,
    },
    rewardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 20,
    },
    rewardIconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    rewardDetails: {
        flex: 1,
    },
    rewardTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    rewardDesc: {
        fontSize: 12,
        marginBottom: 6,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    costText: {
        fontSize: 13,
        fontWeight: '700',
    },
    redeemBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    redeemBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyView: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmModal: {
        width: '100%',
        borderRadius: 28,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 16,
    },
    confirmDetails: {
        width: '100%',
        alignItems: 'center',
    },
    modalRewardIcon: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    confirmRewardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    confirmRewardDesc: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 10,
    },
    confirmBillBox: {
        width: '100%',
        borderRadius: 18,
        padding: 16,
        marginBottom: 24,
        gap: 10,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    billLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    billValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    billDivider: {
        height: 1,
        width: '100%',
        marginVertical: 4,
    },
    modalBtnRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '700',
    },
    modalConfirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalConfirmText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    successModal: {
        width: '100%',
        borderRadius: 32,
        borderWidth: 1,
        padding: 24,
        alignItems: 'center',
        position: 'relative',
    },
    closeModalX: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
    },
    successHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    successIconOuter: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 6,
    },
    successDesc: {
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 15,
        lineHeight: 16,
    },
    voucherCardContainer: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 20,
    },
    voucherGradient: {
        padding: 20,
        width: '100%',
    },
    voucherTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    voucherBrand: {
        fontSize: 18,
        fontWeight: '800',
    },
    voucherSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 20,
    },
    voucherDividerDotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: -20,
        marginBottom: 20,
    },
    leftDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#FFFFFF', // Creates cutout visual on dark/light
        marginLeft: -7,
    },
    rightDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#FFFFFF',
        marginRight: -7,
    },
    dashedLine: {
        flex: 1,
        height: 1,
        borderWidth: 1,
        borderColor: '#FFFFFF',
        borderStyle: 'dashed',
        opacity: 0.5,
    },
    voucherCodeBlock: {
        alignItems: 'center',
    },
    voucherCodeLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    voucherCodeText: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 2,
    },
    barcodeWrapper: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    barcodeLines: {
        flexDirection: 'row',
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    barcodeLine: {
        height: '100%',
        borderRadius: 1,
    },
    barcodeText: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 8,
        letterSpacing: 1.5,
    },
    closeVoucherBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    closeVoucherText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    }
});

