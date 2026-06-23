import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { User, Settings, LogOut, Shield, CircleHelp, Moon, Trash2 } from 'lucide-react-native';
import { Card } from '../components/Card';
import { supabase } from '../lib/supabase';

export const ProfileScreen = () => {
    const { theme, isDarkTheme, themeMode, setThemeMode } = useTheme();
    const [profile, setProfile] = useState(null);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setEmail(user.email);
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                if (data) setProfile(data);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const getModeLabel = () => {
        if (themeMode === 'light') return 'Light';
        if (themeMode === 'dark') return 'Dark';
        return 'System';
    };

    const cycleTheme = () => {
        if (themeMode === 'light') setThemeMode('dark');
        else if (themeMode === 'dark') setThemeMode('system');
        else setThemeMode('light');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleDeleteAccount = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // In a production app, the auth user deletion is handled by a Supabase Edge Function
        // or a PostgreSQL trigger on public.profiles. Here we clean up their profile data
        // and sign them out.
        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

            if (error) throw error;
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('Could not delete account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const MenuItem = ({ icon: Icon, label, value, onPress, isLast }) => (
        <TouchableOpacity
            style={[styles.menuItem, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
            onPress={onPress}
        >
            <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.colors.cardSecondary }]}>
                    <Icon size={20} color={theme.colors.primary} />
                </View>
                <Text style={[styles.menuLabel, { color: theme.colors.text }]}>{label}</Text>
            </View>
            <View style={styles.menuRight}>
                {value && <Text style={[styles.menuValue, { color: theme.colors.textLight }]}>{value}</Text>}
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <View style={[styles.avatarContainer, { backgroundColor: theme.colors.surface }]}>
                    <User size={50} color={theme.colors.primary} />
                </View>
                <Text style={[styles.name, { color: theme.colors.text }]}>{profile?.full_name || 'User'}</Text>
                <Text style={[styles.email, { color: theme.colors.textLight }]}>{email}</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textLight }]}>Appearance</Text>
                <Card style={styles.menuCard}>
                    <MenuItem
                        id="darkModeItem"
                        icon={Moon}
                        label="Dark Mode"
                        value={getModeLabel()}
                        onPress={cycleTheme}
                        isLast={true}
                    />
                </Card>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textLight }]}>Account</Text>
                <Card style={styles.menuCard}>
                    <MenuItem icon={Settings} label="Settings" onPress={() => { }} />
                    <MenuItem icon={Shield} label="Privacy & Security" onPress={() => { }} />
                    <MenuItem icon={CircleHelp} label="Help & Support" isLast={true} onPress={() => { }} />
                </Card>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={20} color={theme.colors.error} />
                <Text style={[styles.logoutText, { color: theme.colors.error }]}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.logoutButton, { marginTop: 20 }]} 
                onPress={() => {
                    // Check React Native's Alert or use standard confirmation dialog
                    if (confirm("Are you sure you want to delete your account? This action is permanent and all your eco coins will be lost.")) {
                        handleDeleteAccount();
                    }
                }}
            >
                <Trash2 size={20} color={theme.colors.error} />
                <Text style={[styles.logoutText, { color: theme.colors.error }]}>Delete Account</Text>
            </TouchableOpacity>

            <View style={{ height: 120 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    email: {
        fontSize: 16,
        fontWeight: '500',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    menuCard: {
        padding: 0,
        borderRadius: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    menuValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
    }
});
