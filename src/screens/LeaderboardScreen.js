import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Trophy, Medal, User } from 'lucide-react-native';

const TOP_USERS = [
    { id: '1', name: 'Emma Wilson', points: 15420, rank: 1, avatarColor: '#FCD34D' },
    { id: '2', name: 'David Chen', points: 12850, rank: 2, avatarColor: '#E2E8F0' },
    { id: '3', name: 'Sarah Miller', points: 10200, rank: 3, avatarColor: '#FDBA74' },
];

const OTHER_USERS = [
    { id: '4', name: 'James Taylor', points: 8500, rank: 4 },
    { id: '5', name: 'Olivia Brown', points: 7200, rank: 5 },
    { id: '6', name: 'Alex Johnson (You)', points: 2450, rank: 42, isMe: true },
];

export const LeaderboardScreen = () => {
    const { theme, isDarkTheme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Header title="Leaderboard" subtitle="Community Impact" showIcons={false} />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Podium Area */}
                <View style={styles.podiumContainer}>
                    <View style={[styles.podiumItem, styles.rank2]}>
                        <View style={[styles.avatar, { borderColor: '#E5E7EB', backgroundColor: theme.colors.surface }]}>
                            <User size={30} color="#94A3B8" />
                        </View>
                        <Text style={[styles.podiumName, { color: theme.colors.text }]}>{TOP_USERS[1].name.split(' ')[0]}</Text>
                        <View style={[styles.rankBadge, { backgroundColor: '#E2E8F0' }]}>
                            <Text style={styles.rankText}>2</Text>
                        </View>
                    </View>

                    <View style={[styles.podiumItem, styles.rank1]}>
                        <Trophy size={24} color="#F59E0B" style={styles.trophy} />
                        <View style={[styles.avatar, styles.largeAvatar, { borderColor: '#FCD34D', backgroundColor: theme.colors.surface }]}>
                            <User size={40} color="#F59E0B" />
                        </View>
                        <Text style={[styles.podiumName, styles.bold, { color: theme.colors.text }]}>{TOP_USERS[0].name.split(' ')[0]}</Text>
                        <View style={[styles.rankBadge, { backgroundColor: '#FCD34D', width: 30, height: 30 }]}>
                            <Text style={styles.rankText}>1</Text>
                        </View>
                    </View>

                    <View style={[styles.podiumItem, styles.rank3]}>
                        <View style={[styles.avatar, { borderColor: '#FED7AA', backgroundColor: theme.colors.surface }]}>
                            <User size={30} color="#FB923C" />
                        </View>
                        <Text style={[styles.podiumName, { color: theme.colors.text }]}>{TOP_USERS[2].name.split(' ')[0]}</Text>
                        <View style={[styles.rankBadge, { backgroundColor: '#FFEDD5' }]}>
                            <Text style={styles.rankText}>3</Text>
                        </View>
                    </View>
                </View>

                {/* List */}
                <View style={styles.listContainer}>
                    {OTHER_USERS.map((user) => (
                        <Card key={user.id} style={[styles.userRow, user.isMe && { borderColor: theme.colors.primary, borderWidth: 1, backgroundColor: theme.colors.tint }]}>
                            <Text style={[styles.rankNumber, { color: theme.colors.textLight }]}>{user.rank}</Text>
                            <View style={[styles.userAvatarSmall, { backgroundColor: theme.colors.cardSecondary }]}>
                                <User size={18} color={theme.colors.textLight} />
                            </View>
                            <Text style={[styles.userName, user.isMe && styles.bold, { color: theme.colors.text }]}>{user.name}</Text>
                            <Text style={[styles.userPoints, { color: theme.colors.text }]}>{user.points.toLocaleString()} pts</Text>
                        </Card>
                    ))}
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        height: 240,
        marginTop: 20,
        paddingHorizontal: 20,
    },
    podiumItem: {
        alignItems: 'center',
        flex: 1,
    },
    rank1: {
        zIndex: 10,
        transform: [{ translateY: -20 }],
    },
    rank2: {
        transform: [{ translateX: 10 }],
    },
    rank3: {
        transform: [{ translateX: -10 }],
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    largeAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    podiumName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1E293B',
    },
    trophy: {
        position: 'absolute',
        top: -30,
    },
    bold: {
        fontWeight: '800',
    },
    listContainer: {
        padding: 24,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    rankNumber: {
        width: 30,
        fontSize: 14,
        fontWeight: '700',
    },
    userAvatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    userName: {
        flex: 1,
        fontSize: 15,
    },
    userPoints: {
        fontSize: 15,
        fontWeight: '700',
    }
});
