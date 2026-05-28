import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../../config';
import { FONTS } from '../../fonts';
import { Colors, Spacing, scaleFont } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import Card from '../../components/ui/Card';
import TextField from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/Buttons';

const RT = Colors.rapidTransit;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PhoneNumberScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { mode } = route.params || {};
  const backendUrl = route.params?.backendUrl || API_BASE_URL || 'http://localhost:8000';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePhone = () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return false;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    setError('');
    return true;
  };

  const handleContinue = async () => {
    if (!validatePhone() || loading) return;
    setLoading(true);
    setError('');

    try {
      const formattedPhone = '+63' + phoneNumber.trim();

      if (mode === 'signup') {
        navigation.navigate('SetupTOTP', {
          phoneNumber: formattedPhone,
          mode,
          backendUrl,
        });
      } else {
        navigation.navigate('MPIN', {
          phoneNumber: formattedPhone,
          mode: 'login',
          backendUrl,
        });
      }
    } catch (err) {
      console.error('Navigation error:', err);
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (text) => {
    const digitsOnly = text.replace(/[^\d]/g, '');
    setPhoneNumber(digitsOnly.slice(0, 10));
    if (digitsOnly.length === 10) setError('');
  };

  return (
    <Screen>
      <AppHeader title="EzSakay" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card radius="large" style={styles.card}>
            <View style={styles.brandBlock}>
              <View style={styles.logoWrap}>
                <Image
                  source={require('../../assets/bus-logo-removebg-preview.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>EzSakay</Text>
              <Text style={styles.subtitle}>
                {mode === 'signup'
                  ? 'Register your number to begin'
                  : 'Enter your mobile number to begin'}
              </Text>
            </View>

            <TextField
              label="Mobile Number"
              prefix="+63"
              value={phoneNumber}
              onChangeText={formatPhoneNumber}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="912 345 6789"
              error={error}
              editable={!loading}
            />

            <PrimaryButton
              title="Continue"
              onPress={handleContinue}
              loading={loading}
              disabled={phoneNumber.length < 10}
            />

            <Text style={styles.legal}>
              By continuing, you agree to our <Text style={styles.legalLink}>Terms of Service</Text>
              {mode !== 'signup' ? (
                <>
                  {' '}and <Text style={styles.legalLink}>Privacy Policy</Text>.
                </>
              ) : (
                '.'
              )}
            </Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Math.min(SCREEN_WIDTH * 0.07, 28),
    paddingBottom: Spacing.xxl,
  },
  card: {
    paddingVertical: 40,
    paddingHorizontal: 36,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 32,
    backgroundColor: RT.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: {
    width: 44,
    height: 44,
    tintColor: RT.white,
  },
  title: {
    fontSize: Math.min(SCREEN_WIDTH * 0.08, 30),
    fontFamily: FONTS.Poppins.black,
    color: RT.slate900,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: scaleFont(14),
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
    textAlign: 'center',
  },
  legal: {
    marginTop: 20,
    fontSize: 10,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate400,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: Spacing.sm,
  },
  legalLink: {
    color: RT.primary,
    fontFamily: FONTS.Rubik.bold,
  },
});

export default PhoneNumberScreen;
