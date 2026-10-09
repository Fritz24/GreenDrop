import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, StatusBar, SafeAreaView } from 'react-native';
import { slides } from '../constants/onboardingData';

const OnboardingScreen = ({ onDone }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSlide = slides[currentIndex] || slides[0];
  const isLastSlide = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onDone();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    onDone();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F2" />

      {/* Main Slide Content */}
      <View style={styles.content}>
        <Image source={currentSlide.image} style={styles.image} resizeMode="contain" />
        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.description}>{currentSlide.description}</Text>
      </View>

      {/* Bottom Bar matching original mobile app */}
      <View style={styles.bottomBar}>
        {/* Left: Skip */}
        {!isLastSlide ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}

        {/* Center: Dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentIndex(index)}
                style={[styles.dot, isActive ? styles.activeDot : styles.inactiveDot]}
              />
            );
          })}
        </View>

        {/* Right: Round Next / Done Button */}
        <TouchableOpacity onPress={handleNext} style={styles.buttonCircle} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{isLastSlide ? 'Done' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FAF7F2',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FAF7F2',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  image: {
    width: 320,
    height: 320,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#202B1D',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#5A6B57',
    lineHeight: 22,
    maxWidth: 380,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#FAF7F2',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  skipButton: {
    minWidth: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipPlaceholder: {
    minWidth: 60,
    height: 40,
  },
  skipText: {
    fontSize: 16,
    color: '#5A6B57',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeDot: {
    backgroundColor: '#455A3F',
  },
  inactiveDot: {
    backgroundColor: 'rgba(69, 90, 63, 0.25)',
  },
  buttonCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#455A3F',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#455A3F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OnboardingScreen;
