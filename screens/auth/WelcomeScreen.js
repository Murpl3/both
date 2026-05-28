import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../../styles/designSystem';
import { FONTS } from '../../fonts';
import Screen from '../../components/ui/Screen';
import Card from '../../components/ui/Card';
import { PrimaryButton, SecondaryButton } from '../../components/ui/Buttons';

const RT = Colors.rapidTransit;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen({ navigation, route }) {
  const backendUrl = route?.params?.backendUrl;

  const handlePassengerLogin = () => {
    navigation.navigate('PhoneNumber', { mode: 'login', backendUrl });
  };

  const handleCreateAccount = async () => {
    await AsyncStorage.multiRemove([
      'walletBalance',
      'transactions',
      'walletOwnerPhone',
      'transactionOwnerPhone',
    ]);
    await AsyncStorage.setItem('walletBalance', '0.00');
    navigation.navigate('CreateScreen', { mode: 'signup', backendUrl });
  };

  const handleConductorLogin = () => {
    navigation.navigate('ConductorLogin', { backendUrl });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card radius="large" style={styles.card}>
          <View style={styles.brandBlock}>
            <View style={styles.logoPuck}>
              <Image
                source={require('../../assets/bus-logo-removebg-preview.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>EzSakay</Text>
            <Text style={styles.subtitle}>Your journey, simplified</Text>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              title="Login as Passenger"
              onPress={handlePassengerLogin}
              icon={<Feather name="arrow-right" size={18} color={RT.white} />}
            />
            <View style={{ height: Spacing.md }} />
            <SecondaryButton title="Create Account" onPress={handleCreateAccount} />
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={handleConductorLogin}
            activeOpacity={0.8}
            style={styles.conductorRow}
          >
            <View style={styles.conductorBadge}>
              <Feather name="user-check" size={18} color={Colors.conductor.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.conductorTitle}>Continue as Conductor</Text>
              <Text style={styles.conductorSub}>Staff portal &amp; ticketing</Text>
            </View>
            <Feather name="chevron-right" size={20} color={RT.slate400} />
          </TouchableOpacity>
        </Card>

        <Text style={styles.legal}>
          By continuing, you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Math.min(SCREEN_WIDTH * 0.07, 28),
    paddingBottom: Spacing.xxl,
  },
  card: {
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoPuck: {
    width: 80,
    height: 80,
    borderRadius: 32,
    backgroundColor: RT.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  logo: {
    width: 44,
    height: 44,
    tintColor: RT.white,
  },
  title: {
    fontSize: 30,
    fontFamily: FONTS.Poppins.black,
    color: RT.slate900,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
    textAlign: 'center',
  },
  actions: {
    marginBottom: Spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: RT.slate100,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 11,
    fontFamily: FONTS.Poppins.black,
    color: RT.slate400,
    letterSpacing: 2,
  },
  conductorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RT.slate50,
    borderWidth: 1,
    borderColor: RT.slate100,
    borderRadius: 22,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  conductorBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.conductor.ultraLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conductorTitle: {
    fontFamily: FONTS.Poppins.bold,
    fontSize: 14,
    color: RT.slate800,
  },
  conductorSub: {
    marginTop: 2,
    fontFamily: FONTS.Rubik.medium,
    fontSize: 11,
    color: RT.slate500,
  },
  legal: {
    marginTop: 22,
    paddingHorizontal: Spacing.lg,
    fontSize: 11,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate400,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    color: RT.primary,
    fontFamily: FONTS.Rubik.bold,
  },
});
