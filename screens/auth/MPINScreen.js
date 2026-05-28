import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import { apiRequest } from '../../utils/apiClient';
import { clearWalletData, associateWalletWithUser } from '../../utils/walletUtils';
import { logSecurityEvent } from '../../utils/securityUtils';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import Card from '../../components/ui/Card';
import Keypad from '../../components/ui/Keypad';

const RT = Colors.rapidTransit;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MPINScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { phoneNumber, mode, backendUrl } = route.params || {};
  const BACKEND_URL = backendUrl || API_BASE_URL || 'http://localhost:8000';

  const [mpin, setMpin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    if (phone.length > 7) {
      return `${phone.slice(0, 3)}***${phone.slice(-4)}`;
    }
    return phone;
  };

  const handleNumberPress = (num) => {
    if (mpin.every((d) => d) || loading) return;
    const index = mpin.findIndex((d) => !d);
    if (index !== -1) {
      const newMpin = [...mpin];
      newMpin[index] = num;
      setMpin(newMpin);
      setError('');
      if (index === 5) {
        setTimeout(() => handleSubmit(newMpin.join('')), 100);
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

  const handleSubmit = async (mpinValue = null) => {
    const mpinCode = mpinValue || mpin.join('');
    if (mpinCode.length !== 6) {
      setError('Please enter 6-digit MPIN');
      return;
    }
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const normalizedPhone = phoneNumber.trim();

      if (mode === 'create') {
        logSecurityEvent('MPIN_CREATE', { phone: normalizedPhone });

        const resp = await apiRequest('/auth/create-mpin/', {
          method: 'POST',
          body: { phone_number: normalizedPhone, mpin: mpinCode },
          baseUrl: BACKEND_URL,
        });

        await clearWalletData();
        await associateWalletWithUser(normalizedPhone);

        if (resp?.access_token) {
          await AsyncStorage.setItem('token', resp.access_token);
        }
        if (resp?.user) {
          await AsyncStorage.setItem('user', JSON.stringify(resp.user));
        }
        await AsyncStorage.setItem('mpin_set', 'true');

        try {
          const wallet = await apiRequest('/wallet/me', {
            method: 'GET',
            token: resp?.access_token,
            baseUrl: BACKEND_URL,
          });
          if (wallet?.balance !== undefined) {
            await AsyncStorage.setItem('walletBalance', Number(wallet.balance).toFixed(2));
          }
        } catch {}

        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        return;
      }

      logSecurityEvent('MPIN_LOGIN_ATTEMPT', { phone: normalizedPhone, success: true });

      const resp = await apiRequest('/auth/login-mpin/', {
        method: 'POST',
        body: { phone_number: normalizedPhone, mpin: mpinCode },
        baseUrl: BACKEND_URL,
      });

      const walletOwnerPhone = await AsyncStorage.getItem('walletOwnerPhone');
      if (walletOwnerPhone && walletOwnerPhone !== normalizedPhone) {
        await clearWalletData();
      }
      await associateWalletWithUser(normalizedPhone);

      if (resp?.access_token) {
        await AsyncStorage.setItem('token', resp.access_token);
      }
      if (resp?.user) {
        await AsyncStorage.setItem('user', JSON.stringify(resp.user));
      }
      await AsyncStorage.setItem('mpin_set', 'true');

      try {
        const wallet = await apiRequest('/wallet/me', {
          method: 'GET',
          token: resp?.access_token,
          baseUrl: BACKEND_URL,
        });
        if (wallet?.balance !== undefined) {
          await AsyncStorage.setItem('walletBalance', Number(wallet.balance).toFixed(2));
        }
      } catch {}

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (err) {
      console.error('MPIN error:', err);
      setError(err.message || 'Failed to save/verify MPIN. Please try again.');
      if (mode === 'create') {
        setMpin(['', '', '', '', '', '']);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPIN = () => {
    navigation.navigate('Email', {
      mode: 'login',
      backendUrl,
      forgotMpin: true,
    });
  };

  return (
    <Screen>
      <AppHeader
        title={mode === 'create' ? 'Secure Account' : 'Secure Login'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card radius="large" style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.shieldCircle}>
              <Feather name="shield" size={28} color={RT.white} />
            </View>
            <Text style={styles.headline}>
              {mode === 'create' ? 'Create MPIN' : 'Enter MPIN'}
            </Text>
            <Text style={styles.subline}>
              {mode === 'create'
                ? 'Create a 6-digit PIN to secure your wallet'
                : 'Enter your 6-digit security code'}
            </Text>
            {mode !== 'create' && phoneNumber ? (
              <Text style={styles.phoneHint}>{formatPhoneDisplay(phoneNumber)}</Text>
            ) : null}
          </View>

          <View style={styles.dotsRow}>
            {mpin.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.dotCell,
                  digit ? styles.dotCellFilled : styles.dotCellEmpty,
                ]}
              >
                <Text style={digit ? styles.dotCharFilled : styles.dotCharEmpty}>
                  {digit ? '\u2022' : ''}
                </Text>
              </View>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={RT.primary} />
              <Text style={styles.loadingLabel}>Verifying...</Text>
            </View>
          ) : null}

          <Keypad
            onPress={handleNumberPress}
            onBackspace={handleBackspace}
            disabled={loading}
          />

          {mode !== 'create' && (
            <TouchableOpacity onPress={handleForgotPIN} style={styles.forgotWrap} disabled={loading}>
              <Text style={styles.forgotText}>Forgot PIN?</Text>
            </TouchableOpacity>
          )}
        </Card>

        <View style={{ height: insets.bottom + 16 }} />
      </ScrollView>
    </Screen>
  );
}

const DOT_W = Math.min(SCREEN_WIDTH * 0.1, 40);
const DOT_H = Math.min(SCREEN_WIDTH * 0.14, 56);

const styles = StyleSheet.create({
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Math.min(SCREEN_WIDTH * 0.06, 24),
    paddingVertical: 16,
  },
  card: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: RT.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: RT.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  headline: {
    fontSize: 24,
    fontFamily: FONTS.Poppins.black,
    color: RT.slate900,
  },
  subline: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate400,
    textAlign: 'center',
  },
  phoneHint: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dotCell: {
    width: DOT_W,
    height: DOT_H,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCellEmpty: {
    borderColor: RT.slate100,
    backgroundColor: RT.slate50,
  },
  dotCellFilled: {
    borderColor: RT.primary,
    backgroundColor: RT.primarySoft,
  },
  dotCharEmpty: {
    fontSize: 26,
    fontFamily: FONTS.Poppins.black,
    color: 'transparent',
  },
  dotCharFilled: {
    fontSize: 26,
    fontFamily: FONTS.Poppins.black,
    color: RT.primary,
  },
  errorText: {
    color: Colors.common.error,
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingLabel: {
    fontSize: 14,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
  },
  forgotWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotText: {
    color: RT.primary,
    fontSize: 14,
    fontFamily: FONTS.Rubik.bold,
  },
});
