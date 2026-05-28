import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import Card from '../../components/ui/Card';
import TextField from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/Buttons';

const RT = Colors.rapidTransit;

export default function PassengerDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { schedule, origin, destination, passengers } = route.params || {};

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Load user data and pre-fill fields
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
        // Pre-fill all available user data
        if (parsedUser.first_name) {
          setFirstName(parsedUser.first_name);
        }
        if (parsedUser.last_name) {
          setLastName(parsedUser.last_name);
        }
        if (parsedUser.phone_number || parsedUser.contact) {
          setMobileNumber(parsedUser.phone_number || parsedUser.contact);
        }
        // Pre-fill email if available from user profile
        if (parsedUser.email) {
          setEmail(parsedUser.email);
          setConfirmEmail(parsedUser.email);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'Please enter your first name');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Please enter your last name');
      return false;
    }
    if (!mobileNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your mobile number');
      return false;
    }
    // Basic phone validation (at least 10 digits)
    if (!/^\d{10,}$/.test(mobileNumber.replace(/\D/g, ''))) {
      Alert.alert('Validation Error', 'Please enter a valid mobile number');
      return false;
    }
    // Email is optional - but if provided, validate it
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid email address');
        return false;
      }
      if (email.trim() !== confirmEmail.trim()) {
        Alert.alert('Validation Error', 'Email addresses do not match');
        return false;
      }
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateForm() || loading) return;

    setLoading(true);
    
    const passengerDetails = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim(),
    };

    // Navigate to ticket summary screen
    navigation.navigate('TicketSummary', {
      schedule,
      origin,
      destination,
      passengers,
      passengerDetails,
    });

    setLoading(false);
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Passenger details" subtitle="Fill in required info" onBack={() => navigation.goBack()} />

      {/* Step Indicator */}
      <View style={styles.stepIndicatorContainer}>
        <Text style={styles.stepIndicator}>Step 3</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* White Card Container */}
          <Card radius="card">
            <TextField
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              autoCapitalize="words"
              editable={!loading}
            />
            <TextField
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              autoCapitalize="words"
              editable={!loading}
            />
            <TextField
              label="Mobile Number"
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              editable={!loading}
            />
            <TextField
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            {email.trim() ? (
              <TextField
                label="Confirm Email"
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                placeholder="Re-enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            ) : null}
            <PrimaryButton
              title={loading ? 'Processing...' : 'Continue'}
              onPress={handleContinue}
              disabled={loading}
              loading={loading}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.rapidTransit.bg,
  },
  header: {
    backgroundColor: Colors.passenger.primary,
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 12,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  backIcon: {
    color: RT.white,
    fontSize: 22,
    fontFamily: FONTS.Rubik.bold,
  },
  headerTitle: {
    color: RT.white,
    fontSize: 15,
    fontFamily: FONTS.Rubik.bold,
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSpacer: {
    width: 32,
  },
  stepIndicatorContainer: {
    backgroundColor: Colors.rapidTransit.bg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stepIndicator: {
    color: RT.primary,
    fontSize: 12,
    fontFamily: FONTS.Rubik.bold,
    backgroundColor: RT.primarySoft,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    letterSpacing: 1,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  whiteCard: {
    backgroundColor: RT.white,
    borderRadius: 20,
    padding: 22,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: Colors.rapidTransit.slate600,
    marginBottom: 8,
    fontFamily: FONTS.Rubik.semiBold,
    letterSpacing: 0.3,
  },
  optionalLabel: {
    fontSize: 11,
    color: Colors.rapidTransit.slate400,
    fontFamily: FONTS.Rubik.regular,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1.5,
    borderColor: RT.slate200,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.rapidTransit.slate800,
    backgroundColor: Colors.rapidTransit.slate50,
    fontFamily: FONTS.Rubik.medium,
  },
  continueButton: {
    backgroundColor: Colors.passenger.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.passenger.tertiary,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: RT.white,
    fontSize: 15,
    fontFamily: FONTS.Rubik.bold,
    letterSpacing: 0.5,
  },
});

