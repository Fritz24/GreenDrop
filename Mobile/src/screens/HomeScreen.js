import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { WalletCard } from '../components/WalletCard';
import { Leaf, Recycle, Award, TrendingUp, ArrowRight } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

export const HomeScreen = ({ onNavigate }) => {
    const { theme, isDarkTheme } = useTheme();
    const [profile, setProfile] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
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
        } catch (error) {
            console.error('Error fetching home data:', error);
        } finally {
            setLoading(false);
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
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
            <Header title="GreenDrop" subtitle={`Welcome back, ${firstName}`} />

            {/* Points Summary Card */}
            <View style={styles.section}>
                <WalletCard 
                    balance={profile?.eco_coins_balance || 0} 
                    name={profile?.full_name} 
                    onRecyclePress={() => onNavigate && onNavigate('scan')} 
                />
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
                <View style={styles.quickActions}>
                    <Card style={styles.actionCard} onPress={() => onNavigate && onNavigate('scan')}>
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

            <View style={{ height: 100 }} />
        </ScrollView>
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
    }
});
