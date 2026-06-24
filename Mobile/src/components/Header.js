import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { User, Bell } from 'lucide-react-native';

export const Header = ({ title, subtitle, showIcons = true, onNotificationPress, onProfilePress, hasUnreadNotifications = false }) => {
    const { theme, isDarkTheme } = useTheme();

    return (
        <View style={styles.container}>
            <View style={{ flex: 1, marginRight: 8 }}>
                {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.textLight }]}>{subtitle}</Text> : null}
                <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
            </View>
            {showIcons && (
                <View style={styles.icons}>
                    <TouchableOpacity 
                        onPress={onNotificationPress}
                        activeOpacity={0.7}
                        style={[styles.iconButton, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.06)' : theme.colors.surface }]}
                    >
                        <Bell size={20} color={theme.colors.text} />
                        {hasUnreadNotifications && (
                            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={onProfilePress}
                        activeOpacity={0.7}
                        style={[styles.iconButton, styles.avatar, { backgroundColor: theme.colors.primary }]}
                    >
                        <User size={20} color={theme.colors.white} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 14,
    },
    icons: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    avatar: {
        // Background color handled in component for theme reactivity
    },
    unreadDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
    }
});
