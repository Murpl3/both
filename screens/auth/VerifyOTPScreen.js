import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../../config';
import { apiRequest } from '../../utils/apiClient';
import { clearAllUserData } from '../../utils/walletUtils';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import Card from '../../components/ui/Card';
import OtpInput from '../../components/ui/OtpInput';
import { PrimaryButton } from '../../components/ui/Buttons';

const RT = Colors.rapidTransit;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CODE_LENGTH = 6;

export default function VerifyOTPScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { phoneNumber, mode, backendUrl } = route.params || {};
  const BACKEND_URL = backendUrl || API_BASE_URL || 'http://localhost:8000';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (otpValue = null) => {
    const value = otpValue || code;
    if (value.length !== CODE_LENGTH || !/^\d{6}$/.test(value)) {
      setError(`Please enter the ${CODE_LENGTH}-digit code`);
      return;
    }
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await apiRequest('/auth/totp/verify', {
        method: 'POST',
        body: { phone_number: phoneNumber, code: value },
        baseUrl: BACKEND_URL,
      });

      if (mode === 'signup') {
        await clearAllUserData(phoneNumber);
      }

      if (result.needs_account_details) {
        navigation.navigate('CreateAccount', { phoneNumber, backendUrl });
        return;
      }
      if (result.needs_mpin) {
        navigation.navigate('MPIN', { phoneNumber, mode: 'create', backendUrl });
        return;
      }
      navigation.navigate('MPIN', { phoneNumber, mode: 'login', backendUrl });
    } catch (err) {
      console.error('TOTP verification error:', err);
      setError(err?.message || 'Unable to verify code. Please try again.');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="Verify code" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <Card radius="large" style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="shield" size={28} color={RT.primary} />
          </View>
          <Text style={styles.title}>Enter authenticator code</Text>
          <Text style={styles.subtitle}>
            Open your authenticator app and enter the 6-digit code for{'\n'}
            <Text style={styles.phoneBold}>{phoneNumber || ''}</Text>
          </Text>

          <View style={styles.otpWrap}>
            <OtpInput
              length={CODE_LENGTH}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError('');
              }}
              onComplete={(v) => handleVerify(v)}
              disabled={loading}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title="Verify"
            onPress={() => handleVerify()}
            disabled={code.length < CODE_LENGTH}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <Text style={styles.helperText}>
            Codes refresh every 30 seconds. If your code keeps failing, make
            sure your phone&apos;s clock is set to automatic.
          </Text>
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Math.min(SCREEN_WIDTH * 0.07, 28),
    paddingVertical: 24,
  },
  card: {
    paddingVertical: 36,
    paddingHorizontal: 28,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: RT.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.Poppins.black,
    color: RT.slate900,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  phoneBold: {
    fontFamily: FONTS.Rubik.bold,
    color: RT.slate800,
  },
  otpWrap: {
    marginBottom: 16,
  },
  errorText: {
    color: RT.primaryDark,
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    textAlign: 'center',
    marginBottom: 12,
    backgroundColor: RT.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  helperText: {
    marginTop: 16,
    color: RT.slate400,
    fontSize: 11,
    fontFamily: FONTS.Rubik.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
});
