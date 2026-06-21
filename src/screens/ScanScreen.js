import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Scan, X, CheckCircle, Package } from 'lucide-react-native';

export const ScanScreen = ({ onComplete }) => {
    const { theme, isDarkTheme } = useTheme();
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const lineAnim = new Animated.Value(0);

    useEffect(() => {
        if (isScanning) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(lineAnim, {
                        toValue: 250,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(lineAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            const timer = setTimeout(() => {
                setIsScanning(false);
                setScanResult({
                    name: 'Plastic Bottle',
                    points: 15,
                    material: 'PET 1',
                });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isScanning]);

    const reset = () => {
        setIsScanning(false);
        setScanResult(null);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Header title="Recycle" subtitle="Scan your items" showIcons={false} />

            <View style={styles.content}>
                {!scanResult ? (
                    <>
                        <View style={[styles.scannerOutline, { backgroundColor: theme.colors.surface }]}>
                            <View style={[styles.viewfinder, { backgroundColor: theme.colors.cardSecondary }]}>
                                {isScanning && (
                                    <Animated.View
                                        style={[
                                            styles.scanLine,
                                            {
                                                transform: [{ translateY: lineAnim }],
                                                backgroundColor: theme.colors.primary,
                                                shadowColor: theme.colors.primary
                                            }
                                        ]}
                                    />
                                )}
                                <Scan size={64} color={isScanning ? theme.colors.primary : theme.colors.textLight} strokeWidth={1} />
                            </View>
                        </View>

                        <Text style={[styles.hint, { color: theme.colors.textLight }]}>
                            {isScanning ? 'Identifying item...' : 'Align QR code or Barcode within the frame'}
                        </Text>

                        {!isScanning && (
                            <TouchableOpacity
                                style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}
                                onPress={() => setIsScanning(true)}
                            >
                                <Text style={[styles.scanButtonText, { color: '#FFFFFF' }]}>Start Scanning</Text>
                            </TouchableOpacity>
                        )}
                    </>
                ) : (
                    <View style={styles.resultContainer}>
                        <View style={styles.successIcon}>
                            <CheckCircle size={80} color={theme.colors.primary} />
                        </View>
                        <Text style={[styles.resultTitle, { color: theme.colors.text }]}>Item Identified!</Text>

                        <View style={[styles.resultCard, { backgroundColor: theme.colors.surface }]}>
                            <View style={[styles.itemImage, { backgroundColor: theme.colors.tint }]}>
                                <Package size={32} color={theme.colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.itemName, { color: theme.colors.text }]}>{scanResult.name}</Text>
                                <Text style={[styles.itemMeta, { color: theme.colors.textLight }]}>{scanResult.material}</Text>
                            </View>
                            <View style={styles.itemPoints}>
                                <Text style={[styles.pointValue, { color: theme.colors.primary }]}>+{scanResult.points}</Text>
                                <Text style={[styles.pointLabel, { color: theme.colors.textLight }]}>pts</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]} onPress={reset}>
                            <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>Add to Collection</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={reset}>
                            <Text style={[styles.cancelButtonText, { color: theme.colors.textLight }]}>Scan Another</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 40,
    },
    scannerOutline: {
        width: 280,
        height: 280,
        borderRadius: 40,
        padding: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    viewfinder: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    scanLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        zIndex: 10,
    },
    hint: {
        marginTop: 40,
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    scanButton: {
        marginTop: 40,
        paddingHorizontal: 40,
        paddingVertical: 18,
        borderRadius: 999,
    },
    scanButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
    resultContainer: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 24,
    },
    successIcon: {
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 30,
    },
    resultCard: {
        width: '100%',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemName: {
        fontSize: 18,
        fontWeight: '700',
    },
    itemMeta: {
        fontSize: 14,
    },
    itemPoints: {
        marginLeft: 'auto',
        alignItems: 'center',
    },
    pointValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    pointLabel: {
        fontSize: 12,
    },
    confirmButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 999,
        alignItems: 'center',
        marginBottom: 15,
    },
    confirmButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
    cancelButton: {
        width: '100%',
        paddingVertical: 15,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
