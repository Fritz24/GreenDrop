import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Trophy, Medal, User, Users, Recycle, Leaf, Droplet, Cloud, Lock, Award, Sparkles } from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const screenWidth = Dimensions.get('window').width;

export const LeaderboardScreen = ({ parentActiveTab }) => {
    const { theme, isDarkTheme } = useTheme();
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 768;
    const [activeTab, setActiveTab] = useState('impact'); // 'impact' or 'leaderboard'
    const [loading, setLoading] = useState(true);
    
    // User & Stats states
    const [profile, setProfile] = useState(null);
    const [impactStats, setImpactStats] = useState({
        totalWeight: 0,
        plasticWeight: 0,
        paperWeight: 0,
        metalWeight: 0,
        glassWeight: 0,
        co2Saved: 0,
        waterSaved: 0,
        treesSaved: 0,
        energySaved: 0
    });

    // Leaderboard states
    const [leaderboard, setLeaderboard] = useState([]);
    const [dbBadges, setDbBadges] = useState([]);

    useEffect(() => {
        if (parentActiveTab === 'leaderboard' || !parentActiveTab) {
            fetchData();
        }
    }, [activeTab, parentActiveTab]);

    const fetchData = async () => {
        try {
            const hasData = activeTab === 'impact' ? impactStats.totalWeight > 0 : leaderboard.length > 0;
            if (!hasData) {
                setLoading(true);
            }
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch current profile
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (profileData) {
                setProfile(profileData);
            }

            // Fetch dynamic badges from DB
            try {
                const { data: badgesData } = await supabase
                    .from('badges')
                    .select('*');
                if (badgesData) {
                    setDbBadges(badgesData);
                }
            } catch (badgeErr) {
                console.error('Error fetching badges from DB:', badgeErr);
            }

            if (activeTab === 'impact') {
                // 2. Fetch pickup items for stats
                const { data: items, error: itemsError } = await supabase
                    .from('pickup_items')
                    .select(`
                        weight_kg,
                        eco_coins_earned,
                        materials ( name ),
                        pickups ( status )
                    `);

                if (!itemsError && items) {
                    // Filter and aggregate items
                    let totalW = 0;
                    let plasticW = 0;
                    let paperW = 0;
                    let metalW = 0;
                    let glassW = 0;

                    items.forEach(item => {
                        const status = item.pickups?.status;
                        // Count collected or completed pickups
                        if (status === 'collected' || status === 'completed') {
                            const w = Number(item.weight_kg) || 0;
                            totalW += w;
                            const matName = item.materials?.name?.toLowerCase() || '';
                            if (matName.includes('plastic')) {
                                plasticW += w;
                            } else if (matName.includes('paper') || matName.includes('cardboard')) {
                                paperW += w;
                            } else if (matName.includes('metal') || matName.includes('aluminum') || matName.includes('iron')) {
                                metalW += w;
                            } else if (matName.includes('glass')) {
                                glassW += w;
                            }
                        }
                    });

                    // Scientific multipliers:
                    // CO2 saved: Plastic (1.5), Paper (1.0), Metal (9.0), Glass (0.3)
                    // Water saved (Liters): Plastic (20), Paper (26), Metal (15), Glass (5)
                    // Trees saved: Paper (0.017), Others (0.005)
                    const co2 = (plasticW * 1.5) + (paperW * 1.0) + (metalW * 9.0) + (glassW * 0.3) + ((totalW - plasticW - paperW - metalW - glassW) * 2.0);
                    const water = (plasticW * 20) + (paperW * 26) + (metalW * 15) + (glassW * 5) + ((totalW - plasticW - paperW - metalW - glassW) * 15);
                    const trees = (paperW * 0.017) + ((totalW - paperW) * 0.005);
                    const energy = (metalW * 14) + (plasticW * 5.7) + (paperW * 4.2) + (glassW * 0.1) + ((totalW - plasticW - paperW - metalW - glassW) * 5);

                    setImpactStats({
                        totalWeight: totalW,
                        plasticWeight: plasticW,
                        paperWeight: paperW,
                        metalWeight: metalW,
                        glassWeight: glassW,
                        co2Saved: co2,
                        waterSaved: water,
                        treesSaved: trees,
                        energySaved: energy
                    });
                }
            } else {
                // 3. Fetch leaderboard from profiles
                const { data: profiles, error: profsError } = await supabase
                    .from('profiles')
                    .select('id, full_name, eco_coins_balance')
                    .eq('role', 'user')
                    .order('eco_coins_balance', { ascending: false });

                let list = [];
                if (!profsError && profiles && profiles.length > 0) {
                    list = profiles.map((p, index) => ({
                        id: p.id,
                        name: p.full_name || 'Eco Citizen',
                        points: p.eco_coins_balance || 0,
                        isMe: p.id === user.id
                    }));
                } else if (profileData && profileData.role === 'user') {
                    list = [{
                        id: profileData.id,
                        name: profileData.full_name || 'Eco Citizen',
                        points: profileData.eco_coins_balance || 0,
                        isMe: true
                    }];
                }

                // Add ranks
                const rankedList = list.map((item, index) => ({
                    ...item,
                    rank: index + 1
                }));
                setLeaderboard(rankedList);
            }
        } catch (error) {
            console.error('Error fetching stats / leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'EC';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Calculate achievements/badges
    const defaultBadges = [
        {
            id: 'b1',
            title: 'Eco Pioneer',
            description: 'Completed your first recycling collection',
            icon: Recycle,
            color: '#10B981',
            unlocked: impactStats.totalWeight > 0
        },
        {
            id: 'b2',
            title: 'Plastic Purger',
            description: 'Recycled over 10 kg of plastic waste',
            icon: Leaf,
            color: '#3B82F6',
            unlocked: impactStats.plasticWeight >= 10
        },
        {
            id: 'b3',
            title: 'Forest Friend',
            description: 'Recycled over 20 kg of paper / cardboard',
            icon: Award,
            color: '#8B5CF6',
            unlocked: impactStats.paperWeight >= 20
        },
        {
            id: 'b4',
            title: 'Zero Waste Hero',
            description: 'Recycled more than 50 kg total weight',
            icon: Sparkles,
            color: '#F59E0B',
            unlocked: impactStats.totalWeight >= 50
        }
    ];

    const badges = dbBadges && dbBadges.length > 0
        ? dbBadges.map(badge => {
            let unlocked = false;
            const val = Number(badge.rule_value);
            
            if (badge.rule_type === 'total_weight') {
                unlocked = impactStats.totalWeight >= val;
            } else if (badge.rule_type === 'plastic_weight') {
                unlocked = impactStats.plasticWeight >= val;
            } else if (badge.rule_type === 'paper_weight') {
                unlocked = impactStats.paperWeight >= val;
            } else if (badge.rule_type === 'metal_weight') {
                unlocked = impactStats.metalWeight >= val;
            } else if (badge.rule_type === 'glass_weight') {
                unlocked = impactStats.glassWeight >= val;
            }

            // Dynamically lookup the Lucide icon from LucideIcons object
            const IconComponent = LucideIcons[badge.icon] || Recycle;

            return {
                id: badge.id,
                title: badge.title,
                description: badge.description,
                icon: IconComponent,
                color: badge.color || '#10B981',
                unlocked
            };
          })
        : defaultBadges;

    // Separate top 3 podium from list
    const top3 = leaderboard.slice(0, 3);
    const podium2 = top3.find(u => u.rank === 2);
    const podium1 = top3.find(u => u.rank === 1);
    const podium3 = top3.find(u => u.rank === 3);
    const listUsers = leaderboard.slice(3);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Header 
                title={activeTab === 'impact' ? 'My Green Impact' : 'Leaderboard'} 
                subtitle={activeTab === 'impact' ? 'Your ecological footprint' : 'Community eco rankings'} 
                showIcons={false} 
            />

            {/* Custom Tab Switcher (Segmented Control) */}
            <View style={[styles.tabBarContainer, isDesktop && { maxWidth: 500, alignSelf: 'center', width: '100%' }]}>
                <View style={[styles.tabBarBg, { backgroundColor: theme.colors.cardSecondary }]}>
                    <TouchableOpacity
                        style={[
                            styles.tabItem,
                            activeTab === 'impact' && [styles.activeTab, { backgroundColor: theme.colors.surface }]
                        ]}
                        onPress={() => setActiveTab('impact')}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tabText, 
                            activeTab === 'impact' ? { color: theme.colors.primary, fontWeight: '800' } : { color: theme.colors.textLight }
                        ]}>
                            My Impact
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[
                            styles.tabItem,
                            activeTab === 'leaderboard' && [styles.activeTab, { backgroundColor: theme.colors.surface }]
                        ]}
                        onPress={() => setActiveTab('leaderboard')}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.tabText, 
                            activeTab === 'leaderboard' ? { color: theme.colors.primary, fontWeight: '800' } : { color: theme.colors.textLight }
                        ]}>
                            Leaderboard
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingBottom: 110 }, isDesktop && styles.desktopScrollContainer]}>
                    {activeTab === 'impact' ? (
                        /* === PERSONAL STATS TAB === */
                        <View style={styles.statsTab}>
                            {/* Environmental Multiplier Grid */}
                            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 10 }]}>Ecological Footprint</Text>
                            <View style={[styles.gridContainer, isDesktop && styles.desktopGridContainer]}>
                                <Card style={[styles.gridCard, isDesktop && styles.desktopGridCard]}>
                                    <View style={[styles.gridIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                        <Recycle size={22} color="#10B981" />
                                    </View>
                                    <Text style={[styles.gridLabel, { color: theme.colors.textLight }]}>Recycled Weight</Text>
                                    <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                                        {impactStats.totalWeight.toFixed(1)} <Text style={styles.gridUnit}>kg</Text>
                                    </Text>
                                </Card>

                                <Card style={[styles.gridCard, isDesktop && styles.desktopGridCard]}>
                                    <View style={[styles.gridIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                                        <Cloud size={22} color="#3B82F6" />
                                    </View>
                                    <Text style={[styles.gridLabel, { color: theme.colors.textLight }]}>CO2 Prevented</Text>
                                    <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                                        {impactStats.co2Saved.toFixed(1)} <Text style={styles.gridUnit}>kg</Text>
                                    </Text>
                                </Card>

                                <Card style={[styles.gridCard, isDesktop && styles.desktopGridCard]}>
                                    <View style={[styles.gridIconBg, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}>
                                        <Droplet size={22} color="#06B6D4" />
                                    </View>
                                    <Text style={[styles.gridLabel, { color: theme.colors.textLight }]}>Water Saved</Text>
                                    <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                                        {impactStats.waterSaved.toFixed(0)} <Text style={styles.gridUnit}>L</Text>
                                    </Text>
                                </Card>

                                <Card style={[styles.gridCard, isDesktop && styles.desktopGridCard]}>
                                    <View style={[styles.gridIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                        <Leaf size={22} color="#F59E0B" />
                                    </View>
                                    <Text style={[styles.gridLabel, { color: theme.colors.textLight }]}>Trees Preserved</Text>
                                    <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                                        {impactStats.treesSaved.toFixed(2)} <Text style={styles.gridUnit}>trees</Text>
                                    </Text>
                                </Card>
                            </View>

                            {/* Materials Breakdown */}
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recycled Materials</Text>
                            <Card style={[styles.breakdownCard, { borderColor: theme.colors.border }]}>
                                {[
                                    { name: 'Plastic', weight: impactStats.plasticWeight, color: '#3B82F6' },
                                    { name: 'Paper & Cardboard', weight: impactStats.paperWeight, color: '#8B5CF6' },
                                    { name: 'Metal & Cans', weight: impactStats.metalWeight, color: '#F59E0B' },
                                    { name: 'Glass', weight: impactStats.glassWeight, color: '#10B981' }
                                ].map((item, idx, arr) => {
                                    const percentage = impactStats.totalWeight > 0 ? (item.weight / impactStats.totalWeight) * 100 : 0;
                                    return (
                                        <View key={item.name} style={[styles.materialRow, idx !== arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
                                            <View style={styles.materialHeaderRow}>
                                                <View style={styles.materialNameBox}>
                                                    <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                                                    <Text style={[styles.materialName, { color: theme.colors.text }]}>{item.name}</Text>
                                                </View>
                                                <Text style={[styles.materialWeightText, { color: theme.colors.text }]}>
                                                    {item.weight.toFixed(1)} kg ({Math.round(percentage)}%)
                                                </Text>
                                            </View>
                                            <View style={styles.materialBarBg}>
                                                <View style={[styles.materialBarFill, { width: `${percentage}%`, backgroundColor: item.color }]} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </Card>

                            {/* Achievements / Badges */}
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Unlocked Badges</Text>
                            <View style={[styles.badgesList, isDesktop && styles.desktopBadgesList]}>
                                {badges.map(badge => {
                                    const Icon = badge.icon;
                                    return (
                                        <Card key={badge.id} style={[styles.badgeCard, isDesktop && styles.desktopBadgeCard, !badge.unlocked && { opacity: 0.5 }]}>
                                            <View style={[styles.badgeIconWrapper, { backgroundColor: badge.unlocked ? badge.color + '1A' : theme.colors.cardSecondary }]}>
                                                {badge.unlocked ? (
                                                    <Icon size={24} color={badge.color} />
                                                ) : (
                                                    <Lock size={20} color={theme.colors.textLight} />
                                                )}
                                            </View>
                                            <View style={styles.badgeInfo}>
                                                <Text style={[styles.badgeTitle, { color: theme.colors.text }]}>
                                                    {badge.title}
                                                </Text>
                                                <Text style={[styles.badgeDesc, { color: theme.colors.textLight }]}>
                                                    {badge.description}
                                                </Text>
                                            </View>
                                            {badge.unlocked && (
                                                <View style={[styles.unlockedTag, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                                    <Text style={styles.unlockedText}>Earned</Text>
                                                </View>
                                            )}
                                        </Card>
                                    );
                                })}
                            </View>
                        </View>
                    ) : (
                        /* === LEADERBOARD TAB === */
                        <View style={[styles.leaderboardTab, isDesktop && styles.desktopLeaderboardTab]}>
                            {/* Premium Podium Top 3 */}
                            <View style={styles.podiumContainer}>
                                {/* 2nd Place */}
                                {podium2 && (
                                    <View style={[styles.podiumItem, styles.rank2]}>
                                        <View style={[styles.podiumAvatarOuter, { borderColor: '#E2E8F0', backgroundColor: theme.colors.surface }]}>
                                            <Text style={[styles.podiumInitials, { color: '#64748B' }]}>{getInitials(podium2.name)}</Text>
                                            <View style={[styles.podiumRankBadge, { backgroundColor: '#94A3B8' }]}>
                                                <Text style={styles.podiumRankText}>2</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.podiumName, { color: theme.colors.text }]} numberOfLines={1}>
                                            {podium2.name.split(' ')[0]}
                                        </Text>
                                        <Text style={[styles.podiumPoints, { color: theme.colors.textLight }]}>
                                            {podium2.points.toLocaleString()} pts
                                        </Text>
                                        <View style={[styles.podiumBase, { height: 60, backgroundColor: '#E2E8F0', borderTopLeftRadius: 10, borderTopRightRadius: 10 }]} />
                                    </View>
                                )}

                                {/* 1st Place */}
                                {podium1 && (
                                    <View style={[styles.podiumItem, styles.rank1]}>
                                        <Trophy size={26} color="#F59E0B" fill="#FCD34D" style={styles.trophy} />
                                        <View style={[styles.podiumAvatarOuter, styles.largePodiumAvatar, { borderColor: '#FCD34D', backgroundColor: theme.colors.surface }]}>
                                            <Text style={[styles.podiumInitials, { color: '#B45309', fontSize: 20 }]}>{getInitials(podium1.name)}</Text>
                                            <View style={[styles.podiumRankBadge, { backgroundColor: '#F59E0B', width: 28, height: 28, borderRadius: 14 }]}>
                                                <Text style={styles.podiumRankText}>1</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.podiumName, styles.bold, { color: theme.colors.text }]} numberOfLines={1}>
                                            {podium1.name.split(' ')[0]}
                                        </Text>
                                        <Text style={[styles.podiumPoints, { color: theme.colors.primary, fontWeight: '700' }]}>
                                            {podium1.points.toLocaleString()} pts
                                        </Text>
                                        <View style={[styles.podiumBase, { height: 85, backgroundColor: '#FCD34D', borderTopLeftRadius: 12, borderTopRightRadius: 12 }]} />
                                    </View>
                                )}

                                {/* 3rd Place */}
                                {podium3 && (
                                    <View style={[styles.podiumItem, styles.rank3]}>
                                        <View style={[styles.podiumAvatarOuter, { borderColor: '#FED7AA', backgroundColor: theme.colors.surface }]}>
                                            <Text style={[styles.podiumInitials, { color: '#C2410C' }]}>{getInitials(podium3.name)}</Text>
                                            <View style={[styles.podiumRankBadge, { backgroundColor: '#FB923C' }]}>
                                                <Text style={styles.podiumRankText}>3</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.podiumName, { color: theme.colors.text }]} numberOfLines={1}>
                                            {podium3.name.split(' ')[0]}
                                        </Text>
                                        <Text style={[styles.podiumPoints, { color: theme.colors.textLight }]}>
                                            {podium3.points.toLocaleString()} pts
                                        </Text>
                                        <View style={[styles.podiumBase, { height: 45, backgroundColor: '#FED7AA', borderTopLeftRadius: 8, borderTopRightRadius: 8 }]} />
                                    </View>
                                )}
                            </View>

                            {/* Ranked Users List */}
                            <View style={styles.listContainer}>
                                {listUsers.map((user) => (
                                    <Card 
                                        key={user.id} 
                                        style={[
                                            styles.userRow, 
                                            user.isMe && { 
                                                borderColor: theme.colors.primary, 
                                                borderWidth: 1.5, 
                                                backgroundColor: theme.colors.tint 
                                            }
                                        ]}
                                    >
                                        <Text style={[styles.rankNumber, { color: theme.colors.textLight }]}>{user.rank}</Text>
                                        <View style={[styles.userAvatarSmall, { backgroundColor: user.isMe ? theme.colors.primary : theme.colors.cardSecondary }]}>
                                            <Text style={[styles.userAvatarText, { color: user.isMe ? '#FFFFFF' : theme.colors.text }]}>
                                                {getInitials(user.name)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.userName, user.isMe && styles.bold, { color: theme.colors.text }]}>
                                            {user.name}
                                        </Text>
                                        <Text style={[styles.userPoints, { color: theme.colors.text }]}>
                                            {user.points.toLocaleString()} pts
                                        </Text>
                                    </Card>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabBarContainer: {
        paddingHorizontal: 24,
        marginVertical: 12,
    },
    tabBarBg: {
        flexDirection: 'row',
        padding: 5,
        borderRadius: 16,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    activeTab: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        paddingHorizontal: 24,
        marginTop: 20,
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    statsTab: {
        flex: 1,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 10,
    },
    gridCard: {
        width: (screenWidth - 50) / 2,
        padding: 16,
        borderRadius: 20,
        alignItems: 'flex-start',
    },
    gridIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    gridUnit: {
        fontSize: 12,
        fontWeight: '600',
    },
    breakdownCard: {
        marginHorizontal: 24,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
    },
    materialRow: {
        paddingVertical: 12,
    },
    materialHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    materialNameBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    colorIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    materialName: {
        fontSize: 13,
        fontWeight: '700',
    },
    materialWeightText: {
        fontSize: 13,
        fontWeight: '600',
    },
    materialBarBg: {
        height: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    materialBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    badgesList: {
        paddingHorizontal: 24,
        gap: 10,
    },
    badgeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
    },
    badgeIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    badgeInfo: {
        flex: 1,
    },
    badgeTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    badgeDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    unlockedTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    unlockedText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#22C55E',
    },
    leaderboardTab: {
        flex: 1,
    },
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        height: 250,
        marginTop: 10,
        paddingHorizontal: 24,
    },
    podiumItem: {
        alignItems: 'center',
        flex: 1,
    },
    rank1: {
        zIndex: 10,
    },
    rank2: {
        transform: [{ translateX: 8 }],
    },
    rank3: {
        transform: [{ translateX: -8 }],
    },
    podiumAvatarOuter: {
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    largePodiumAvatar: {
        width: 74,
        height: 74,
        borderRadius: 37,
        borderWidth: 4,
    },
    podiumInitials: {
        fontSize: 16,
        fontWeight: '800',
    },
    podiumRankBadge: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    podiumRankText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    podiumName: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2,
        textAlign: 'center',
        width: 80,
    },
    podiumPoints: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 10,
    },
    podiumBase: {
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    trophy: {
        marginBottom: 6,
    },
    bold: {
        fontWeight: '800',
    },
    listContainer: {
        paddingHorizontal: 24,
        marginTop: 15,
        gap: 8,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    rankNumber: {
        width: 26,
        fontSize: 14,
        fontWeight: '800',
    },
    userAvatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userAvatarText: {
        fontSize: 13,
        fontWeight: '800',
    },
    userName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    userPoints: {
        fontSize: 14,
        fontWeight: '800',
    },
    desktopScrollContainer: {
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
    },
    desktopGridContainer: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 16,
    },
    desktopGridCard: {
        flex: 1,
        minWidth: 0,
    },
    desktopBadgesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    desktopBadgeCard: {
        width: '48.5%',
        marginBottom: 0,
    },
    desktopLeaderboardTab: {
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
    },
});
