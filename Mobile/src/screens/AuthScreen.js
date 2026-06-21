import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Leaf, Mail, Lock, User, Wrench } from 'lucide-react-native';

export const AuthScreen = () => {
    const { theme, isDarkTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [isAgentMode, setIsAgentMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // Animation values for sliding up and fading in the form card
    const slideAnim = useRef(new Animated.Value(300)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) alert(error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                },
            },
        });

        if (error) alert(error.message);
        else alert('Check your email for the confirmation link!');
        setLoading(false);
    }

    const toggleAgentMode = () => {
        setIsAgentMode(!isAgentMode);
        setIsLogin(true); // Always force login mode when switching to or from agent (agent must login)
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: isDarkTheme ? theme.colors.background : theme.colors.white }]}
        >
            <ScrollView 
                style={{ flex: 1, backgroundColor: isDarkTheme ? theme.colors.background : theme.colors.primary }}
                contentContainerStyle={styles.scrollContent} 
                bounces={false} 
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                    <TouchableOpacity onPress={toggleAgentMode} style={{position: 'absolute', top: insets.top + 20, right: 20}}>
                        <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600'}}>
                            {isAgentMode ? 'User Portal' : 'Agent Login'}
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.logoContainer, { backgroundColor: isDarkTheme ? theme.colors.surface : 'rgba(255,255,255,0.2)' }]}>
                        {isAgentMode ? (
                            <Wrench size={40} color={isDarkTheme ? theme.colors.primary : theme.colors.white} />
                        ) : (
                            <Leaf size={40} color={isDarkTheme ? theme.colors.primary : theme.colors.white} />
                        )}
                    </View>
                    <Text style={[styles.title, { color: theme.colors.white }]}>GreenDrop</Text>
                    <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                        {isAgentMode ? 'Agent Access Portal' : 'Recycle. Earn. Repeat.'}
                    </Text>
                </View>

                <Animated.View style={[
                    styles.form,
                    {
                        backgroundColor: isDarkTheme ? 'rgba(30, 34, 25, 0.45)' : 'rgba(255, 255, 255, 0.45)',
                        borderWidth: 1.5,
                        borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.45)',
                        borderBottomWidth: 0,
                        opacity: opacityAnim,
                        transform: [{ translateY: slideAnim }],
                        overflow: 'hidden',
                        paddingBottom: 600,
                        marginBottom: -550,
                    }
                ]}>
                    <BlurView
                        intensity={isDarkTheme ? 30 : 65}
                        tint={isDarkTheme ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <Text style={[styles.formTitle, { color: theme.colors.text }]}>
                        {isAgentMode ? 'Agent Login' : (isLogin ? 'Welcome Back' : 'Create Account')}
                    </Text>

                    {!isLogin && !isAgentMode && (
                        <View style={[
                            styles.inputContainer,
                            {
                                backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                                borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                borderWidth: 1,
                            }
                        ]}>
                            <User size={20} color={theme.colors.textLight} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: theme.colors.text }]}
                                placeholder="Full Name"
                                placeholderTextColor={theme.colors.textLight}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    )}

                    <View style={[
                        styles.inputContainer,
                        {
                            backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                            borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                            borderWidth: 1,
                        }
                    ]}>
                        <Mail size={20} color={theme.colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.colors.text }]}
                            placeholder="Email"
                            placeholderTextColor={theme.colors.textLight}
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View style={[
                        styles.inputContainer,
                        {
                            backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.5)',
                            borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                            borderWidth: 1,
                        }
                    ]}>
                        <Lock size={20} color={theme.colors.textLight} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: theme.colors.text }]}
                            placeholder="Password"
                            placeholderTextColor={theme.colors.textLight}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                        onPress={isLogin ? signInWithEmail : signUpWithEmail}
                        disabled={loading}
                    >
                        <Text style={[styles.primaryButtonText, { color: theme.colors.white }]}>
                            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                        </Text>
                    </TouchableOpacity>

                    {!isAgentMode && (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => setIsLogin(!isLogin)}
                        >
                            <Text style={[styles.secondaryButtonText, { color: theme.colors.textLight }]}>
                                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 16,
        marginTop: 5,
        fontStyle: 'italic',
        letterSpacing: 1,
        fontWeight: '500',
    },
    form: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        flex: 1,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 25,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 55,
        fontSize: 16,
    },
    primaryButton: {
        height: 55,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    primaryButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
    secondaryButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    }
});
