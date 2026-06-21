import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { Leaf } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;

export const WalletCard = ({ balance = 0, name = 'User', onRecyclePress }) => {
    const { theme, isDarkTheme } = useTheme();

    const cardWidth = screenWidth - 48; // Padding horizontal is 24 on each side
    const cardHeight = 180;
    const R = 20; // Corner radius
    const R2 = 45; // Cutout radius

    // Dynamic path generation to prevent cutout distortion
    const pathData = `M ${R},0 H ${cardWidth - R} A ${R},${R} 0 0 1 ${cardWidth},${R} V ${cardHeight - R2} A ${R2},${R2} 0 0 0 ${cardWidth - R2},${cardHeight} H ${R} A ${R},${R} 0 0 1 0,${cardHeight - R} V ${R} A ${R},${R} 0 0 1 ${R},0 Z`;

    const formattedBalance = balance?.toLocaleString() || '0';

    return (
        <View style={[styles.container, { height: cardHeight + 20 }]}>
            {/* Back Card (Warm Accent Card) */}
            <View 
                style={[
                    styles.backCard, 
                    { 
                        width: cardWidth * 0.94,
                        backgroundColor: theme.colors.accent,
                        shadowColor: theme.colors.black,
                    }
                ]}
            >
                {/* Visible top details of the back card */}
                <View style={styles.backCardHeader}>
                    {/* Overlapping circles like credit card brand */}
                    <View style={styles.cardBrandLogo}>
                        <View style={[styles.brandCircle, { backgroundColor: 'rgba(255,255,255,0.4)', marginRight: -8 }]} />
                        <View style={[styles.brandCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />
                    </View>
                    <Text style={styles.backCardMask}>•••• •••• •••• 7216</Text>
                </View>
            </View>

            {/* Front Card Container */}
            <View style={[styles.frontCard, { width: cardWidth, height: cardHeight }]}>
                {/* SVG Card shape with bottom-right corner cutout */}
                <Svg width={cardWidth} height={cardHeight} style={StyleSheet.absoluteFill}>
                    <Defs>
                        <LinearGradient id="frontCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor={theme.colors.primaryDark} />
                            <Stop offset="100%" stopColor={theme.colors.primary} />
                        </LinearGradient>
                    </Defs>
                    <Path d={pathData} fill="url(#frontCardGrad)" />
                </Svg>

                {/* Front Card Inner Content */}
                <View style={styles.contentContainer}>
                    {/* Top Row */}
                    <View style={styles.topRow}>
                        <View style={styles.logoContainer}>
                            <Leaf size={18} color="rgba(255, 255, 255, 0.85)" />
                            <Text style={styles.logoText}>greendrop</Text>
                        </View>
                        <Text style={styles.frontCardMask}>•••• •••• •••• 4364</Text>
                    </View>

                    {/* Middle Row (Balance) */}
                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>eco coins balance</Text>
                        <View style={styles.balanceRow}>
                            <Text style={styles.balanceValue}>{formattedBalance}</Text>
                            <Text style={styles.balanceSuffix}> coins</Text>
                        </View>
                    </View>

                    {/* Bottom Row */}
                    <View style={styles.bottomRow}>
                        <View style={styles.holderContainer}>
                            <Text style={styles.holderLabel}>card holder</Text>
                            <Text style={styles.holderName} numberOfLines={1}>
                                {name || 'GreenDrop Member'}
                            </Text>
                        </View>
                        <View style={styles.infoContainer}>
                            <Text style={styles.infoLabel}>tier</Text>
                            <Text style={styles.infoValue}>Eco-Champion</Text>
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
            </View>
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
