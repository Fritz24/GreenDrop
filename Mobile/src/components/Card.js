import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export const Card = ({ children, style, gradient, onPress }) => {
    const { theme, isDarkTheme } = useTheme();
    const Container = onPress ? TouchableOpacity : View;

    if (gradient) {
        return (
            <Container onPress={onPress} style={[styles.card, { shadowColor: theme.colors.black }, style]}>
                <LinearGradient
                    colors={gradient}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {children}
                </LinearGradient>
            </Container>
        );
    }

    return (
        <Container onPress={onPress} style={[styles.card, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.black }, style]}>
            {children}
        </Container>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginVertical: 8,
        padding: 16,
    },
    gradient: {
        padding: 16,
        width: '100%',
    },
});
