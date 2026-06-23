import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { MapPin, ClipboardList, LogOut } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

export const AgentHomeScreen = () => {
    const { theme, isDarkTheme } = useTheme();

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
            <Header title="Agent Dashboard" subtitle="GreenDrop Logistics" showIcons={false} />

            <View style={styles.section}>
                <Card style={styles.actionCard} onPress={() => {}}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.tint }]}>
                            <MapPin size={24} color={theme.colors.primary} />
                        </View>
                        <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Pending Pickups</Text>
                    </View>
                    <Text style={[styles.actionSubtitle, { color: theme.colors.textLight }]}>View and route to user locations</Text>
                </Card>

                <Card style={styles.actionCard} onPress={() => {}}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkTheme ? 'rgba(230, 167, 86, 0.15)' : 'rgba(176, 128, 71, 0.1)' }]}>
                            <ClipboardList size={24} color={theme.colors.accent} />
                        </View>
                        <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Log Collection</Text>
                    </View>
                    <Text style={[styles.actionSubtitle, { color: theme.colors.textLight }]}>Weigh items and award coins</Text>
                </Card>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={20} color={theme.colors.error} />
                <Text style={[styles.logoutText, { color: theme.colors.error }]}>Log Out Agent</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 24,
        marginTop: 16,
        gap: 16,
    },
    actionCard: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 8,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    actionSubtitle: {
        fontSize: 14,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 40,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
    }
});
