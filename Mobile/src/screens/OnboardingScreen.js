import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { slides } from '../constants/onboardingData';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const OnboardingScreen = ({ onDone }) => {
  const { theme, isDarkTheme } = useTheme(); // Use theme from context
  const [showSkipButton, setShowSkipButton] = useState(true);

  const _renderItem = ({ item }) => {
    return (
      <View style={[styles.slide, { backgroundColor: theme.colors.background }]}>
        <Image source={item.image} style={styles.image} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.text, { color: theme.colors.textLight }]}>{item.description}</Text>
      </View>
    );
  };

  const _renderNextButton = () => {
    return (
      <View style={[styles.buttonCircle, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.buttonText, { color: theme.colors.white }]}>Next</Text>
      </View>
    );
  };

  const _renderDoneButton = () => {
    return (
      <View style={[styles.buttonCircle, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.buttonText, { color: theme.colors.white }]}>Done</Text>
      </View>
    );
  };

  const _renderSkipButton = () => {
    return (
      <View style={styles.skipButton}>
        <Text style={[styles.skipButtonText, { color: theme.colors.text }]}>Skip</Text>
      </View>
    );
  };

  const _onSlideChange = (index) => {
    if (index >= 2) {
      setShowSkipButton(false);
    } else {
      setShowSkipButton(true);
    }
  };

  return (
    <>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      <AppIntroSlider
        renderItem={_renderItem}
        data={slides}
        onDone={onDone}
        renderDoneButton={_renderDoneButton}
        renderNextButton={_renderNextButton}
        renderSkipButton={_renderSkipButton}
        onSkip={onDone}
        showSkipButton={showSkipButton}
        onSlideChange={_onSlideChange}
        activeDotStyle={[{ backgroundColor: theme.colors.primary }, styles.activeDotStyle]}
        dotStyle={[{ backgroundColor: theme.colors.textLight }, styles.dotStyle]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    width: 350,
    height: 350,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  activeDotStyle: {},
  dotStyle: {
    backgroundColor: 'rgba(0, 0, 0, .2)',
  },
  skipButton: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
  },
});

export default OnboardingScreen;
