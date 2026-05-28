import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '../../fonts';
import { Colors, scaleFont, moderateScale } from '../../styles/designSystem';
import { generateSecureQRPayload } from '../../utils/securityUtils';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';

const RT = Colors.rapidTransit;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const QR_REFRESH_INTERVAL = 4 * 60 * 1000;

export default function PassengerQRScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState(null);
  const [qrExpiry, setQrExpiry] = useState(null);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadUserData();
    startPulseAnimation();

    const refreshInterval = setInterval(() => {
      refreshQRCode();
    }, QR_REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (!qrExpiry) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, qrExpiry - Date.now());
      setTimeUntilRefresh(remaining);

      if (remaining < 30000 && remaining > 0) {
        refreshQRCode();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [qrExpiry]);

  const refreshQRCode = async () => {
    if (user) {
      const qrContent = await generateSecureQRPayload(user);
      setQrData(qrContent);
      setQrExpiry(Date.now() + 5 * 60 * 1000);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadUserData = async () => {
    try {
      setLoading(true);

      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        const storedBalance = await AsyncStorage.getItem('walletBalance');
        if (storedBalance) {
          setBalance(parseFloat(storedBalance));
        }

        const qrContent = await generateSecureQRPayload(parsedUser);
        setQrData(qrContent);
        setQrExpiry(Date.now() + 5 * 60 * 1000);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const maskPhoneNumber = (phone) => {
    if (!phone) return '';
    if (phone.length > 7) {
      return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <Screen padded={false}>
        <AppHeader title="Payment QR" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={RT.primary} />
          <Text style={styles.loadingText}>Loading your QR code...</Text>
        </View>
      </Screen>
    );
  }

  const bottomPadding = Math.max(insets.bottom, 30) + 70;
  const timerLabel =
    timeUntilRefresh > 0 ? `Valid for ${formatTimeRemaining(timeUntilRefresh)}` : 'Refreshing…';

  return (
    <Screen padded={false}>
      <AppHeader title="Payment QR" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomPadding,
            minHeight: SCREEN_HEIGHT - 100 - insets.top,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>
              {user?.first_name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.first_name || 'Passenger'} {user?.last_name || ''}
            </Text>
            <Text style={styles.userPhone}>{maskPhoneNumber(user?.phone_number)}</Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>₱{balance.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.dashedOuter}>
          <Animated.View style={[styles.qrInner, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.qrWhitePad}>
              {qrData ? (
                <QRCode
                  value={qrData}
                  size={Math.min(SCREEN_WIDTH * 0.52, 200)}
                  color={RT.slate900}
                  backgroundColor={RT.qrFrameBg}
                />
              ) : (
                <Text style={styles.noQrText}>QR Code unavailable</Text>
              )}
            </View>
          </Animated.View>
        </View>

        <Text style={styles.heroTitle}>Show to Conductor</Text>
        <Text style={styles.heroSub}>
          Confirm your trip by scanning this code at the terminal or inside the bus.
        </Text>

        <View style={styles.securityStrip}>
          <View style={styles.securityLeft}>
            <View style={styles.shieldWrap}>
              <Feather name="shield" size={22} color={RT.primary} />
            </View>
            <View>
              <Text style={styles.securityCaps}>Security</Text>
              <Text style={styles.securityTimer}>{timerLabel}</Text>
            </View>
          </View>
          <ActivityIndicator color={RT.primary} />
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={refreshQRCode} activeOpacity={0.8}>
          <Feather name="refresh-cw" size={16} color={RT.slate600} />
          <Text style={styles.refreshBtnText}>Refresh QR Code</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          QR code auto-refreshes periodically for your security.
        </Text>

        {balance < 50 && (
          <TouchableOpacity
            style={styles.topUpButton}
            onPress={() => navigation.navigate('TopUp')}
            activeOpacity={0.9}
          >
            <Text style={styles.topUpButtonText}>Low balance — Tap to Top Up</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: RT.slate50,
    gap: 12,
    backgroundColor: RT.white,
  },
  headerBack: {
    padding: 8,
    borderRadius: 999,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate800,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RT.white,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: FONTS.Rubik.medium,
    fontSize: scaleFont(14),
    color: RT.slate400,
  },
  scrollView: {
    flex: 1,
    backgroundColor: RT.white,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    paddingTop: moderateScale(16),
    alignItems: 'center',
  },
  userCard: {
    width: '100%',
    backgroundColor: RT.slate50,
    borderRadius: 20,
    padding: moderateScale(14),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(20),
    borderWidth: 1,
    borderColor: RT.slate100,
  },
  userAvatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(16),
    backgroundColor: RT.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: scaleFont(20),
    color: RT.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: moderateScale(12),
  },
  userName: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: scaleFont(15),
    color: RT.slate900,
  },
  userPhone: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: scaleFont(11),
    color: RT.slate500,
    marginTop: 2,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: scaleFont(9),
    color: RT.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontFamily: FONTS.Poppins.bold,
    fontSize: scaleFont(16),
    color: RT.primary,
  },
  dashedOuter: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: RT.slate200,
    borderRadius: 48,
    padding: moderateScale(28),
    marginBottom: moderateScale(20),
    backgroundColor: RT.slate50,
  },
  qrInner: {
    alignItems: 'center',
  },
  qrWhitePad: {
    backgroundColor: RT.white,
    padding: moderateScale(18),
    borderRadius: 32,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  noQrText: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: scaleFont(14),
    color: RT.slate400,
    padding: moderateScale(40),
  },
  heroTitle: {
    fontFamily: FONTS.Poppins.black,
    fontSize: scaleFont(22),
    color: RT.slate900,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSub: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: scaleFont(13),
    color: RT.slate500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: moderateScale(22),
    paddingHorizontal: 8,
  },
  securityStrip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: RT.primarySoft,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: RT.primarySoftBorder,
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(18),
    marginBottom: moderateScale(16),
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  shieldWrap: {
    backgroundColor: 'rgba(255, 87, 34, 0.18)',
    padding: 8,
    borderRadius: 10,
  },
  securityCaps: {
    fontSize: 10,
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate500,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  securityTimer: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: scaleFont(13),
    color: RT.primary,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  refreshBtnText: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: scaleFont(13),
    color: RT.slate600,
  },
  hint: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: scaleFont(11),
    color: RT.slate400,
    textAlign: 'center',
    marginBottom: moderateScale(12),
  },
  topUpButton: {
    backgroundColor: RT.red500,
    paddingVertical: moderateScale(14),
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  topUpButtonText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: scaleFont(13),
    color: RT.white,
  },
});
