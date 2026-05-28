import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import { FONTS } from '../../fonts';
import { apiRequest, getPassengerToken } from '../../utils/apiClient';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';

const RT = Colors.rapidTransit;

export default function TicketSummaryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { schedule, origin, destination, passengers, passengerDetails } = route.params || {};

  const [paymentMethod, setPaymentMethod] = useState(null); // 'wallet' or 'cash'
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const farePerPassenger = parseFloat(schedule?.fare || 0);
  const totalFare = farePerPassenger * (passengers || 1);
  const convenienceFee = 0.00;
  const total = totalFare + convenienceFee;

  // Format date (today's date for now, or use schedule date if available)
  const getFormattedDate = () => {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  };

  // Generate a reference number with timestamp to avoid collision (timestamp + 4 random chars)
  const generateRefNo = () => {
    const ts = Date.now().toString(36).slice(-8); // last 8 chars of base36 timestamp
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let r = '';
    for (let i = 0; i < 4; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    return (ts + r).slice(-12); // 12 chars total: time-based + random
  };

  // Format date for transaction
  const getTransactionDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
  };

  const handleConfirm = async () => {
    if (!paymentMethod) {
      Alert.alert('Payment Required', 'Please select a payment method');
      return;
    }
    if (!termsAgreed) {
      Alert.alert('Terms Required', 'Please agree to the Terms and Conditions');
      return;
    }

    // If paying with wallet, check balance
    if (paymentMethod === 'wallet') {
      try {
        const storedBalance = await AsyncStorage.getItem('walletBalance');
        const currentBalance = storedBalance ? parseFloat(storedBalance) : 0.0;
        
        // Check for zero balance first
        if (currentBalance === 0 || currentBalance <= 0) {
          Alert.alert(
            'Zero Balance',
            'You have 0 balance. You need to top-up.',
            [
              {
                text: 'Top-up Now',
                onPress: () => {
                  navigation.navigate('TopUp');
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
          return;
        }
        
        // Check for insufficient balance
        if (currentBalance < total) {
          Alert.alert(
            'Insufficient Balance',
            `You have ₱${currentBalance.toFixed(2)} in your wallet, but need ₱${total.toFixed(2)}.\n\nPlease top-up your wallet or select cash payment.`,
            [
              {
                text: 'Top-up Now',
                onPress: () => {
                  navigation.navigate('TopUp');
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error checking balance:', error);
        Alert.alert('Error', 'Unable to check wallet balance. Please try again.');
        return;
      }
    }

    setLoading(true);

    // Snapshot the local cached balance so we can restore it if /bookings fails.
    let originalBalance = null;

    try {
      if (paymentMethod === 'wallet') {
        const storedBalance = await AsyncStorage.getItem('walletBalance');
        const currentBalance = storedBalance ? parseFloat(storedBalance) : 0.0;
        originalBalance = currentBalance;
        const newBalance = currentBalance - total;

        // Optimistic local cache update; the server is the source of truth and
        // we re-sync from /wallet/me right after the booking call succeeds.
        await AsyncStorage.setItem('walletBalance', newBalance.toString());
      }

      // Build a departure timestamp from the schedule the user picked. We
      // prefer the explicit schedule date when available, falling back to
      // "today, rolled to tomorrow if already past".
      const buildDepartureTimestamp = (serviceDate, timeStr) => {
        const timeMatch = (timeStr || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!timeMatch) return null;
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = (timeMatch[3] || '').toUpperCase();
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        if (serviceDate) {
          const [y, m, d] = serviceDate.split('-').map((n) => parseInt(n, 10));
          if (y && m && d) {
            return new Date(y, m - 1, d, hours, minutes, 0, 0).getTime();
          }
        }
        const now = new Date();
        const departure = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        if (departure.getTime() <= now.getTime()) {
          departure.setDate(departure.getDate() + 1);
        }
        return departure.getTime();
      };

      const token = await getPassengerToken();
      if (!token) throw new Error('Not logged in.');

      const booking = await apiRequest('/bookings', {
        method: 'POST',
        token,
        body: {
          route_id: schedule?.routeId || 1,
          schedule_id: schedule?.id,
          service_date: schedule?.serviceDate || new Date().toISOString().slice(0, 10),
          origin,
          destination,
          passengers,
          fare_amount: farePerPassenger,
          payment_mode: paymentMethod === 'wallet' ? 'WALLET' : 'CASH',
          passenger_details: passengerDetails ? [passengerDetails] : undefined,
        },
      });

      // Re-sync wallet balance from the server so cache matches reality.
      let userPhone = '';
      try {
        const wallet = await apiRequest('/wallet/me', { method: 'GET', token });
        if (wallet?.balance !== undefined) {
          await AsyncStorage.setItem('walletBalance', Number(wallet.balance).toFixed(2));
        }
        if (wallet?.phone_number) {
          userPhone = wallet.phone_number;
        }
      } catch {}

      if (!userPhone) {
        try {
          const userData = await AsyncStorage.getItem('user');
          const currentUser = userData ? JSON.parse(userData) : null;
          if (currentUser?.phone_number) userPhone = currentUser.phone_number;
        } catch {}
      }

      // Build the schedule string (HH:MM 24h from server -> "h:MM AM/PM") for display.
      const formatScheduleFromBackend = (hhmm) => {
        if (!hhmm) return schedule?.time || '';
        const [hStr, mStr] = String(hhmm).split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        if (Number.isNaN(h) || Number.isNaN(m)) return schedule?.time || '';
        const period = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${period}`;
      };

      const scheduleStr = formatScheduleFromBackend(booking.departure_time);
      const serviceDateStr = booking.service_date || schedule?.serviceDate || new Date().toISOString().slice(0, 10);
      const departureTimestamp = booking.expires_at
        ? new Date(booking.expires_at).getTime() - 5 * 60 * 1000
        : buildDepartureTimestamp(serviceDateStr, scheduleStr);

      const transaction = {
        id: booking.id,
        refNo: booking.ref_no,
        type: paymentMethod === 'wallet' ? 'WALLET' : 'CASH',
        description: `Bus ticket from ${origin} to ${destination}`,
        amount: booking.fare_amount,
        date: getTransactionDate(),
        origin,
        destination,
        passengers: booking.passengers,
        schedule: scheduleStr,
        operator: schedule?.operator || 'DASUTRANSCO',
        status: booking.status,
        serviceDate: serviceDateStr,
        departureTimestamp,
        userPhone,
      };

      navigation.replace('TicketDetails', { transaction });
    } catch (error) {
      console.error('Error saving transaction:', error);

      // Roll back the optimistic local wallet cache if booking failed.
      if (paymentMethod === 'wallet' && originalBalance !== null) {
        try {
          await AsyncStorage.setItem('walletBalance', originalBalance.toString());
        } catch {}
      }

      Alert.alert('Error', error?.message || 'Failed to save ticket. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Ticket Summary" subtitle="Review and confirm" onBack={() => navigation.goBack()} />

      {/* Step Indicator */}
      <View style={styles.stepIndicatorContainer}>
        <Text style={styles.stepIndicator}>Step 4</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* White Card Container */}
        <View style={styles.whiteCard}>
          {/* Route Information */}
          <View style={styles.routeRow}>
            <Text style={styles.routeText} numberOfLines={2} ellipsizeMode="tail">{origin || 'Origin'}</Text>
            <Text style={styles.arrowIcon}>→</Text>
            <Text style={[styles.routeText, styles.destinationText]} numberOfLines={2} ellipsizeMode="tail">{destination || 'Destination'}</Text>
          </View>

          {/* Bus Operator */}
          <Text style={styles.operatorText}>{schedule?.operator || 'DASUTRANSCO'}</Text>

          {/* Date and Time */}
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeColumn}>
              <Text style={styles.dateTimeValue}>{getFormattedDate()}</Text>
              <Text style={styles.dateTimeLabel}>DATE</Text>
            </View>
            <View style={styles.dateTimeColumn}>
              <Text style={styles.dateTimeValue}>{schedule?.time || '9:00 AM'}</Text>
              <Text style={styles.dateTimeLabel}>TIME</Text>
            </View>
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Summary Section */}
          <Text style={styles.summaryTitle}>SUMMARY</Text>

          {/* Fare Breakdown */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryMainText}>MINI BUS FARE</Text>
              <Text style={styles.summarySubText}>
                {origin || 'Origin'} to {destination || 'Destination'}
              </Text>
              <Text style={styles.summarySubText}>
                {passengers || 1}x Passenger{passengers > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.summaryPrice}>P{totalFare.toFixed(2)}</Text>
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Subtotal */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>P{totalFare.toFixed(2)}</Text>
          </View>

          {/* Convenience Fee */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Convenience Fee</Text>
            <Text style={styles.summaryValue}>P{convenienceFee.toFixed(2)}</Text>
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Total */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>P{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Options */}
        <View style={styles.paymentOptionsRow}>
          <TouchableOpacity
            style={[
              styles.paymentButton,
              paymentMethod === 'wallet' && styles.paymentButtonSelected,
            ]}
            onPress={() => setPaymentMethod('wallet')}
          >
            <Text
              style={[
                styles.paymentButtonText,
                paymentMethod === 'wallet' && styles.paymentButtonTextSelected,
              ]}
            >
              MY WALLET
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentButton,
              paymentMethod === 'cash' && styles.paymentButtonSelected,
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <Text
              style={[
                styles.paymentButtonText,
                paymentMethod === 'cash' && styles.paymentButtonTextSelected,
              ]}
            >
              CASH
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms and Conditions */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setTermsAgreed(!termsAgreed)}
        >
          <View
            style={[
              styles.checkbox,
              termsAgreed && styles.checkboxChecked,
            ]}
          >
            {termsAgreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.termsTextContainer}>
            <Text style={styles.termsText}>
              I agree to the Bus Operator's{' '}
            </Text>
            <TouchableOpacity
              onPress={() => {
                // Navigate to terms and conditions
                Alert.alert('Terms and Conditions', 'Terms and conditions content here...');
              }}
            >
              <Text style={styles.termsLink}>Terms and Conditions</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Processing...' : 'CONFIRM'}
          </Text>
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
    color: Colors.passenger.primary,
    fontSize: 12,
    fontFamily: FONTS.Rubik.bold,
    backgroundColor: Colors.passenger.ultraLight,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    letterSpacing: 1,
    overflow: 'hidden',
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
    padding: 20,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
    backgroundColor: Colors.rapidTransit.slate50,
    paddingVertical: 12,
    borderRadius: 14,
  },
  routeText: {
    fontSize: 13,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.rapidTransit.slate800,
    flex: 1,
    textAlign: 'left',
    lineHeight: 18,
    maxWidth: '44%',
    paddingHorizontal: 8,
  },
  destinationText: {
    textAlign: 'right',
  },
  arrowIcon: {
    fontSize: 16,
    color: Colors.passenger.primary,
    marginHorizontal: 4,
    paddingTop: 1,
  },
  operatorText: {
    fontSize: 14,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.passenger.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  dateTimeColumn: {
    flex: 1,
    backgroundColor: Colors.rapidTransit.slate50,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  dateTimeValue: {
    fontSize: 14,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.rapidTransit.slate800,
    marginBottom: 4,
  },
  dateTimeLabel: {
    fontSize: 10,
    color: Colors.rapidTransit.slate400,
    fontFamily: FONTS.Rubik.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1.5,
    backgroundColor: RT.slate100,
    marginVertical: 14,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.rapidTransit.slate800,
    textAlign: 'center',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLeft: {
    flex: 1,
    marginRight: 12,
  },
  summaryMainText: {
    fontSize: 13,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.rapidTransit.slate800,
    marginBottom: 4,
  },
  summarySubText: {
    fontSize: 11,
    color: Colors.rapidTransit.slate400,
    fontFamily: FONTS.Rubik.regular,
    marginBottom: 2,
    lineHeight: 16,
    flexWrap: 'wrap',
  },
  summaryPrice: {
    fontSize: 16,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.rapidTransit.slate800,
    minWidth: 80,
    textAlign: 'right',
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.rapidTransit.slate600,
    fontFamily: FONTS.Rubik.medium,
  },
  summaryValue: {
    fontSize: 13,
    color: Colors.rapidTransit.slate600,
    fontFamily: FONTS.Rubik.medium,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.passenger.primary,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.passenger.primary,
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    backgroundColor: RT.white,
    borderWidth: 1.5,
    borderColor: RT.slate200,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentButtonSelected: {
    borderColor: Colors.passenger.primary,
    borderWidth: 2.5,
    backgroundColor: Colors.passenger.ultraLight,
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentButtonText: {
    fontSize: 13,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.passenger.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentButtonTextSelected: {
    color: Colors.passenger.primary,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: RT.white,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2.5,
    borderColor: RT.slate200,
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.passenger.primary,
    borderColor: Colors.passenger.primary,
  },
  checkmark: {
    color: RT.white,
    fontSize: 14,
    fontFamily: FONTS.Rubik.bold,
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  termsText: {
    fontSize: 12,
    color: Colors.rapidTransit.slate600,
    fontFamily: FONTS.Rubik.regular,
    lineHeight: 18,
  },
  termsLink: {
    fontSize: 12,
    color: Colors.passenger.primary,
    fontFamily: FONTS.Rubik.semiBold,
    textDecorationLine: 'underline',
  },
  confirmButton: {
    backgroundColor: Colors.passenger.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.passenger.tertiary,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: RT.white,
    fontSize: 15,
    fontFamily: FONTS.Rubik.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

