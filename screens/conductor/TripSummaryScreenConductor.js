import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getShiftSummary,
  getCurrentShiftInfo,
  endShiftAndStartNew,
  generateShiftReportHTML,
} from '../../utils/conductorUtils';
import { getConductorByUsername } from '../../data/conductors';
import Screen from '../../components/ui/Screen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TripSummaryScreenConductor = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  // Conductor info
  const [conductorName, setConductorName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverNo, setDriverNo] = useState('');
  
  // Shift info
  const [shiftDate, setShiftDate] = useState('');
  const [dutyHours, setDutyHours] = useState('5:00 AM - 6:00 PM');
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  
  // Statistics
  const [totalPassengers, setTotalPassengers] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [cashCollections, setCashCollections] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [rejectedTickets, setRejectedTickets] = useState(0);
  const [regularPassengers, setRegularPassengers] = useState(0);
  const [studentPassengers, setStudentPassengers] = useState(0);
  const [pwdPassengers, setPwdPassengers] = useState(0);
  
  // Recent tickets for display
  const [recentTickets, setRecentTickets] = useState([]);

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAllData();
    }, [])
  );

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load conductor data
      const conductorData = await AsyncStorage.getItem('conductor_data');
      let conductorUsername = '';
      if (conductorData) {
        const data = JSON.parse(conductorData);
        setConductorName(data.full_name || data.username || 'Conductor');
        conductorUsername = data.username || '';
      }

      // Load trip/vehicle info
      let loadedVehicleNo = '';
      let loadedDriverNo = '';
      const tripData = await AsyncStorage.getItem('current_trip_data');
      if (tripData) {
        const trip = JSON.parse(tripData);
        loadedVehicleNo = trip.vehicleNo || '';
        loadedDriverNo = trip.driverNo || '';
      }

      // If driver/vehicle numbers are not set, get them from conductor's assigned data
      if (conductorUsername) {
        const predefined = getConductorByUsername(conductorUsername);
        if (predefined) {
          // Use assigned vehicle if not in trip data
          if (!loadedVehicleNo && predefined.vehicle_no) {
            loadedVehicleNo = predefined.vehicle_no.toString();
            console.log(`🚌 Auto-loaded Vehicle #${predefined.vehicle_no} for Conductor ${conductorUsername}`);
          }
          // Use assigned driver if not in trip data
          if (!loadedDriverNo && predefined.driver_no) {
            loadedDriverNo = predefined.driver_no.toString();
            console.log(`🚗 Auto-loaded Driver #${predefined.driver_no} for Conductor ${conductorUsername}`);
          }
        }
      }

      // Set the state with the final values
      setVehicleNo(loadedVehicleNo);
      setDriverNo(loadedDriverNo);

      // Load shift info
      const shiftInfo = getCurrentShiftInfo();
      setShiftDate(shiftInfo.shiftDate);
      setDutyHours(shiftInfo.dutyHours);
      setIsOnDuty(shiftInfo.isOnDuty);

      // Load shift summary
      const summary = await getShiftSummary();
      setTotalPassengers(summary.totalPassengers);
      setTotalTickets(summary.totalTickets);
      setCashCollections(summary.cashCollections);
      setWalletTransactions(summary.walletTransactions);
      setTotalRevenue(summary.totalRevenue);
      setRejectedTickets(summary.rejectedTickets);
      setRegularPassengers(summary.regularPassengers);
      setStudentPassengers(summary.studentPassengers);
      setPwdPassengers(summary.pwdPassengers);
      
      // Get recent tickets (last 5)
      const recent = (summary.tickets || [])
        .filter(t => t.status !== 'REJECTED')
        .slice(-5)
        .reverse();
      setRecentTickets(recent);

      console.log(`📊 Loaded shift summary: ${summary.totalPassengers} passengers, ₱${summary.totalRevenue} revenue`);
    } catch (error) {
      console.error('Error loading trip summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsPDF = async () => {
    setPdfLoading(true);
    try {
      // Generate PDF HTML content (use current state so values are never stale)
      const name = conductorName || 'Conductor';
      const vNo = vehicleNo || '';
      const dNo = driverNo || '';
      const htmlContent = await generateShiftReportHTML(name, vNo, dNo);
      
      if (!htmlContent || typeof htmlContent !== 'string') {
        throw new Error('Report content could not be generated.');
      }
      
      // Create PDF (options compatible with iOS/Android)
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612,
        height: 792,
      });

      // Create formatted filename: ConductorName_Date_Time.pdf
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).replace(/\//g, '-'); // e.g., 01-20-2026
      
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace(/:/g, '-'); // e.g., 14-30
      
      // Clean conductor name (remove special characters for filename)
      const cleanName = (conductorName || 'Conductor')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim();
      
      // Format: ConductorName_01-20-2026_14-30.pdf
      const fileName = `${cleanName}_${dateStr}_${timeStr}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Move/rename the file to the new filename
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });
      
      console.log(`📄 PDF saved as: ${fileName}`);

      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save Trip Report - ${fileName}`,
          UTI: 'com.adobe.pdf',
        });
        
        Alert.alert(
          '✅ PDF Generated!',
          `Report saved as:\n${fileName}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          '📄 PDF Generated',
          `Report saved as:\n${fileName}\n\nLocation: ${newUri}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      const message = error?.message || String(error);
      console.error('Error generating PDF:', error);
      Alert.alert(
        'Error',
        `Failed to generate PDF. ${message || 'Please try again.'}`
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const handleStartNewTrip = () => {
    Alert.alert(
      '🆕 Start New Trip',
      'This will:\n• Clear all today\'s data\n• Reset for tomorrow\'s trip\n\n💡 Tip: Save PDF first using the button above!\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Fresh',
          style: 'destructive',
          onPress: confirmStartNewTrip,
        },
      ]
    );
  };

  const confirmStartNewTrip = async () => {
    try {
      const result = await endShiftAndStartNew();
      
      if (result.success) {
        // Reset all state
        setTotalPassengers(0);
        setTotalTickets(0);
        setCashCollections(0);
        setWalletTransactions(0);
        setTotalRevenue(0);
        setRejectedTickets(0);
        setRegularPassengers(0);
        setStudentPassengers(0);
        setPwdPassengers(0);
        setRecentTickets([]);
        
        Alert.alert(
          '✅ New Trip Started!',
          'All data has been cleared.\nYou\'re ready for tomorrow\'s passengers!',
          [
            {
              text: 'Let\'s Go!',
              onPress: () => navigation.navigate('PassengerList'),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to start new trip. Please try again.');
      }
    } catch (error) {
      console.error('Error starting new trip:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return `₱${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Screen variant="conductor" padded={false} style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.conductor.primary} />
        <Text style={styles.loadingText}>Loading trip data...</Text>
      </Screen>
    );
  }

  return (
    <Screen variant="conductor" padded={false} style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header with Gradient */}
      <LinearGradient
        colors={[Colors.conductor.primary, '#FFD700']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>TRIP SUMMARY</Text>
        <Text style={styles.headerSubtitle}>Daily Fare Collection Report</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 30) + 85 }}
      >
        {/* Duty Status Card */}
        <View style={styles.dutyStatusCard}>
          <View style={styles.dutyStatusRow}>
            <View>
              <Text style={styles.dutyLabel}>DUTY HOURS</Text>
              <Text style={styles.dutyHours}>{dutyHours}</Text>
            </View>
            <View style={styles.dutyStatusBadge}>
              <View style={[styles.statusDot, { backgroundColor: isOnDuty ? '#4CAF50' : '#FF5252' }]} />
              <Text style={[styles.statusText, { color: isOnDuty ? '#4CAF50' : '#FF5252' }]}>
                {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
              </Text>
            </View>
          </View>
          <View style={styles.dateTimeRow}>
            <Text style={styles.dateText}>📅 {shiftDate}</Text>
            <Text style={styles.timeText}>🕐 {currentTime}</Text>
          </View>
        </View>

        {/* Total Revenue Card - Highlighted */}
        <LinearGradient
          colors={[Colors.conductor.primary, '#FFD700']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalRevenueCard}
        >
          <Text style={styles.totalRevenueLabel}>TOTAL FARE COLLECTED</Text>
          <Text style={styles.totalRevenueAmount}>{formatCurrency(totalRevenue)}</Text>
          <View style={styles.revenueBreakdownRow}>
            <View style={styles.revenueItem}>
              <Text style={styles.revenueItemLabel}>💵 Cash</Text>
              <Text style={styles.revenueItemValue}>{formatCurrency(cashCollections)}</Text>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueItem}>
              <Text style={styles.revenueItemLabel}>📱 Wallet</Text>
              <Text style={styles.revenueItemValue}>{formatCurrency(walletTransactions)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Trip Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚌 TRIP INFORMATION</Text>
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Route</Text>
            <Text style={styles.infoValue}>DIGOS CITY ↔ UPPER BALA</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Operator</Text>
            <Text style={styles.infoValue}>DASUTRANSCO</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle No.</Text>
            <Text style={styles.infoValue}>{vehicleNo ? `Vehicle #${vehicleNo}` : 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Driver No.</Text>
            <Text style={styles.infoValue}>{driverNo ? `Driver #${driverNo}` : 'Not set'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Conductor</Text>
            <Text style={styles.infoValue}>{conductorName || 'Not set'}</Text>
          </View>
        </View>

        {/* Passenger Statistics Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 PASSENGER STATISTICS</Text>
          <View style={styles.divider} />
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalPassengers}</Text>
              <Text style={styles.statLabel}>Total Passengers</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalTickets}</Text>
              <Text style={styles.statLabel}>Tickets Processed</Text>
            </View>
            <View style={[styles.statBox, styles.rejectedBox]}>
              <Text style={[styles.statValue, styles.rejectedValue]}>{rejectedTickets}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.subTitle}>Fare Type Breakdown</Text>
          
          <View style={styles.fareBreakdown}>
            <View style={styles.fareTypeRow}>
              <Text style={styles.fareTypeLabel}>🎫 Regular</Text>
              <Text style={styles.fareTypeValue}>{regularPassengers} pax</Text>
            </View>
            <View style={styles.fareTypeRow}>
              <Text style={styles.fareTypeLabel}>🎓 Student</Text>
              <Text style={styles.fareTypeValue}>{studentPassengers} pax</Text>
            </View>
            <View style={styles.fareTypeRow}>
              <Text style={styles.fareTypeLabel}>♿ PWD/Senior</Text>
              <Text style={styles.fareTypeValue}>{pwdPassengers} pax</Text>
            </View>
          </View>
        </View>

        {/* Recent Tickets */}
        {recentTickets.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 RECENT TICKETS</Text>
            <View style={styles.divider} />
            
            {recentTickets.map((ticket, index) => (
              <View key={index} style={styles.ticketItem}>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketRoute}>{ticket.origin} → {ticket.destination}</Text>
                  <Text style={styles.ticketDetails}>
                    {ticket.passengers} pax • {ticket.fareType} • {new Date(ticket.acceptedAt).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.ticketPayment}>
                  <Text style={styles.ticketAmount}>{formatCurrency(ticket.totalFare)}</Text>
                  <Text style={[
                    styles.paymentBadge,
                    { color: ticket.paymentMode === 'CASH' ? '#4CAF50' : '#2196F3' }
                  ]}>
                    {ticket.paymentMode === 'CASH' ? '💵 CASH' : '📱 WALLET'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.pdfButton}
          onPress={handleSaveAsPDF}
          disabled={pdfLoading}
        >
          <LinearGradient
            colors={[Colors.conductor.primary, '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {pdfLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>📄</Text>
                <Text style={styles.pdfButtonText}>SAVE AS PDF</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.newTripButton}
          onPress={handleStartNewTrip}
        >
          <Text style={styles.buttonIcon}>🆕</Text>
          <Text style={styles.newTripButtonText}>START NEW TRIP</Text>
        </TouchableOpacity>

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            💡 Tip: Save PDF before starting a new trip to keep records
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: 14,
    color: '#8A8A9A',
    marginTop: 12,
  },
  header: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 18,
    color: '#fff',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dutyStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  dutyStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dutyLabel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: '#999',
    letterSpacing: 0.5,
  },
  dutyHours: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  dutyStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 13,
    color: '#666',
  },
  timeText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 13,
    color: '#666',
  },
  totalRevenueCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalRevenueLabel: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  totalRevenueAmount: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 42,
    color: '#fff',
    marginBottom: 16,
  },
  revenueBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  revenueItem: {
    alignItems: 'center',
    flex: 1,
  },
  revenueItemLabel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  revenueItemValue: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 16,
    color: '#fff',
  },
  revenueDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  cardTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 13,
    color: '#2D2D2D',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F3F5',
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 13,
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginHorizontal: 4,
  },
  rejectedBox: {
    backgroundColor: '#FFF3F3',
  },
  statValue: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 24,
    color: Colors.conductor.primary,
    marginBottom: 4,
  },
  rejectedValue: {
    color: '#FF5252',
  },
  statLabel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  subTitle: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  fareBreakdown: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
  },
  fareTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fareTypeLabel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 13,
    color: '#333',
  },
  fareTypeValue: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 13,
    color: Colors.conductor.primary,
  },
  ticketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketRoute: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
  },
  ticketDetails: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: '#999',
  },
  ticketPayment: {
    alignItems: 'flex-end',
  },
  ticketAmount: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  paymentBadge: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 10,
  },
  pdfButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  pdfButtonText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.5,
  },
  newTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.conductor.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  newTripButtonText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 15,
    color: Colors.conductor.primary,
    letterSpacing: 0.5,
  },
  footerNote: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
  },
  footerText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 12,
    color: '#F57C00',
    textAlign: 'center',
  },
});

export default TripSummaryScreenConductor;
