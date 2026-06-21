import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { User, Bell } from 'lucide-react-native';

export const Header = ({ title, subtitle, showIcons = true }) => {
    const { theme, isDarkTheme } = useTheme();

    return (
        <View style={styles.container}>
            <View>
                <Text style={[styles.subtitle, { color: theme.colors.textLight }]}>{subtitle}</Text>
                <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            </View>
            {showIcons && (
                <View style={styles.icons}>
                    <View style={[styles.iconButton, { backgroundColor: theme.colors.surface }]}>
                        <Bell size={20} color={theme.colors.text} />
                    </View>
                    <View style={[styles.iconButton, styles.avatar, { backgroundColor: theme.colors.primary }]}>
                        <User size={20} color={theme.colors.white} />
                    </View>
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
        textTransform: 'uppercase',
        letterSpacing: 1,
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
    }
});
