import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, FlatList, ActivityIndicator, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { WalletCard } from '../components/WalletCard';
import { Leaf, Recycle, Award, TrendingUp, ArrowRight, X, Bell, Phone } from 'lucide-react-native';
import { Linking } from 'react-native';
import { supabase } from '../lib/supabase';

export const HomeScreen = ({ onNavigate, activeTab }) => {
    const { theme, isDarkTheme } = useTheme();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 768;
    const [profile, setProfile] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [deletedNotifIds, setDeletedNotifIds] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [hasUnread, setHasUnread] = useState(true);

    useEffect(() => {
        if (activeTab === 'home') {
            fetchData();
        }
    }, [activeTab]);

    const fetchData = async () => {
        try {
            if (!profile) {
                setLoading(true);
            }
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (profileData) setProfile(profileData);

            // Fetch recent activity
            // RLS automatically filters this to only the user's pickup items
            const { data: activityData } = await supabase
                .from('pickup_items')
                .select(`
                    id,
                    eco_coins_earned,
                    created_at,
                    materials ( name )
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            if (activityData) {
                const formattedActivity = activityData.map(item => {
                    const dateObj = new Date(item.created_at);
                    const now = new Date();
                    const diffMins = Math.floor((now - dateObj) / 60000);
                    const diffHours = Math.floor(diffMins / 60);
                    const diffDays = Math.floor(diffHours / 24);
                    
                    let dateStr = '';
                    if (diffMins < 60) dateStr = `${diffMins || 1} mins ago`;
                    else if (diffHours < 24) dateStr = `${diffHours} hours ago`;
                    else if (diffDays === 1) dateStr = 'Yesterday';
                    else dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                    return {
                        id: item.id,
                        type: item.materials?.name || 'Unknown',
                        points: item.eco_coins_earned,
                        date: dateStr,
                    };
                });
                setRecentActivity(formattedActivity);
            }
            // Fetch recent pickups to build dynamic notifications
            const { data: pickupsData } = await supabase
                .from('pickups')
                .select('id, status, scheduled_date, scheduled_time, total_eco_coins_earned, created_at, agent:profiles!agent_id(full_name, phone_number)')
                .order('created_at', { ascending: false })
                .limit(5);

            // Load deleted notifications
            let deletedIds = [];
            try {
                const stored = await AsyncStorage.getItem('@deleted_notifications');
                if (stored) {
                    deletedIds = JSON.parse(stored);
                    setDeletedNotifIds(deletedIds);
                }
            } catch (e) {
                console.error('Error loading deleted notifications:', e);
            }

            const list = [];
            if (pickupsData && pickupsData.length > 0) {
                pickupsData.forEach(p => {
                    const dateObj = new Date(p.created_at);
                    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (p.status === 'pending') {
                        list.push({
                            id: `p-${p.id}`,
                            title: 'Pickup Requested',
                            message: `Your pickup request for ${p.scheduled_date} at ${p.scheduled_time} is pending confirmation.`,
                            time: dateStr,
                            type: 'pending'
                        });
                    } else if (p.status === 'assigned' || p.status === 'accepted') {
                        const agentName = p.agent?.full_name || 'An agent';
                        list.push({
                            id: `a-${p.id}`,
                            title: 'Agent Assigned',
                            message: `${agentName} has been assigned to collect your materials on ${p.scheduled_date}.`,
                            time: dateStr,
                            type: 'assigned',
                            agentPhone: p.agent?.phone_number
                        });
                    } else if (p.status === 'completed' || p.status === 'collected') {
                        list.push({
                            id: `c-${p.id}`,
                            title: 'Pickup Completed 🌿',
                            message: `Thank you for recycling! You earned ${p.total_eco_coins_earned || 0} eco coins.`,
                            time: dateStr,
                            type: 'completed'
                        });
                    }
                });
            }
            
            // Add default welcome notification
            list.push({
                id: 'welcome',
                title: 'Welcome to MyTrash',
                message: 'Start recycling and earn eco coins today!',
                time: 'Just now',
                type: 'welcome'
            });

            // Filter out deleted notifications
            const filteredList = list.filter(item => !deletedIds.includes(item.id));
            setNotifications(filteredList);
        } catch (error) {
            console.error('Error fetching home data:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const updated = [...deletedNotifIds, id];
            setDeletedNotifIds(updated);
            await AsyncStorage.setItem('@deleted_notifications', JSON.stringify(updated));
            setNotifications(prev => prev.filter(item => item.id !== id));
        } catch (e) {
            console.error('Error deleting notification:', e);
        }
    };

    const clearAllNotifications = async () => {
        try {
            const allIds = notifications.map(item => item.id);
            const updated = [...deletedNotifIds, ...allIds];
            setDeletedNotifIds(updated);
            await AsyncStorage.setItem('@deleted_notifications', JSON.stringify(updated));
            setNotifications([]);
        } catch (e) {
            console.error('Error clearing all notifications:', e);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const firstName = profile?.full_name?.split(' ')[0] || 'User';

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScrollView 
                style={[styles.container, { backgroundColor: theme.colors.background }]} 
                contentContainerStyle={[isDesktop && styles.desktopScrollContainer]}
                showsVerticalScrollIndicator={false}
            >
                <Header 
                    title={firstName} 
                    subtitle="Welcome back," 
                    hasUnreadNotifications={hasUnread && notifications.length > 0}
                    onProfilePress={() => onNavigate && onNavigate('profile')}
                    onNotificationPress={() => {
                        setShowNotifications(true);
                        setHasUnread(false);
                    }}
                />

                {isDesktop ? (
                    <View style={styles.desktopGrid}>
                        {/* Left Column: WalletCard + Quick Actions */}
                        <View style={styles.desktopLeftCol}>
                            <View style={styles.desktopCardWrapper}>
                                <WalletCard 
                                    balance={profile?.eco_coins_balance || 0} 
                                    name={profile?.full_name} 
                                    activeTab={activeTab}
                                    onRecyclePress={() => onNavigate && onNavigate('booking')}
                                />
                            </View>

                            <View style={[styles.section, { paddingHorizontal: 0, marginTop: 24 }]}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
                                <View style={styles.quickActions}>
                                    <Card style={styles.actionCard} onPress={() => onNavigate && onNavigate('booking')}>
                                        <View style={[styles.iconBox, { backgroundColor: theme.colors.tint }]}>
                                            <Recycle size={24} color={theme.colors.primary} />
                                        </View>
                                        <Text style={[styles.actionText, { color: theme.colors.text }]}>Recycle</Text>
                                    </Card>
                                    <Card style={styles.actionCard} onPress={() => onNavigate && onNavigate('rewards')}>
                                        <View style={[styles.iconBox, { backgroundColor: isDarkTheme ? 'rgba(92, 116, 143, 0.15)' : 'rgba(74, 96, 122, 0.1)' }]}>
                                            <Award size={24} color={theme.colors.secondary} />
                                        </View>
                                        <Text style={[styles.actionText, { color: theme.colors.text }]}>Rewards</Text>
                                    </Card>
                                    <Card style={styles.actionCard} onPress={() => onNavigate && onNavigate('leaderboard')}>
                                        <View style={[styles.iconBox, { backgroundColor: isDarkTheme ? 'rgba(230, 167, 86, 0.15)' : 'rgba(176, 128, 71, 0.1)' }]}>
                                            <Leaf size={24} color={theme.colors.accent} />
                                        </View>
                                        <Text style={[styles.actionText, { color: theme.colors.text }]}>Impact</Text>
                                    </Card>
                                </View>
                            </View>
                        </View>

                        {/* Right Column: Recent Activity */}
                        <View style={styles.desktopRightCol}>
                            <View style={[styles.section, { paddingHorizontal: 0, marginTop: 0 }]}>
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
                                    {recentActivity.length > 0 && (
                                        <TouchableOpacity onPress={() => onNavigate && onNavigate('leaderboard')}>
                                            <Text style={[styles.seeAll, { color: theme.colors.primary }]}>See All</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                
                                {recentActivity.length > 0 ? recentActivity.map(item => (
                                    <Card key={item.id} style={styles.activityCard}>
                                        <View style={styles.activityInfo}>
                                            <View style={[styles.activityIcon, { backgroundColor: theme.colors.tint }]}>
                                                <Recycle size={20} color={theme.colors.primary} />
                                            </View>
                                            <View>
                                                <Text style={[styles.activityType, { color: theme.colors.text }]}>{item.type} Recycling</Text>
                                                <Text style={[styles.activityDate, { color: theme.colors.textLight }]}>{item.date}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.activityPoints}>
                                            <Text style={[styles.pointsAdded, { color: theme.colors.primary }]}>+{item.points}</Text>
                                            <ArrowRight size={16} color={theme.colors.textLight} />
                                        </View>
                                    </Card>
                                )) : (
                                    <Card style={{ padding: 32, alignItems: 'center', justifyContent: 'center' }}>
                                        <Recycle size={36} color={theme.colors.primary} style={{ opacity: 0.6, marginBottom: 12 }} />
                                        <Text style={{ color: theme.colors.textLight, textAlign: 'center', fontSize: 14 }}>
                                            No recent activity yet. Request your first pickup to earn eco coins!
                                        </Text>
                                    </Card>
                                )}
                            </View>
                        </View>
                    </View>
                ) : (
                    /* Standard Mobile Stack (100% identical) */
                    <>
                        {/* Points Summary Card */}
                        <View style={styles.section}>
                            <WalletCard 
                                balance={profile?.eco_coins_balance || 0} 
                                name={profile?.full_name} 
                                activeTab={activeTab}
                                onRecyclePress={() => onNavigate && onNavigate('booking')}
                            />
                        </View>

                        {/* Quick Actions */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
                            <View style={styles.quickActions}>
                                <Card style={styles.actionCard} onPress={() => onNavigate && onNavigate('booking')}>
                                    <View style={[styles.iconBox, { backgroundColor: theme.colors.tint }]}>
                                        <Recycle size={24} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Recycle</Text>
                                </Card>
                                <Card style={styles.actionCard} onPress={() => onNavigate && onNavigate('rewards')}>
                                    <View style={[styles.iconBox, { backgroundColor: isDarkTheme ? 'rgba(92, 116, 143, 0.15)' : 'rgba(74, 96, 122, 0.1)' }]}>
                                        <Award size={24} color={theme.colors.secondary} />
                                    </View>
                                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Rewards</Text>
                                </Card>
                                <Card style={styles.actionCard} onPress={() => onNavigate && onNavigate('leaderboard')}>
                                    <View style={[styles.iconBox, { backgroundColor: isDarkTheme ? 'rgba(230, 167, 86, 0.15)' : 'rgba(176, 128, 71, 0.1)' }]}>
                                        <Leaf size={24} color={theme.colors.accent} />
                                    </View>
                                    <Text style={[styles.actionText, { color: theme.colors.text }]}>Impact</Text>
                                </Card>
                            </View>
                        </View>

                        {/* Recent Activity */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
                                {recentActivity.length > 0 && <Text style={[styles.seeAll, { color: theme.colors.primary }]}>See All</Text>}
                            </View>
                            
                            {recentActivity.length > 0 ? recentActivity.map(item => (
                                <Card key={item.id} style={styles.activityCard}>
                                    <View style={styles.activityInfo}>
                                        <View style={[styles.activityIcon, { backgroundColor: theme.colors.tint }]}>
                                            <Recycle size={20} color={theme.colors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.activityType, { color: theme.colors.text }]}>{item.type} Recycling</Text>
                                            <Text style={[styles.activityDate, { color: theme.colors.textLight }]}>{item.date}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.activityPoints}>
                                        <Text style={[styles.pointsAdded, { color: theme.colors.primary }]}>+{item.points}</Text>
                                        <ArrowRight size={16} color={theme.colors.textLight} />
                                    </View>
                                </Card>
                            )) : (
                                <Text style={{ color: theme.colors.textLight, textAlign: 'center', marginTop: 20, marginBottom: 20 }}>No recent activity yet. Request your first pickup!</Text>
                            )}
                        </View>
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

        {/* Notifications Modal */}
        <Modal
            visible={showNotifications}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowNotifications(false)}
        >
            <TouchableOpacity 
                style={styles.modalBackdrop} 
                activeOpacity={1} 
                onPress={() => setShowNotifications(false)}
            >
                <View style={[styles.modalContent, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                    {/* Header */}
                    <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Bell size={20} color={theme.colors.primary} />
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Notifications</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            {notifications.length > 0 && (
                                <TouchableOpacity onPress={clearAllNotifications}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>Clear All</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowNotifications(false)}>
                                <X size={20} color={theme.colors.textLight} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* List */}
                    <ScrollView contentContainerStyle={styles.notificationList} showsVerticalScrollIndicator={false}>
                        {notifications.length > 0 ? (
                            notifications.map(item => (
                                <View key={item.id} style={[styles.notificationCard, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.03)' : theme.colors.surface, borderColor: theme.colors.border }]}>
                                    <View style={styles.notificationIconWrapper}>
                                        {item.type === 'pending' || item.type === 'assigned' ? (
                                            <View style={[styles.notiIcon, { backgroundColor: theme.colors.tint }]}>
                                                <Recycle size={18} color={theme.colors.primary} />
                                            </View>
                                        ) : item.type === 'completed' ? (
                                            <View style={[styles.notiIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                                <Leaf size={18} color="#22c55e" />
                                            </View>
                                        ) : (
                                            <View style={[styles.notiIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                                <Award size={18} color="#3b82f6" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.notiHeaderRow}>
                                            <Text style={[styles.notiTitle, { color: theme.colors.text }]}>{item.title}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <Text style={[styles.notiTime, { color: theme.colors.textLight }]}>{item.time}</Text>
                                                <TouchableOpacity 
                                                    onPress={() => deleteNotification(item.id)}
                                                    style={{ padding: 4 }}
                                                >
                                                    <X size={14} color={theme.colors.textLight} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <Text style={[styles.notiMessage, { color: theme.colors.textLight }]}>{item.message}</Text>
                                        {item.agentPhone && (
                                            <TouchableOpacity 
                                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}
                                                onPress={() => Linking.openURL(`tel:${item.agentPhone}`).catch(err => console.error(err))}
                                            >
                                                <Phone size={14} color={theme.colors.primary} />
                                                <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600' }}>Call Agent</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyNotifications}>
                                <Bell size={40} color={theme.colors.textLight} style={{ opacity: 0.5, marginBottom: 12 }} />
                                <Text style={[styles.emptyText, { color: theme.colors.textLight }]}>No notifications yet</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    </View>
);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 24, // Using pixel values for immediate consistency
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    seeAll: {
        fontWeight: '600',
    },
    pointsCard: {
        height: 160,
        justifyContent: 'center',
    },
    pointsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    pointsLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 16,
        fontWeight: '500',
    },
    pointsValue: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '800',
        marginTop: 4,
    },
    pointsFooter: {
        marginTop: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
        gap: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    actionCard: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activityCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        marginBottom: 4,
    },
    activityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityType: {
        fontSize: 15,
        fontWeight: '600',
    },
    activityDate: {
        fontSize: 12,
    },
    activityPoints: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pointsAdded: {
        fontSize: 15,
        fontWeight: '700',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: '80%',
        borderWidth: 1,
        borderBottomWidth: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationList: {
        gap: 12,
        paddingBottom: 20,
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        gap: 12,
    },
    notificationIconWrapper: {
        justifyContent: 'flex-start',
    },
    notiIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notiHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notiTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    notiTime: {
        fontSize: 11,
    },
    notiMessage: {
        fontSize: 13,
        lineHeight: 18,
    },
    emptyNotifications: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    desktopScrollContainer: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
    },
    desktopGrid: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 32,
        alignItems: 'flex-start',
    },
    desktopLeftCol: {
        width: 480,
        maxWidth: '48%',
    },
    desktopCardWrapper: {
        alignItems: 'flex-start',
    },
    desktopRightCol: {
        flex: 1,
        minWidth: 320,
    },
});
