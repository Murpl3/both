import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FONTS } from '../../fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../styles/designSystem';
import { apiRequest } from '../../utils/apiClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ConductorMPINScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { username, backendUrl } = route.params || {};

  const [mpin, setMpin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [conductorInfo, setConductorInfo] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmMpin, setConfirmMpin] = useState(null);

  useEffect(() => {
    const loadConductorInfo = async () => {
      try {
        const stored = await AsyncStorage.getItem('conductor_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          setConductorInfo(parsed);
          if (!parsed.mpin_set) {
            setIsCreating(true);
          }
        }
      } catch (_) {
        /* ignore parse errors */
      }
    };
    loadConductorInfo();
  }, [username]);

  const handleNumberPress = (num) => {
    if (loading) return;

    if (mpin.every((d) => d)) return;

    const index = mpin.findIndex((d) => !d);
    if (index !== -1) {
      const newMpin = [...mpin];
      newMpin[index] = num;
      setMpin(newMpin);
      setError('');

      if (index === 5) {
        setTimeout(() => {
          handleMpinSubmit(newMpin.join(''));
        }, 100);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;

    const index = mpin.findIndex((d) => !d);
    const targetIndex = index === -1 ? 5 : index - 1;

    if (targetIndex >= 0 && mpin[targetIndex]) {
      const newMpin = [...mpin];
      newMpin[targetIndex] = '';
      setMpin(newMpin);
      setError('');
    }
  };

  const handleMpinSubmit = (mpinValue) => {
    if (isCreating) {
      handleCreateMpin(mpinValue);
    } else {
      handleVerifyMpin(mpinValue);
    }
  };

  const handleCreateMpin = async (mpinValue = null) => {
    const mpinCode = mpinValue || mpin.join('');
    if (mpinCode.length !== 6) {
      setError('Please enter 6-digit MPIN');
      return;
    }

    if (!confirmMpin) {
      setConfirmMpin(mpinCode);
      setMpin(['', '', '', '', '', '']);
      setError('');
      return;
    }

    if (confirmMpin !== mpinCode) {
      setError('MPINs do not match. Please try again.');
      setConfirmMpin(null);
      setMpin(['', '', '', '', '', '']);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await apiRequest('/conductor/create-mpin', {
        method: 'POST',
        baseUrl: backendUrl,
        body: { username, mpin: mpinCode },
      });

      const stored = await AsyncStorage.getItem('conductor_data');
      if (stored) {
        const updated = { ...JSON.parse(stored), mpin_set: true };
        await AsyncStorage.setItem('conductor_data', JSON.stringify(updated));
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'ConductorTabs' }],
      });
    } catch (err) {
      console.error('Create MPIN error:', err);
      setError(err?.message || 'Failed to create MPIN. Check your connection.');
      setConfirmMpin(null);
      setMpin(['', '', '', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMpin = async (mpinValue = null) => {
    const mpinCode = mpinValue || mpin.join('');
    if (mpinCode.length !== 6) {
      setError('Please enter 6-digit MPIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/conductor/verify-mpin', {
        method: 'POST',
        baseUrl: backendUrl,
        body: { username, mpin: mpinCode },
      });

      const conductor = data.conductor;
      await AsyncStorage.setItem('conductor_username', username);
      await AsyncStorage.setItem('conductor_data', JSON.stringify(conductor));
      if (data.access_token) {
        await AsyncStorage.setItem('conductor_token', data.access_token);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'ConductorTabs' }],
      });
    } catch (err) {
      console.error('Verify MPIN error:', err);
      const detail = err?.data?.detail || err?.message || '';
      if (err?.status === 400 && typeof detail === 'string' && detail.includes('not set')) {
        setIsCreating(true);
        setError('No MPIN set yet. Please create one now.');
        setMpin(['', '', '', '', '', '']);
      } else {
        setError(detail || 'Invalid MPIN. Please try again.');
        setMpin(['', '', '', '', '', '']);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderKeypadButton = (num, onPress, key) => (
    <TouchableOpacity
      key={key ?? num}
      style={styles.keypadButton}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <Text style={styles.keypadButtonText}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={Colors.conductor.gradient} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <TouchableOpacity
        style={[styles.backArrowButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        disabled={loading}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Image
          source={require('../../assets/left-arrow.png')}
          style={styles.backArrowIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={[styles.logoContainer, { paddingTop: insets.top + 32 }]}>
        <Image
          source={require('../../assets/bus-logo-removebg-preview.png')}
          style={styles.logoImage}
        />
        <Text style={styles.logoText}>EzSakay</Text>
      </View>

      <View style={[styles.formContainer, { paddingBottom: 40 + insets.bottom }]}>
        <Text style={styles.welcomeText}>
          Welcome, {conductorInfo?.full_name || `Conductor ${username || ''}`}
        </Text>
        <Text style={styles.subtitleText}>
          {isCreating
            ? confirmMpin
              ? 'Confirm your 6-digit MPIN'
              : 'Create your 6-digit MPIN'
            : 'Enter your 6-digit MPIN to continue'}
        </Text>

        <View style={styles.mpinContainer}>
          {mpin.map((digit, index) => (
            <View
              key={index}
              style={[styles.mpinCircle, !!digit && styles.mpinCircleFilled]}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : <View style={styles.errorPlaceholder} />}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.conductor.primary} />
          </View>
        )}

        <View style={styles.keypadContainer}>
          <View style={styles.keypadRow}>
            {[1, 2, 3].map((num) => renderKeypadButton(num, () => handleNumberPress(String(num))))}
          </View>
          <View style={styles.keypadRow}>
            {[4, 5, 6].map((num) => renderKeypadButton(num, () => handleNumberPress(String(num))))}
          </View>
          <View style={styles.keypadRow}>
            {[7, 8, 9].map((num) => renderKeypadButton(num, () => handleNumberPress(String(num))))}
          </View>
          <View style={styles.keypadRow}>
            <View style={styles.keypadButtonEmpty} />
            {renderKeypadButton(0, () => handleNumberPress('0'))}
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={handleBackspace}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.backspaceIcon}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: SCREEN_HEIGHT * 0.02,
  },
  logoImage: {
    width: Math.min(SCREEN_WIDTH * 0.32, 120),
    height: Math.min(SCREEN_WIDTH * 0.32, 120),
    resizeMode: 'contain',
    tintColor: '#fff',
    marginBottom: 6,
  },
  logoText: {
    color: '#fff',
    fontSize: Math.min(SCREEN_WIDTH * 0.045, 18),
    fontFamily: FONTS.Poppins.black,
    letterSpacing: 6,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: Math.min(SCREEN_WIDTH * 0.085, 34),
    borderTopRightRadius: Math.min(SCREEN_WIDTH * 0.085, 34),
    paddingHorizontal: SCREEN_WIDTH * 0.075,
    paddingTop: SCREEN_HEIGHT * 0.035,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.055, 22),
    fontFamily: FONTS.Poppins.bold,
    color: Colors.conductor.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
    fontFamily: FONTS.Rubik.medium,
    color: '#666',
    textAlign: 'center',
    marginBottom: SCREEN_HEIGHT * 0.025,
  },
  mpinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.02,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  mpinCircle: {
    width: Math.min(SCREEN_WIDTH * 0.04, 16),
    height: Math.min(SCREEN_WIDTH * 0.04, 16),
    borderRadius: Math.min(SCREEN_WIDTH * 0.02, 8),
    borderWidth: 2,
    borderColor: '#ddd',
    marginHorizontal: SCREEN_WIDTH * 0.02,
    backgroundColor: 'transparent',
  },
  mpinCircleFilled: {
    backgroundColor: Colors.conductor.primary,
    borderColor: Colors.conductor.primary,
  },
  errorText: {
    color: Colors.common.error,
    fontSize: Math.min(SCREEN_WIDTH * 0.034, 13),
    fontFamily: FONTS.Rubik.medium,
    textAlign: 'center',
    marginBottom: SCREEN_HEIGHT * 0.012,
    minHeight: SCREEN_HEIGHT * 0.025,
  },
  errorPlaceholder: {
    minHeight: SCREEN_HEIGHT * 0.025,
    marginBottom: SCREEN_HEIGHT * 0.012,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  keypadContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingBottom: SCREEN_HEIGHT * 0.02,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SCREEN_HEIGHT * 0.022,
  },
  keypadButton: {
    width: Math.min(SCREEN_WIDTH * 0.175, 70),
    height: Math.min(SCREEN_WIDTH * 0.175, 70),
    borderRadius: Math.min(SCREEN_WIDTH * 0.0875, 35),
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE8B0',
  },
  keypadButtonEmpty: {
    width: Math.min(SCREEN_WIDTH * 0.175, 70),
    height: Math.min(SCREEN_WIDTH * 0.175, 70),
  },
  keypadButtonText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.06, 24),
    fontFamily: FONTS.Poppins.bold,
    color: Colors.conductor.primary,
  },
  backspaceIcon: {
    fontSize: Math.min(SCREEN_WIDTH * 0.06, 24),
    color: Colors.conductor.primary,
  },
});

export default ConductorMPINScreen;
