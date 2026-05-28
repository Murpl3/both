import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../../config';
import { apiRequest } from '../../utils/apiClient';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import Card from '../../components/ui/Card';
import TextField from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/Buttons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RT = Colors.rapidTransit;

export default function CreateAccountScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { phoneNumber: userPhoneNumber, backendUrl } = route.params || {};
  const BACKEND_URL = backendUrl || API_BASE_URL || 'http://localhost:8000';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneNumber = userPhoneNumber || '';

  const validateForm = () => {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return false;
    }
    if (!lastName.trim()) {
      setError('Please enter your last name');
      return false;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid email address');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm() || loading) return;
    setLoading(true);
    setError('');

    try {
      await apiRequest('/auth/create-account/', {
        method: 'POST',
        body: {
          phone_number: phoneNumber.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() ? email.trim().toLowerCase() : undefined,
        },
        baseUrl: BACKEND_URL,
      });
      navigation.navigate('MPIN', {
        phoneNumber: phoneNumber.trim(),
        mode: 'create',
        backendUrl,
        firstName: firstName.trim(),
      });
    } catch (err) {
      setError(err?.message || 'Failed to create account. Please try again.');
    }
    setLoading(false);
  };

  return (
    <Screen>
      <AppHeader title="Create Account" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card radius="card" style={styles.card}>
          <Text style={styles.cardHeadline}>Your Details</Text>

          <TextField
            label="First Name"
            value={firstName}
            onChangeText={(t) => {
              setFirstName(t);
              setError('');
            }}
            placeholder="Enter First Name"
            autoCapitalize="words"
            editable={!loading}
          />

          <TextField
            label="Last Name"
            value={lastName}
            onChangeText={(t) => {
              setLastName(t);
              setError('');
            }}
            placeholder="Enter Last Name"
            autoCapitalize="words"
            editable={!loading}
          />

          <TextField
            label="Email (Optional)"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError('');
            }}
            placeholder="sample@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.termsText}>
            By clicking sign up below, you&apos;ve agreed to EzSakay&apos;s{'\n'}
            <Text style={styles.linkText}>Terms and Conditions</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>

          <PrimaryButton
            title="Sign up"
            onPress={handleSignUp}
            loading={loading}
            disabled={!firstName.trim() || !lastName.trim()}
          />
        </Card>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    paddingTop: 20,
    paddingBottom: 60,
    flexGrow: 1,
  },
  card: {
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  cardHeadline: {
    fontSize: 22,
    fontFamily: FONTS.Poppins.black,
    color: RT.slate900,
    marginBottom: 22,
  },
  errorText: {
    color: RT.primaryDark,
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    textAlign: 'center',
    marginBottom: 12,
  },
  termsText: {
    fontSize: 12,
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate500,
    textAlign: 'center',
    marginVertical: 14,
    lineHeight: 18,
  },
  linkText: {
    color: RT.primary,
    fontFamily: FONTS.Rubik.bold,
  },
});
