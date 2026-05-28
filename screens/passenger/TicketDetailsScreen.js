import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import { apiRequest, getPassengerToken } from '../../utils/apiClient';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';

const RT = Colors.rapidTransit;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TicketDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { transaction } = route.params || {};
  
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(0);
  const [serverQR, setServerQR] = useState(null);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Entrance animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Pulse animation for QR code when active
    if (!isTicketExpired()) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
    }
  }, []);

  // Live countdown timer - ticket expires 5 mins BEFORE departure
  useEffect(() => {
    if (!transaction?.departureTimestamp) return;

    const updateTimer = () => {
      const now = Date.now();
      // Ticket expires 5 minutes BEFORE departure (boarding cutoff)
      const expiryTime = transaction.departureTimestamp - (transaction.expiryMinutes || 5) * 60 * 1000;
      const remaining = Math.max(0, expiryTime - now);
      setTimeUntilExpiry(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [transaction]);

  // Format time remaining (MM:SS)
  const formatTimeRemaining = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Parse date from transaction
  const parseDate = (dateString) => {
    if (!dateString) return 'Aug 10, 2025 Sun';
    // Try to parse the date string (format: MM/DD/YYYY HH:MM AM/PM)
    try {
      const [datePart, timePart] = dateString.split(' ');
      const [month, day, year] = datePart.split('/');
      const date = new Date(year, month - 1, day);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${day}, ${year} ${days[date.getDay()]}`;
    } catch {
      return dateString;
    }
  };

  // Generate QR code data (JSON string with ticket info)
  const generateQRData = () => {
    if (serverQR) return serverQR;
    const qrData = {
      refNo: transaction?.refNo || '',
      date: transaction?.date || '',
      from: transaction?.origin || '',
      to: transaction?.destination || '',
      amount: transaction?.amount || 0,
      payment: transaction?.type || 'CASH',
      departureTimestamp: transaction?.departureTimestamp || Date.now(),
      expiryMinutes: transaction?.expiryMinutes || 5,
      schedule: transaction?.schedule || 'N/A',
      // IMPORTANT: Include passenger info for conductor verification
      passengers: transaction?.passengers || 1,
      userPhone: transaction?.userPhone || '',
      passengerName: transaction?.passengerDetails 
        ? `${transaction.passengerDetails.firstName || ''} ${transaction.passengerDetails.lastName || ''}`.trim()
        : '',
    };
    return JSON.stringify(qrData);
  };

  useEffect(() => {
    (async () => {
      try {
        if (!transaction?.id) return;
        const token = await getPassengerToken();
        if (!token) return;
        const qr = await apiRequest(`/tickets/${transaction.id}/qr`, { method: 'POST', token });
        // Conductor scanner expects {payload,signature}
        setServerQR(JSON.stringify({ payload: qr.payload, signature: qr.signature }));
      } catch (e) {
        // fallback to legacy QR
      }
    })();
  }, [transaction?.id]);

  // Check if ticket is expired (5 mins BEFORE departure - boarding cutoff)
  const isTicketExpired = () => {
    if (!transaction?.departureTimestamp) return false;
    const now = Date.now();
    // Ticket expires 5 minutes BEFORE departure (must board before this time)
    const expiryTime = transaction.departureTimestamp - (transaction.expiryMinutes || 5) * 60 * 1000;
    return now > expiryTime;
  };

  // Check if ticket has been used (scanned by conductor)
  const isTicketUsed = () => {
    return transaction?.status === 'USED';
  };

  const expired = isTicketExpired();
  const used = isTicketUsed();

  // Calculate distance (placeholder - would come from backend in real app)
  const getDistance = () => {
    // Placeholder calculation
    return '11 KM';
  };

  // Get vehicle number (placeholder)
  const getVehicleNo = () => {
    return '3033 20';
  };

  // Get driver number (placeholder)
  const getDriverNo = () => {
    return '10011, Driver';
  };

  // Get conductor number (placeholder)
  const getConductorNo = () => {
    return '12011, Conductor';
  };

  // Determine fare type (placeholder - would come from backend)
  const getFareType = () => {
    return 'STUDENT FARE';
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Ticket" subtitle="QR ticket details" onBack={() => navigation.replace('MainTabs', { screen: 'Home' })} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Code Section */}
        <Animated.View 
          style={[
            styles.qrContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {used ? (
            <>
              <View style={styles.usedCircle}>
                <Text style={styles.usedIcon}>✓</Text>
              </View>
              <View style={[styles.qrCodeWrapper, styles.qrCodeUsed]}>
                <QRCode
                  value={generateQRData()}
                  size={Math.min(SCREEN_WIDTH * 0.5, 220)}
                  color={RT.slate400}
                  backgroundColor={RT.slate100}
                />
                <View style={styles.usedOverlay}>
                  <Text style={styles.usedOverlayText}>COMPLETED</Text>
                </View>
              </View>
              <Text style={styles.usedText}>Trip Completed</Text>
              <Text style={styles.usedSubText}>
                This ticket has been successfully scanned by the conductor.{'\n'}
                {'\n'}
                <Text style={styles.usedSubTextBold}>Thank you</Text> for riding with DASUTRANSCO!{'\n'}
                {'\n'}
                Have a safe trip! 🚌
              </Text>
            </>
          ) : expired ? (
            <>
              <View style={styles.expiredCircle}>
                <Text style={styles.expiredIcon}>✕</Text>
              </View>
              <View style={[styles.qrCodeWrapper, styles.qrCodeExpired]}>
                <QRCode
                  value={generateQRData()}
                  size={Math.min(SCREEN_WIDTH * 0.5, 220)}
                  color={RT.slate400}
                  backgroundColor={RT.slate100}
                />
                <View style={styles.expiredOverlay}>
                  <Text style={styles.expiredOverlayText}>EXPIRED</Text>
                </View>
              </View>
              <Text style={styles.expiredText}>Ticket Expired</Text>
              <Text style={styles.expiredSubText}>
                This ticket is no longer valid.{'\n'}
                {'\n'}
                <Text style={styles.expiredSubTextBold}>Policy:</Text> Passengers must board at least 5 minutes before departure time. Late arrivals will have their tickets automatically expired.{'\n'}
                {'\n'}
                <Text style={styles.expiredSubTextBold}>Note:</Text> This ticket is NOT refundable.
              </Text>
              <TouchableOpacity 
                style={styles.policyButton}
                onPress={() => Alert.alert(
                  'Ticket Policy',
                  '• Tickets expire 5 minutes BEFORE scheduled departure\n• You must board before the cutoff time\n• No refunds for expired tickets\n• Contact support for special circumstances'
                )}
              >
                <Text style={styles.policyButtonText}>View Full Policy</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Animated.View 
                style={[
                  styles.checkmarkCircle,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <Text style={styles.checkmark}>✓</Text>
              </Animated.View>
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={generateQRData()}
                  size={Math.min(SCREEN_WIDTH * 0.5, 220)}
                  color={RT.slate900}
                  backgroundColor={RT.qrFrameBg}
                />
              </View>
              <Text style={styles.confirmedText}>Ticket Booked!</Text>
              <Text style={styles.scheduleText}>
                Departure: {transaction?.schedule || 'N/A'}
              </Text>
              
              {/* Live Countdown Timer */}
              {timeUntilExpiry > 0 && (
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownLabel}>Time until expiry:</Text>
                  <Text style={[
                    styles.countdownTimer,
                    timeUntilExpiry < 60000 && styles.countdownTimerWarning
                  ]}>
                    {formatTimeRemaining(timeUntilExpiry)}
                  </Text>
                </View>
              )}
              
              <Text style={styles.expiryWarning}>
                ⚠️ Must board 5 mins before departure
              </Text>
              <Text style={styles.qrPurpose}>
                Show this QR code to the conductor for verification
              </Text>
            </>
          )}
        </Animated.View>

        {/* DONE Button */}
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => navigation.replace('MainTabs', { screen: 'Home' })}
        >
          <Text style={styles.doneButtonText}>DONE</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    position: 'relative',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: SCREEN_WIDTH * 0.04,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  backIcon: {
    color: RT.white,
    fontSize: Math.min(SCREEN_WIDTH * 0.055, 22),
    fontFamily: FONTS.Rubik.bold,
  },
  headerTitle: {
    color: RT.white,
    fontSize: Math.min(SCREEN_WIDTH * 0.038, 15),
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
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  qrContainer: {
    backgroundColor: RT.white,
    marginHorizontal: SCREEN_WIDTH * 0.04,
    marginVertical: SCREEN_HEIGHT * 0.025,
    borderRadius: 22,
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    paddingVertical: SCREEN_HEIGHT * 0.05,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  checkmarkCircle: {
    width: Math.min(SCREEN_WIDTH * 0.2, 90),
    height: Math.min(SCREEN_WIDTH * 0.2, 90),
    borderRadius: Math.min(SCREEN_WIDTH * 0.1, 45),
    borderWidth: 3,
    borderColor: Colors.passenger.primary,
    backgroundColor: RT.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.04,
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  checkmark: {
    fontSize: Math.min(SCREEN_WIDTH * 0.1, 42),
    color: Colors.passenger.primary,
    fontFamily: FONTS.Rubik.bold,
  },
  qrCodeWrapper: {
    backgroundColor: RT.white,
    padding: SCREEN_WIDTH * 0.045,
    borderRadius: 16,
    marginBottom: SCREEN_HEIGHT * 0.03,
    borderWidth: 3,
    borderColor: Colors.passenger.primary,
    position: 'relative',
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmedText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.058, 24),
    fontFamily: FONTS.Rubik.bold,
    color: Colors.passenger.primary,
    textAlign: 'center',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  scheduleText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.037, 15),
    fontFamily: FONTS.Rubik.bold,
    color: Colors.rapidTransit.slate800,
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.01,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.passenger.ultraLight,
    paddingVertical: SCREEN_HEIGHT * 0.014,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    borderRadius: 25,
    marginTop: SCREEN_HEIGHT * 0.02,
    borderWidth: 1,
    borderColor: Colors.passenger.light,
  },
  countdownLabel: {
    fontSize: Math.min(SCREEN_WIDTH * 0.032, 13),
    fontFamily: FONTS.Rubik.medium,
    color: Colors.rapidTransit.slate600,
    marginRight: 8,
  },
  countdownTimer: {
    fontSize: Math.min(SCREEN_WIDTH * 0.047, 19),
    fontFamily: FONTS.Rubik.bold,
    color: Colors.passenger.primary,
  },
  countdownTimerWarning: {
    color: RT.error,
  },
  expiryWarning: {
    fontSize: Math.min(SCREEN_WIDTH * 0.032, 13),
    fontFamily: FONTS.Rubik.semiBold,
    color: RT.warning,
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.015,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    backgroundColor: RT.warningSoft,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  qrPurpose: {
    fontSize: Math.min(SCREEN_WIDTH * 0.029, 12),
    fontFamily: FONTS.Rubik.regular,
    color: Colors.rapidTransit.slate400,
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.012,
    fontStyle: 'italic',
    paddingHorizontal: SCREEN_WIDTH * 0.08,
    lineHeight: 18,
  },
  expiredCircle: {
    width: Math.min(SCREEN_WIDTH * 0.2, 90),
    height: Math.min(SCREEN_WIDTH * 0.2, 90),
    borderRadius: Math.min(SCREEN_WIDTH * 0.1, 45),
    borderWidth: 3,
    borderColor: RT.error,
    backgroundColor: RT.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.04,
    shadowColor: RT.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  expiredIcon: {
    fontSize: Math.min(SCREEN_WIDTH * 0.1, 42),
    color: RT.error,
    fontFamily: FONTS.Rubik.bold,
  },
  qrCodeExpired: {
    opacity: 0.4,
    borderColor: RT.error,
    borderWidth: 2,
    position: 'relative',
  },
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  expiredOverlayText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.08, 32),
    fontFamily: FONTS.Rubik.bold,
    color: RT.error,
    transform: [{ rotate: '-25deg' }],
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  expiredText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.058, 24),
    fontFamily: FONTS.Rubik.bold,
    color: RT.error,
    textAlign: 'center',
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  expiredSubText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.034, 14),
    fontFamily: FONTS.Rubik.regular,
    color: Colors.rapidTransit.slate600,
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.01,
    lineHeight: Math.min(SCREEN_WIDTH * 0.055, 22),
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  expiredSubTextBold: {
    fontFamily: FONTS.Rubik.bold,
    color: Colors.rapidTransit.slate800,
  },
  // USED ticket styles (trip completed)
  usedCircle: {
    width: Math.min(SCREEN_WIDTH * 0.2, 90),
    height: Math.min(SCREEN_WIDTH * 0.2, 90),
    borderRadius: Math.min(SCREEN_WIDTH * 0.1, 45),
    borderWidth: 3,
    borderColor: RT.success,
    backgroundColor: RT.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.04,
    shadowColor: RT.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  usedIcon: {
    fontSize: Math.min(SCREEN_WIDTH * 0.1, 42),
    color: RT.success,
    fontFamily: FONTS.Rubik.bold,
  },
  qrCodeUsed: {
    opacity: 0.4,
    borderColor: RT.success,
    borderWidth: 2,
    position: 'relative',
  },
  usedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  usedOverlayText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.065, 26),
    fontFamily: FONTS.Rubik.bold,
    color: RT.success,
    transform: [{ rotate: '-25deg' }],
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  usedText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.058, 24),
    fontFamily: FONTS.Rubik.bold,
    color: RT.success,
    textAlign: 'center',
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  usedSubText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.034, 14),
    fontFamily: FONTS.Rubik.regular,
    color: Colors.rapidTransit.slate600,
    textAlign: 'center',
    marginTop: SCREEN_HEIGHT * 0.01,
    lineHeight: Math.min(SCREEN_WIDTH * 0.055, 22),
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  usedSubTextBold: {
    fontFamily: FONTS.Rubik.bold,
    color: RT.success,
  },
  policyButton: {
    marginTop: SCREEN_HEIGHT * 0.02,
    paddingVertical: SCREEN_HEIGHT * 0.014,
    paddingHorizontal: SCREEN_WIDTH * 0.07,
    backgroundColor: RT.white,
    borderWidth: 1.5,
    borderColor: RT.error,
    borderRadius: 25,
  },
  policyButtonText: {
    fontSize: Math.min(SCREEN_WIDTH * 0.032, 13),
    fontFamily: FONTS.Rubik.bold,
    color: RT.error,
  },
  doneButton: {
    backgroundColor: Colors.passenger.primary,
    marginHorizontal: SCREEN_WIDTH * 0.04,
    marginBottom: SCREEN_HEIGHT * 0.03,
    paddingVertical: SCREEN_HEIGHT * 0.02,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  doneButtonText: {
    color: RT.white,
    fontSize: Math.min(SCREEN_WIDTH * 0.042, 17),
    fontFamily: FONTS.Rubik.bold,
    letterSpacing: 0.5,
  },
});

