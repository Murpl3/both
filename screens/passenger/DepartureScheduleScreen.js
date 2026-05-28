import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FONTS } from '../../fonts';
import { apiRequest } from '../../utils/apiClient';
import { Colors, scaleFont } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';

const RT = Colors.rapidTransit;

// Destinations with landmarks and fares (matching TripScreen)
const DESTINATIONS = [
  { id: 0, landmark: 'Digos City Public Terminal', fare: 15.00 },
  { id: 1, landmark: 'V8 Gas Station', fare: 15.00 },
  { id: 2, landmark: 'Central Convenience (Rizal Ave.)', fare: 15.00 },
  { id: 3, landmark: 'Green Coffee/Land Bank', fare: 15.00 },
  { id: 4, landmark: 'Total Gas Station (Quezon Ave.)', fare: 15.00 },
  { id: 5, landmark: 'Flying V Gas Station', fare: 17.25 },
  { id: 6, landmark: 'Iglesia ni Cristo', fare: 19.50 },
  { id: 7, landmark: 'Tenessee Homes', fare: 21.50 },
  { id: 8, landmark: 'Greneth Store/"Kaangan"', fare: 23.75 },
  { id: 9, landmark: 'AJM Mango Buyer', fare: 26.00 },
  { id: 10, landmark: 'Colorado Elem. School', fare: 28.25 },
  { id: 11, landmark: 'Sinaragan Bridge', fare: 30.50 },
  { id: 12, landmark: 'GKK Birhen sa Fatima', fare: 32.50 },
  { id: 13, landmark: 'Crossing Cabligan', fare: 34.75 },
  { id: 14, landmark: 'South Adventist Philippine College', fare: 37.00 },
  { id: 15, landmark: "Epyong's Cambingan", fare: 39.25 },
  { id: 16, landmark: 'Matanao MPS Community Outpost', fare: 41.50 },
  { id: 17, landmark: 'DASURECO Facility', fare: 43.50 },
  { id: 18, landmark: 'Sacub Bridge', fare: 45.75 },
  { id: 19, landmark: 'Mabuhay Barangay Hall', fare: 48.00 },
  { id: 20, landmark: 'Rose Bakeshop', fare: 50.25 },
  { id: 21, landmark: 'Bansalan Terminal', fare: 52.50 },
  { id: 22, landmark: 'University of Mindanao Bansalan', fare: 54.50 },
  { id: 23, landmark: 'Bansalan-Magsaysay Hwy.', fare: 56.75 },
  { id: 24, landmark: 'Jona Store', fare: 59.00 },
  { id: 25, landmark: 'FCC Laundry Shop', fare: 61.25 },
  { id: 26, landmark: 'So-ok Basketball Court', fare: 63.50 },
  { id: 27, landmark: 'Magsaysay Medical Center', fare: 65.50 },
  { id: 28, landmark: 'Bansalan-Magsaysay', fare: 67.75 },
  { id: 29, landmark: 'AJ Gas Station', fare: 70.00 },
  { id: 30, landmark: 'Prk 4. Bob Barayong', fare: 72.25 },
  { id: 31, landmark: 'Bulatukan Steel Bridge', fare: 74.50 },
  { id: 32, landmark: 'kilolog Basketball Court', fare: 76.50 },
  { id: 33, landmark: 'Puro 4', fare: 78.75 },
  { id: 34, landmark: 'Iglesia ni Cristo Prk 1. Lower Bala', fare: 81.00 },
  { id: 35, landmark: 'Lower Bala', fare: 83.25 },
  { id: 36, landmark: 'Upper Bala', fare: 85.50 },
  { id: 37, landmark: 'GKK Sr. San Miguel Upper Bala', fare: 87.50 },
  { id: 38, landmark: 'Upper Bala Brgy. Hall', fare: 89.75 },
];

const toAmPm = (hhmm) => {
  try {
    const [hh, mm] = hhmm.split(':').map(Number);
    const date = new Date();
    date.setHours(hh, mm, 0, 0);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return hhmm;
  }
};

