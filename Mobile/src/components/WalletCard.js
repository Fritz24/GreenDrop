import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions, PanResponder, Animated } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { Leaf } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const getFormattedRevenue = (balance, currency, detectedCurrency) => {
    const active = currency === 'auto' ? detectedCurrency : currency;
    if (active === 'XAF') {
        const val = Math.round(balance * 30);
        return { value: val.toLocaleString(), suffix: ' FCFA', symbol: '' };
    } else if (active === 'EUR') {
        const val = balance * 0.045;
        return { value: val.toFixed(2), suffix: '', symbol: '€' };
    } else {
        const val = balance * 0.05;
        return { value: val.toFixed(2), suffix: '', symbol: '$' };
    }
};

export const WalletCard = ({ balance = 0, name = 'User', activeTab, onRecyclePress }) => {
    const { theme, isDarkTheme } = useTheme();
    const { width: windowWidth } = useWindowDimensions();
    const screenWidth = Math.min(windowWidth || 400, 500);
    const [isCoinsFront, setIsCoinsFront] = useState(true);
    const [currency, setCurrency] = useState('auto');
    const [detectedCurrency, setDetectedCurrency] = useState('USD');

    const cardWidth = Math.max(screenWidth - 48, 280);
    const cardHeight = 180;
    const R = 20; // Corner radius
    const R2 = 45; // Cutout radius

    // Dynamic path generation to prevent cutout distortion
    const pathData = `M ${R},0 H ${cardWidth - R} A ${R},${R} 0 0 1 ${cardWidth},${R} V ${cardHeight - R2} A ${R2},${R2} 0 0 0 ${cardWidth - R2},${cardHeight} H ${R} A ${R},${R} 0 0 1 0,${cardHeight - R} V ${R} A ${R},${R} 0 0 1 ${R},0 Z`;

    // Animation values
    const dragY = useRef(new Animated.Value(0)).current;
    const backCardScale = useRef(new Animated.Value(0.94)).current;
    const backCardTop = useRef(new Animated.Value(0)).current;

    let navigation;
    try {
        navigation = useNavigation();
    } catch (e) {
        // Navigation not available in this context
    }

    const loadCurrencySetting = async () => {
        try {
            const savedVal = await AsyncStorage.getItem('@user_currency');
            if (savedVal) {
                setCurrency(savedVal);
            } else {
                setCurrency('auto');
            }
        } catch (e) {
            console.error('Error loading currency setting:', e);
        }
    };

    const fetchDefaultLocationAndDetectCurrency = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get default saved location
                const { data } = await supabase
                    .from('user_locations')
                    .select('city, address')
                    .eq('user_id', user.id)
                    .eq('is_default', true)
                    .single();
                
                if (data) {
                    const checkString = `${data.city} ${data.address}`.toLowerCase();
                    if (checkString.includes('cameroon') || checkString.includes('yaounde') || checkString.includes('douala') || checkString.includes('bafoussam') || checkString.includes('bamenda') || checkString.includes('cm')) {
                        setDetectedCurrency('XAF');
                        return;
                    }
                }
            }
        } catch (e) {
            // Silence silent location fetch error
        }

        // If no default location, try GPS bounds check (fast & offline)
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getLastKnownPositionAsync({});
                if (location) {
                    const { latitude, longitude } = location.coords;
                    // Cameroon bounds roughly: latitude 1.5 to 13.5, longitude 8.0 to 16.5
                    if (latitude >= 1.5 && latitude <= 13.5 && longitude >= 8.0 && longitude <= 16.5) {
                        setDetectedCurrency('XAF');
                        return;
                    }
                }
            }
        } catch (gpsErr) {
            // Silence GPS detection error
        }

        // Default fallback is USD
        setDetectedCurrency('USD');
    };

    useEffect(() => {
        if (navigation) {
            const unsubscribe = navigation.addListener('focus', () => {
                loadCurrencySetting();
                fetchDefaultLocationAndDetectCurrency();
            });
            loadCurrencySetting();
            fetchDefaultLocationAndDetectCurrency();
            return unsubscribe;
        } else {
            loadCurrencySetting();
            fetchDefaultLocationAndDetectCurrency();
        }
    }, [navigation]);

    // Handle updates when returning to the Home tab in custom switcher
    useEffect(() => {
        if (activeTab === 'home') {
            loadCurrencySetting();
            fetchDefaultLocationAndDetectCurrency();
        }
    }, [activeTab]);

    // Handle updates when balance changes
    useEffect(() => {
        loadCurrencySetting();
        fetchDefaultLocationAndDetectCurrency();
    }, [balance]);

    // PanResponder for vertical swipe gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dy) > 10,
            onPanResponderGrant: (evt, _) => {
                // Prevent parent ScrollView from scrolling
                evt?.nativeEvent?.target?.requestDisallowInterceptTouchEvent?.(true);
            },
            onPanResponderMove: (evt, gestureState) => {
                // Keep preventing parent ScrollView from scrolling during drag
                evt?.nativeEvent?.target?.requestDisallowInterceptTouchEvent?.(true);

                // Front card follows drag
                dragY.setValue(gestureState.dy);
                
                // Back card transitions (scales up and moves down to front position)
                const dragPercent = Math.min(Math.abs(gestureState.dy) / 150, 1);
                backCardScale.setValue(0.94 + dragPercent * 0.06);
                backCardTop.setValue(dragPercent * 28);
            },
            onPanResponderTerminationRequest: () => false,
            onShouldBlockNativeResponder: () => true,
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 40) {
                    // Swipe down completed
                    Animated.parallel([
                        Animated.timing(dragY, {
                            toValue: 160,
                            duration: 180,
                            useNativeDriver: false,
                        }),
                        Animated.timing(backCardScale, {
                            toValue: 1.0,
                            duration: 180,
                            useNativeDriver: false,
                        }),
                        Animated.timing(backCardTop, {
                            toValue: 28,
                            duration: 180,
                            useNativeDriver: false,
                        })
                    ]).start(() => {
                        setIsCoinsFront(prev => !prev);
                        dragY.setValue(0);
                        backCardScale.setValue(0.94);
                        backCardTop.setValue(0);
                    });
                } else if (gestureState.dy < -40) {
                    // Swipe up completed
                    Animated.parallel([
                        Animated.timing(dragY, {
                            toValue: -160,
                            duration: 180,
                            useNativeDriver: false,
                        }),
                        Animated.timing(backCardScale, {
                            toValue: 1.0,
                            duration: 180,
                            useNativeDriver: false,
                        }),
                        Animated.timing(backCardTop, {
                            toValue: 28,
                            duration: 180,
                            useNativeDriver: false,
                        })
                    ]).start(() => {
                        setIsCoinsFront(prev => !prev);
                        dragY.setValue(0);
                        backCardScale.setValue(0.94);
                        backCardTop.setValue(0);
                    });
                } else {
                    // Cancelled, bounce back
                    Animated.parallel([
                        Animated.spring(dragY, {
                            toValue: 0,
                            tension: 60,
                            friction: 7,
                            useNativeDriver: false,
                        }),
                        Animated.spring(backCardScale, {
                            toValue: 0.94,
                            tension: 60,
                            friction: 7,
                            useNativeDriver: false,
                        }),
                        Animated.spring(backCardTop, {
                            toValue: 0,
                            tension: 60,
                            friction: 7,
                            useNativeDriver: false,
                        })
                    ]).start();
                }
            }
        })
    ).current;

    const formattedBalance = balance?.toLocaleString() || '0';
    const activeCurrency = currency === 'auto' ? detectedCurrency : currency;
    const revenueData = getFormattedRevenue(balance, currency, detectedCurrency);
    const revenueText = `${revenueData.symbol}${revenueData.value}${revenueData.suffix}`;

    // Interpolate rotation based on swipe drag
    const frontCardStyle = {
        transform: [
            { translateY: dragY },
            { rotate: dragY.interpolate({
                inputRange: [-200, 0, 200],
                outputRange: ['-8deg', '0deg', '8deg']
              })
            }
        ]
    };

    const backCardStyle = {
        transform: [
            { scale: backCardScale }
        ],
        top: backCardTop
    };

    return (
        <View style={[styles.container, { height: cardHeight + 35 }]}>
            {/* Animated Back Card */}
            <Animated.View 
                style={[
                    styles.backCard, 
                    { 
                        width: cardWidth * 0.94,
                        backgroundColor: isCoinsFront ? theme.colors.accent : theme.colors.primary,
                        shadowColor: theme.colors.black,
                    },
                    backCardStyle
                ]}
            >
                <View style={styles.backCardHeader}>
                    <View style={styles.cardBrandLogo}>
                        <View style={[styles.brandCircle, { backgroundColor: 'rgba(255,255,255,0.4)', marginRight: -8 }]} />
                        <View style={[styles.brandCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                    </View>
                    <Text style={styles.backCardMask}>
                        {isCoinsFront ? '•••• •••• •••• 7216' : '•••• •••• •••• 4364'}
                    </Text>
                </View>
            </Animated.View>

            {/* Animated Front Card */}
            <Animated.View 
                style={[
                    styles.frontCard, 
                    { width: cardWidth, height: cardHeight },
                    frontCardStyle
                ]}
                {...panResponder.panHandlers}
            >
                {/* SVG Card shape with bottom-right corner cutout */}
                <Svg width={cardWidth} height={cardHeight} style={StyleSheet.absoluteFill}>
                    <Defs>
                        <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={isCoinsFront ? theme.colors.primaryDark : '#8E6638'} />
                            <Stop offset="100%" stopColor={isCoinsFront ? theme.colors.primary : theme.colors.accent} />
                        </LinearGradient>
                    </Defs>
                    <Path d={pathData} fill="url(#cardGrad)" />
                </Svg>

                {/* Front Card Inner Content */}
                <View style={styles.contentContainer}>
                    {/* Top Row */}
                    <View style={styles.topRow}>
                        <View style={styles.logoContainer}>
                            <Leaf size={18} color="rgba(255, 255, 255, 0.85)" />
                            <Text style={styles.logoText}>mytrash</Text>
                        </View>
                        <Text style={styles.frontCardMask}>
                            {isCoinsFront ? '•••• •••• •••• 4364' : '•••• •••• •••• 7216'}
                        </Text>
                    </View>

                    {/* Middle Row (Balance) */}
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>
                            {isCoinsFront ? 'eco coins balance' : 'estimated revenue'}
                        </Text>
                        <View style={styles.balanceRow}>
                            {isCoinsFront ? (
                                <>
                                    <Text style={styles.balanceValue}>{formattedBalance}</Text>
                                    <Text style={styles.balanceSuffix}> coins</Text>
                                </>
                            ) : (
                                <Text style={styles.balanceValue}>{revenueText}</Text>
                            )}
                        </View>
                    </View>

                    {/* Bottom Row */}
                    <View style={styles.bottomRow}>
                        <View style={styles.holderContainer}>
                            <Text style={styles.holderLabel}>card holder</Text>
                            <Text style={styles.holderName} numberOfLines={1}>
                                {name || 'MyTrash Member'}
                            </Text>
                        </View>
                        <View style={styles.infoContainer}>
                            <Text style={styles.infoLabel}>
                                {isCoinsFront ? 'tier' : 'currency'}
                            </Text>
                            <Text style={styles.infoValue}>
                                {isCoinsFront ? 'Eco-Champion' : activeCurrency}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Nesting Recycle Button in Cutout */}
                <TouchableOpacity 
                    style={[
                        styles.recycleButton, 
                        { 
                            backgroundColor: isDarkTheme ? '#1A2118' : '#000000',
                            shadowColor: theme.colors.black,
                        }
                    ]} 
                    activeOpacity={0.8}
                    onPress={onRecyclePress}
                >
                    <Leaf size={14} color={theme.colors.primary} style={styles.buttonIcon} />
                    <Text style={styles.recycleButtonText}>+ recycle</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative',
        marginVertical: 10,
    },
    backCard: {
        position: 'absolute',
        top: 0,
        height: 160,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        opacity: 0.9,
        zIndex: 1,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 3,
    },
    backCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardBrandLogo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    backCardMask: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '500',
        fontFamily: 'System',
    },
    frontCard: {
        zIndex: 2,
        position: 'relative',
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    frontCardMask: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        fontWeight: '500',
        fontFamily: 'System',
    },
    balanceContainer: {
        marginTop: 10,
    },
    balanceLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'lowercase',
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    balanceValue: {
        color: '#FFFFFF',
        fontSize: 32,
        fontWeight: '800',
    },
    balanceSuffix: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'lowercase',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingRight: 110, // Avoid overlapping the cutout button area
    },
    holderContainer: {
        flex: 1,
    },
    holderLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 9,
        fontWeight: '500',
        textTransform: 'lowercase',
    },
    holderName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    infoContainer: {
        marginLeft: 16,
    },
    infoLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 9,
        fontWeight: '500',
        textTransform: 'lowercase',
    },
    infoValue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    recycleButton: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 115,
        height: 38,
        borderRadius: 19,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 4,
    },
    buttonIcon: {
        marginRight: 4,
    },
    recycleButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'lowercase',
    },
});
