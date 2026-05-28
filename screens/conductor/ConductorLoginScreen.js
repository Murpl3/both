import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../../config';
import { FONTS } from '../../fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../styles/designSystem';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ConductorLoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const backendUrl = route.params?.backendUrl || API_BASE_URL || 'http://localhost:8000';
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${backendUrl}/conductor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Invalid username or password.\nPlease contact admin for credentials.');
        setLoading(false);
        return;
      }

      const conductor = data.conductor;
      console.log(`✅ Conductor ${conductor.username} authenticated via API`);

      await AsyncStorage.setItem('conductor_username', conductor.username);
      await AsyncStorage.setItem('conductor_data', JSON.stringify(conductor));
      if (data.access_token) {
        await AsyncStorage.setItem('conductor_token', data.access_token);
      }

      navigation.navigate('ConductorMPIN', {
        username: conductor.username,
      });
    } catch (err) {
      console.error('Conductor login error:', err);
      setError('Login failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={Colors.conductor.gradient} style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backArrowButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Image 
          source={require('../../assets/left-arrow.png')} 
          style={styles.backArrowIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/bus-logo-removebg-preview.png')} 
          style={styles.logoImage} 
        />
        <Text style={styles.logoText}>EzSakay</Text>
      </View>

      {/* Form Container */}
      <View style={[styles.formContainer, { paddingBottom: 40 + insets.bottom }]}>
        <Text style={styles.memberLoginText}>Member Login</Text>

        {/* Username Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputIconContainer}>
            <Image 
              source={require('../../assets/user.png')} 
              style={styles.inputIcon}
              resizeMode="contain"
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputIconContainer}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        {/* Error Message */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Login Button */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            (!username.trim() || !password.trim() || loading) && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={!username.trim() || !password.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Log in</Text>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backArrowButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? SCREEN_HEIGHT * 0.06 : SCREEN_HEIGHT * 0.05,
    left: SCREEN_WIDTH * 0.05,
    width: Math.min(SCREEN_WIDTH * 0.1, 40),
    height: Math.min(SCREEN_WIDTH * 0.1, 40),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backArrowIcon: {
    width: Math.min(SCREEN_WIDTH * 0.06, 24),
    height: Math.min(SCREEN_WIDTH * 0.06, 24),
    tintColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? SCREEN_HEIGHT * 0.085 : SCREEN_HEIGHT * 0.075,
  },
  logoImage: {
    width: Math.min(SCREEN_WIDTH * 0.43, 170),
    height: Math.min(SCREEN_WIDTH * 0.43, 170),
    resizeMode: 'contain',
    tintColor: '#fff',
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  logoText: {
    color: '#fff',
    fontSize: Math.min(SCREEN_WIDTH * 0.042, 17),
    fontFamily: FONTS.Rubik.bold,
    letterSpacing: 6,
    marginBottom: SCREEN_HEIGHT * 0.04,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Math.min(SCREEN_WIDTH * 0.085, 34),
    borderTopRightRadius: Math.min(SCREEN_WIDTH * 0.085, 34),
    paddingHorizontal: SCREEN_WIDTH * 0.075,
    paddingTop: SCREEN_HEIGHT * 0.04,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  memberLoginText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.055, 22),
    fontFamily: FONTS.Rubik.bold,
    color: Colors.conductor.primary,
    textAlign: 'center',
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: Math.min(SCREEN_WIDTH * 0.063, 25),
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    marginBottom: SCREEN_HEIGHT * 0.02,
    paddingHorizontal: SCREEN_WIDTH * 0.015,
    height: Math.min(SCREEN_HEIGHT * 0.063, 50),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIconContainer: {
    width: Math.min(SCREEN_WIDTH * 0.095, 38),
    height: Math.min(SCREEN_WIDTH * 0.095, 38),
    borderRadius: Math.min(SCREEN_WIDTH * 0.048, 19),
    backgroundColor: Colors.conductor.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SCREEN_WIDTH * 0.025,
  },
  inputIcon: {
    width: Math.min(SCREEN_WIDTH * 0.045, 18),
    height: Math.min(SCREEN_WIDTH * 0.045, 18),
    tintColor: '#999',
  },
  lockIcon: {
    fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
  },
  input: {
    flex: 1,
    fontSize: Math.min(SCREEN_WIDTH * 0.038, 15),
    color: '#333',
    fontFamily: FONTS.Rubik.regular,
    paddingVertical: SCREEN_HEIGHT * 0.015,
  },
  errorText: {
    color: Colors.common.error,
    fontSize: Math.min(SCREEN_WIDTH * 0.033, 13),
    marginTop: -SCREEN_HEIGHT * 0.01,
    marginBottom: SCREEN_HEIGHT * 0.015,
    textAlign: 'center',
    fontFamily: FONTS.Rubik.regular,
  },
  loginButton: {
    backgroundColor: Colors.conductor.primary,
    paddingVertical: SCREEN_HEIGHT * 0.018,
    borderRadius: Math.min(SCREEN_WIDTH * 0.063, 25),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SCREEN_HEIGHT * 0.015,
    width: '100%',
    minHeight: Math.min(SCREEN_HEIGHT * 0.063, 50),
    shadowColor: Colors.conductor.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.conductor.textDark,
    fontSize: Math.min(SCREEN_WIDTH * 0.04, 16),
    fontFamily: FONTS.Rubik.semiBold,
  },
});

export default ConductorLoginScreen;