/** Morning before 12:00, afternoon 12:00–17:59, evening from 18:00 */
const timeBucket = (departureTime) => {
  if (!departureTime) return 'morning';
  const part = String(departureTime).trim().slice(0, 5);
  const [h, m] = part.split(':').map((x) => parseInt(x, 10));
  const mins = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  if (mins < 12 * 60) return 'morning';
  if (mins < 18 * 60) return 'afternoon';
  return 'evening';
};

const splitTimeDisplay = (timeStr) => {
  const parts = String(timeStr).trim().split(/\s+/);
  if (parts.length >= 2) {
    return { clock: parts[0], ampm: parts.slice(1).join(' ') };
  }
  return { clock: parts[0] || '--:--', ampm: '' };
};

export default function DepartureScheduleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { routeId, origin, destination, passengers, fare } = route.params || {};
  const [schedules, setSchedules] = useState([]);
  const [period, setPeriod] = useState('morning');

  const filteredSchedules = useMemo(
    () => schedules.filter((s) => timeBucket(s.departure_time) === period),
    [schedules, period]
  );

  useEffect(() => {
    const initializeSchedules = async () => {
      if (origin && destination) {
        const today = new Date();
        const serviceDate = today.toISOString().slice(0, 10);
        const route_id = routeId || 1;
        const rows = await apiRequest(`/schedules?route_id=${route_id}&service_date=${serviceDate}`, { method: 'GET' });
        const fareValue = fare ? parseFloat(fare) : 0;
        const mapped = (rows || []).map((r) => {
          const rawDeparture = String(r?.departure_time || '').trim().slice(0, 5);
          const capacity = Number.isFinite(r?.capacity) ? r.capacity : 30;
          const remaining_seats =
            Number.isFinite(r?.remaining_seats) ? r.remaining_seats : capacity;

          const timeLabel = toAmPm(rawDeparture);
          return {
            // Canonical backend DTO fields (kept consistent with Admin)
            id: r.id,
            route_id: r.route_id ?? route_id,
            departure_time: rawDeparture,
            capacity,
            remaining_seats,

            // UI-only derived fields
            operator: 'DASUTRANSCO',
            fare: fareValue.toFixed(2),
            origin,
            destination,
            remainingSeats: remaining_seats,
            totalSeats: capacity,
            time: timeLabel,
            seatDisplay: `${remaining_seats}/${capacity}`,
            routeId: route_id,
            serviceDate,
          };
        });
        setSchedules(mapped);
      }
    };
    
    initializeSchedules();
  }, [origin, destination, fare, routeId]);

  const handleBook = (schedule) => {
    console.log('Book schedule:', schedule);
    console.log('Passengers:', passengers);
    
    // Check if enough seats available
    if (schedule.remainingSeats < passengers) {
      Alert.alert(
        'Not Enough Seats',
        `Only ${schedule.remainingSeats} seats are available for this departure. You requested ${passengers} seats.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Navigate directly to passenger details screen
    // Seats will only be reserved when payment is confirmed in TicketSummaryScreen
    navigation.navigate('PassengerDetails', {
      schedule,
      origin,
      destination,
      passengers,
    });
  };

  if (!origin || !destination) {
    return (
      <Screen padded={false}>
        <AppHeader title="Schedule" subtitle="Select departure time" onBack={() => navigation.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No route selected. Please go back and select origin and destination.</Text>
        </View>
      </Screen>
    );
  }

  const segments = [
    { id: 'morning', label: 'Morning' },
    { id: 'afternoon', label: 'Afternoon' },
    { id: 'evening', label: 'Evening' },
  ];

  return (
    <Screen padded={false}>
      <AppHeader title="Bus Schedules" subtitle="Select departure time" onBack={() => navigation.goBack()} />

      <View style={styles.stepIndicatorContainer}>
        <Text style={styles.stepIndicator}>Step 2</Text>
      </View>

      {schedules.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      ) : (
        <>
          <View style={styles.segmentWrap}>
            {segments.map((seg) => {
              const active = period === seg.id;
              return (
                <TouchableOpacity
                  key={seg.id}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                  onPress={() => setPeriod(seg.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{seg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredSchedules.length === 0 ? (
              <View style={styles.emptyBucket}>
                <Text style={styles.emptyBucketText}>No trips in this part of the day.</Text>
                <Text style={styles.emptyBucketSub}>Try another tab.</Text>
              </View>
            ) : (
              filteredSchedules.map((schedule) => {
                const { clock, ampm } = splitTimeDisplay(schedule.time);
                const disabled = schedule.remainingSeats < passengers;
                const seatLabel =
                  schedule.remainingSeats <= 0
                    ? 'Full'
                    : `${schedule.remainingSeats} left`;

                return (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[styles.rowCard, disabled && styles.rowCardDisabled]}
                    onPress={() => handleBook(schedule)}
                    disabled={disabled}
                    activeOpacity={0.88}
                  >
                    <View style={styles.timeCol}>
                      <Text style={styles.timeClock}>{clock}</Text>
                      {ampm ? <Text style={styles.timeAmpm}>{ampm}</Text> : null}
                    </View>
                    <View style={styles.rowBody}>
                      <View style={styles.rowTop}>
                        <Text style={styles.routeName} numberOfLines={1}>
                          {schedule.operator}
                        </Text>
                        <Text style={styles.price}>₱{schedule.fare}</Text>
                      </View>
                      <View style={styles.rowBottom}>
                        <Text
                          style={[
                            styles.seatLabel,
                            schedule.remainingSeats <= 0 ? styles.seatFull : styles.seatOk,
                          ]}
                        >
                          {seatLabel}
                        </Text>
                        <View style={styles.chevronWrap}>
                          <Feather name="chevron-right" size={18} color={RT.primary} />
                        </View>
                      </View>
                      <Text style={styles.routeSub} numberOfLines={2}>
                        {schedule.origin} → {schedule.destination}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepIndicatorContainer: {
    backgroundColor: RT.bg,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stepIndicator: {
    color: RT.primary,
    fontSize: 11,
    fontFamily: FONTS.Poppins.bold,
    backgroundColor: RT.primarySoft,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    letterSpacing: 1,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 6,
    borderRadius: 18,
    backgroundColor: RT.slate100,
    borderWidth: 1,
    borderColor: RT.slate200,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: RT.white,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: scaleFont(10),
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate400,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  segmentTextActive: {
    color: RT.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: RT.bg,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: RT.slate50,
    borderRadius: 40,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: RT.slate100,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  rowCardDisabled: {
    opacity: 0.55,
  },
  timeCol: {
    width: 78,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: RT.slate200,
  },
  timeClock: {
    fontSize: scaleFont(22),
    fontFamily: FONTS.Poppins.black,
    color: RT.slate900,
  },
  timeAmpm: {
    marginTop: 4,
    fontSize: scaleFont(10),
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate400,
    textTransform: 'uppercase',
  },
  rowBody: {
    flex: 1,
    paddingLeft: 14,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeName: {
    flex: 1,
    fontSize: scaleFont(14),
    fontFamily: FONTS.Rubik.bold,
    color: RT.slate800,
    marginRight: 8,
  },
  price: {
    fontSize: scaleFont(15),
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate900,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  seatLabel: {
    fontSize: scaleFont(10),
    fontFamily: FONTS.Poppins.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seatOk: {
    color: RT.emerald600,
  },
  seatFull: {
    color: RT.red500,
  },
  chevronWrap: {
    backgroundColor: RT.white,
    padding: 6,
    borderRadius: 8,
  },
  routeSub: {
    fontSize: scaleFont(11),
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
    lineHeight: 16,
  },
  emptyBucket: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyBucketText: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: scaleFont(15),
    color: RT.slate600,
  },
  emptyBucketSub: {
    marginTop: 6,
    fontFamily: FONTS.Rubik.regular,
    fontSize: scaleFont(13),
    color: RT.slate400,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RT.bg,
  },
  loadingText: {
    fontSize: 15,
    color: RT.slate400,
    fontFamily: FONTS.Rubik.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: RT.white,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 18,
  },
  errorText: {
    fontSize: 14,
    color: RT.slate600,
    fontFamily: FONTS.Rubik.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
});
