import React from 'react';
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { ShoppingBag, Coffee, Ticket, Zap } from 'lucide-react-native';

const REWARDS = [
    {
        id: '1',
        title: 'Starbucks Discount',
        description: '$5 off your next coffee',
        cost: 500,
        icon: 'coffee',
        color: '#3B82F6'
    },
    {
        id: '2',
        title: 'Bus Pass',
        description: '1 day unlimited travel',
        cost: 1200,
        icon: 'ticket',
        color: '#455A3F'
    },
    {
        id: '3',
        title: 'Electricity Credit',
        description: '$10 energy bill credit',
        cost: 2000,
        icon: 'zap',
        color: '#F59E0B'
    },
    {
        id: '4',
        title: 'Amazon Voucher',
        description: '$5 Amazon Gift Card',
        cost: 1500,
        icon: 'shopping-bag',
        color: '#EF4444'
    },
];

export const RewardsScreen = () => {
    const { theme, isDarkTheme } = useTheme();

    const getIcon = (type, color) => {
        const props = { size: 24, color: color };
        switch (type) {
            case 'coffee': return <Coffee {...props} />;
            case 'ticket': return <Ticket {...props} />;
            case 'zap': return <Zap {...props} />;
            case 'shopping-bag': return <ShoppingBag {...props} />;
            default: return <Zap {...props} />;
        }
    };

    const renderItem = ({ item }) => (
        <Card style={styles.rewardCard}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.cardSecondary }]}>
                {getIcon(item.icon, item.color)}
            </View>
            <View style={styles.info}>
                <Text style={[styles.rewardTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.rewardDesc, { color: theme.colors.textLight }]}>{item.description}</Text>
                <View style={[styles.costBadge, { backgroundColor: theme.colors.cardSecondary }]}>
                    <Text style={[styles.costText, { color: theme.colors.primary }]}>{item.cost} points</Text>
                </View>
            </View>
            <TouchableOpacity style={[styles.redeemButton, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.redeemText, { color: '#FFFFFF' }]}>Redeem</Text>
            </TouchableOpacity>
        </Card>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Header title="Rewards" subtitle="Exchange your points" showIcons={true} />

            <View style={[styles.balanceSection, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.balanceLabel, { color: theme.colors.textLight }]}>Available Balance</Text>
                <Text style={[styles.balanceValue, { color: theme.colors.text }]}>2,450 <Text style={[styles.pts, { color: theme.colors.primary }]}>pts</Text></Text>
            </View>

            <FlatList
                data={REWARDS}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    balanceSection: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginHorizontal: 24,
        borderRadius: 20,
        marginBottom: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    balanceLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    balanceValue: {
        fontSize: 32,
        fontWeight: '800',
    },
    pts: {
        fontSize: 16,
    },
    list: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    rewardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    info: {
        flex: 1,
    },
    rewardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    rewardDesc: {
        fontSize: 13,
        marginBottom: 6,
    },
    costBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    costText: {
        fontSize: 11,
        fontWeight: '700',
    },
    redeemButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    redeemText: {
        fontSize: 13,
        fontWeight: '700',
    }
});
