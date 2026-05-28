import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FONTS } from '../../fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Shadows, scaleFont, moderateScale } from '../../styles/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ConductorDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [conductorName, setConductorName] = useState('');
  const [conductorUsername, setConductorUsername] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [scannedTickets, setScannedTickets] = useState(0);
  const [acceptedToday, setAcceptedToday] = useState(0);
  const [rejectedToday, setRejectedToday] = useState(0);
  const [tripStatus, setTripStatus] = useState('BOARDING');

  useEffect(() => {
    loadConductorData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConductorData();
    }, [])
  );

  const loadConductorData = async () => {
    try {
      const conductorData = await AsyncStorage.getItem('conductor_data');
      if (conductorData) {
        const data = JSON.parse(conductorData);
        setConductorName(data.full_name || data.username || 'Conductor');
        setConductorUsername(data.username || '');
        setVehicleNo(data.vehicle_no ? String(data.vehicle_no) : '');
      }

      const ticketCount = await AsyncStorage.getItem('conductor_scanned_tickets');
      if (ticketCount) setScannedTickets(parseInt(ticketCount) || 0);

      const accepted = await AsyncStorage.getItem('conductor_accepted_today');
      if (accepted) setAcceptedToday(parseInt(accepted) || 0);

      const rejected = await AsyncStorage.getItem('conductor_rejected_today');
      if (rejected) setRejectedToday(parseInt(rejected) || 0);
    } catch (error) {
      console.error('Error loading conductor data:', error);
    }
  };

  const handleScanTicket = () => {
    navigation.navigate('QRScanner', { conductorMode: true });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('conductor_token');
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
    ]);
  };

  const expectedPassengers = 45;
  const boardedPercent = Math.min((acceptedToday / Math.max(expectedPassengers, 1)) * 100, 100);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Indigo Header */}
      <LinearGradient colors={Colors.dashboard.conductor.headerGradient} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.dutyLabel}>ON DUTY</Text>
            <Text style={styles.conductorName}>
              {conductorName} (C-{conductorUsername})
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Image source={require('../../assets/logout.png')} style={styles.logoutIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Active Trip Mini-Card */}
        <View style={styles.tripMiniCard}>
          <View style={styles.tripMiniRow}>
            <Text style={styles.tripBusNo}>Vehicle #{vehicleNo || '—'}</Text>
            <View style={[styles.statusBadge, tripStatus === 'BOARDING' ? styles.statusAmber : styles.statusGreen]}>
              <Text style={[styles.statusText, tripStatus === 'BOARDING' ? styles.statusAmberText : styles.statusGreenText]}>
                {tripStatus}
              </Text>
            </View>
          </View>
          <View style={styles.tripRouteRow}>
            <Image source={require('../../assets/placeholder red.png')} style={styles.tripRouteIcon} resizeMode="contain" />
            <Text style={styles.tripRouteText} numberOfLines={1}>Digos City → Bansalan</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 30) + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Boarding Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsTop}>
            <View>
              <Text style={styles.statsLabel}>BOARDED</Text>
              <View style={styles.statsCountRow}>
                <Text style={styles.statsCount}>{acceptedToday}</Text>
                <Text style={styles.statsTotal}>/ {expectedPassengers}</Text>
              </View>
            </View>
            <View style={styles.statsIconCircle}>
              <Image source={require('../../assets/passengers.png')} style={styles.statsIconImg} resizeMode="contain" />
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${boardedPercent}%` }]} />
          </View>

          <TouchableOpacity
            style={[styles.tripToggleBtn, tripStatus !== 'BOARDING' && styles.tripToggleBtnActive]}
            onPress={() => setTripStatus(prev => prev === 'BOARDING' ? 'IN_TRANSIT' : 'BOARDING')}
          >
            <Text style={[styles.tripToggleText, tripStatus !== 'BOARDING' && styles.tripToggleTextActive]}>
              {tripStatus === 'BOARDING' ? 'Close Doors & Start Trip' : 'Trip in Progress (Tap to Re-open)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Primary Scan Button */}
        <TouchableOpacity style={styles.scanCard} onPress={handleScanTicket} activeOpacity={0.9}>
          <View style={styles.scanCardInner}>
            <View style={styles.scanIconCircle}>
              <Image source={require('../../assets/qr-code.png')} style={styles.scanIconImg} resizeMode="contain" />
            </View>
            <View style={styles.scanTextArea}>
              <Text style={styles.scanTitle}>Scan Ticket</Text>
              <Text style={styles.scanSubtitle}>Verify passenger QR code</Text>
            </View>
          </View>
          <View style={styles.scanArrowCircle}>
            <Text style={styles.scanArrow}>📷</Text>
          </View>
        </TouchableOpacity>

        {/* Secondary Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => {
            const parent = navigation.getParent();
            if (parent) parent.navigate('Ticketing');
          }}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Image source={require('../../assets/ticket.png')} style={[styles.actionIconImg, { tintColor: '#16A34A' }]} resizeMode="contain" />
            </View>
            <Text style={styles.actionLabel}>Sell Ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Report', 'Report issue feature coming soon!')}>
            <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Image source={require('../../assets/helpdesk.png')} style={[styles.actionIconImg, { tintColor: '#D97706' }]} resizeMode="contain" />
            </View>
            <Text style={styles.actionLabel}>Report Issue</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{scannedTickets}</Text>
              <Text style={styles.summaryLabel}>Scanned</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#16A34A' }]}>{acceptedToday}</Text>
              <Text style={styles.summaryLabel}>Accepted</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#DC2626' }]}>{rejectedToday}</Text>
              <Text style={styles.summaryLabel}>Rejected</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dutyLabel: {
    fontSize: scaleFont(9),
    fontFamily: FONTS.Poppins.bold,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  conductorName: {
    fontSize: scaleFont(18),
    fontFamily: FONTS.Poppins.bold,
    color: '#FFFFFF',
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    width: 18,
    height: 18,
    tintColor: '#FFFFFF',
  },

  tripMiniCard: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tripMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripBusNo: {
    fontSize: scaleFont(14),
    fontFamily: FONTS.Rubik.bold,
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusAmber: { backgroundColor: '#F59E0B' },
  statusGreen: { backgroundColor: '#10B981' },
  statusText: {
    fontSize: scaleFont(9),
    fontFamily: FONTS.Rubik.bold,
    letterSpacing: 0.5,
  },
  statusAmberText: { color: '#78350F' },
  statusGreenText: { color: '#064E3B' },
  tripRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripRouteIcon: {
    width: 14,
    height: 14,
    tintColor: 'rgba(255,255,255,0.7)',
    marginRight: 6,
  },
  tripRouteText: {
    fontSize: scaleFont(13),
    fontFamily: FONTS.Rubik.medium,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: -8,
  },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    ...Shadows.medium,
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  statsLabel: {
    fontSize: scaleFont(10),
    fontFamily: FONTS.Rubik.bold,
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statsCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statsCount: {
    fontSize: scaleFont(36),
    fontFamily: FONTS.Poppins.bold,
    color: '#0F172A',
  },
  statsTotal: {
    fontSize: scaleFont(16),
    fontFamily: FONTS.Poppins.bold,
    color: '#94A3B8',
    marginLeft: 4,
  },
  statsIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsIconImg: {
    width: 24,
    height: 24,
    tintColor: Colors.dashboard.conductor.primary,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    backgroundColor: Colors.dashboard.conductor.primary,
    borderRadius: 5,
  },
  tripToggleBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tripToggleBtnActive: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tripToggleText: {
    fontSize: scaleFont(13),
    fontFamily: FONTS.Rubik.bold,
    color: '#475569',
  },
  tripToggleTextActive: {
    color: '#15803D',
  },

  scanCard: {
    backgroundColor: Colors.dashboard.conductor.primary,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    ...Shadows.medium,
    shadowColor: Colors.dashboard.conductor.primary,
  },
  scanCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scanIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  scanIconImg: {
    width: 28,
    height: 28,
    tintColor: '#FFFFFF',
  },
  scanTextArea: {},
  scanTitle: {
    fontSize: scaleFont(16),
    fontFamily: FONTS.Poppins.bold,
    color: '#FFFFFF',
  },
  scanSubtitle: {
    fontSize: scaleFont(11),
    fontFamily: FONTS.Rubik.medium,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  scanArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArrow: { fontSize: 18 },

  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    ...Shadows.small,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIconImg: {
    width: 24,
    height: 24,
  },
  actionLabel: {
    fontSize: scaleFont(13),
    fontFamily: FONTS.Rubik.bold,
    color: '#475569',
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    ...Shadows.small,
  },
  summaryTitle: {
    fontSize: scaleFont(14),
    fontFamily: FONTS.Poppins.bold,
    color: '#0F172A',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: scaleFont(26),
    fontFamily: FONTS.Poppins.bold,
    color: Colors.dashboard.conductor.primary,
  },
  summaryLabel: {
    fontSize: scaleFont(11),
    fontFamily: FONTS.Rubik.medium,
    color: '#94A3B8',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
  },
});

export default ConductorDashboardScreen;
