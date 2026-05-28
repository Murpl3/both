import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  loadAllActiveTransactions, 
  updateTransactionStatus,
  loadShiftTickets,
  saveAcceptedTicket,
  getCurrentShiftInfo,
  getConductorVehicleNo,
} from '../../utils/conductorUtils';
import { getConductorByUsername } from '../../data/conductors';
import Screen from '../../components/ui/Screen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_VISIBLE_CARDS = 5;

const PassengerListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [passengers, setPassengers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shiftDate, setShiftDate] = useState('');
  const [vehicleNo, setVehicleNo] = useState(null);
  const [conductorName, setConductorName] = useState('');
  const [stats, setStats] = useState({ pending: 0, paid: 0, rejected: 0 });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadPassengers();
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPassengers();
    }, [])
  );

  const loadPassengers = async () => {
    try {
      // Get shift info
      const shiftInfo = getCurrentShiftInfo();
      setShiftDate(shiftInfo.shiftDate);

      // Get conductor's assigned vehicle
      const conductorDataJson = await AsyncStorage.getItem('conductor_data');
      if (conductorDataJson) {
        const conductorData = JSON.parse(conductorDataJson);
        setConductorName(conductorData.full_name || conductorData.username || '');
        
        // Get vehicle number from pre-defined list or stored data
        const predefined = getConductorByUsername(conductorData.username);
        const vNo = predefined?.vehicle_no || conductorData.vehicle_no;
        setVehicleNo(vNo);
        console.log(`🚌 Conductor: ${conductorData.full_name} → Vehicle #${vNo}`);
      }

      // Load tickets from current shift (filtered by vehicle)
      const shiftResult = await loadShiftTickets();
      const shiftTickets = shiftResult.success ? shiftResult.tickets : [];

      // Load active transactions (pending tickets from passengers).
      // Lapsed logic is applied inside loadAllActiveTransactions: tickets whose scheduled
      // departure time has passed (+ 5 min grace) are auto-expired and excluded from this list.
      const activeResult = await loadAllActiveTransactions();
      const activeTransactions = activeResult.success ? activeResult.transactions : [];

      // Combine both sources
      const combinedList = [];
      
      // Add pending tickets from active transactions
      activeTransactions.forEach(t => {
        if (t.status === 'ACTIVE') {
          combinedList.push({
            id: t.id || t.refNo,
            refNo: t.refNo,
            name: t.passengerDetails 
              ? `${t.passengerDetails.firstName?.toUpperCase() || ''} ${t.passengerDetails.lastName?.toUpperCase() || ''}`.trim()
              : 'PASSENGER',
            from: t.origin,
            to: t.destination,
            status: 'PENDING',
            paymentMode: t.type || 'CASH',
            amount: t.amount,
            schedule: t.schedule,
            passengers: t.passengers || 1,
            userPhone: t.userPhone,
            source: 'transaction',
            createdAt: t.createdAt || t.date, // For sorting
          });
        }
      });

      // Add accepted/rejected tickets from shift
      shiftTickets.forEach(ticket => {
        combinedList.push({
          id: ticket.ticketId || `shift-${Date.now()}-${Math.random()}`,
          refNo: ticket.ticketId,
          name: ticket.passengerName || 'PASSENGER',
          from: ticket.origin,
          to: ticket.destination,
          status: ticket.status === 'REJECTED' ? 'REJECTED' : 'PAID',
          paymentMode: ticket.paymentMode || 'CASH',
          paymentStatus: ticket.paymentStatus,
          amount: ticket.totalFare,
          schedule: ticket.boardingTime,
          passengers: ticket.passengers || 1,
          fareType: ticket.fareType,
          acceptedAt: ticket.acceptedAt,
          passengerPhone: ticket.passengerPhone,
          source: 'shift',
        });
      });

      // Sort: Newest first (descending by timestamp)
      combinedList.sort((a, b) => {
        // Get timestamps for comparison (use acceptedAt for paid/rejected, createdAt for pending)
        const timeA = a.acceptedAt 
          ? new Date(a.acceptedAt).getTime() 
          : (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
        const timeB = b.acceptedAt 
          ? new Date(b.acceptedAt).getTime() 
          : (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
        // Descending order (newest first)
        return timeB - timeA;
      });

      setPassengers(combinedList);

      // Calculate stats
      const pending = combinedList.filter(p => p.status === 'PENDING').length;
      const paid = combinedList.filter(p => p.status === 'PAID').length;
      const rejected = combinedList.filter(p => p.status === 'REJECTED').length;
      setStats({ pending, paid, rejected });

      console.log(`✅ Loaded ${combinedList.length} passengers (${pending} pending, ${paid} paid, ${rejected} rejected)`);
    } catch (error) {
      console.error('Error loading passengers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setShowAll(false); // Reset to collapsed view to show newest entries at top
    loadPassengers();
  };

  const handleAcceptTicket = (passenger) => {
    Alert.alert(
      '✅ Accept Ticket',
      `Accept ticket for ${passenger.passengers} passenger(s)?\n\nRoute: ${passenger.from} → ${passenger.to}\nAmount: ₱${parseFloat(passenger.amount || 0).toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              // Conditional update: only one conductor can mark USED (prevents double-count)
              if (passenger.refNo) {
                const updateResult = await updateTransactionStatus(passenger.refNo, 'USED');
                if (updateResult.alreadyUsed) {
                  Alert.alert(
                    '⚠️ Ticket Already Used',
                    'This ticket was already accepted by another conductor.',
                    [{ text: 'OK' }]
                  );
                  loadPassengers();
                  return;
                }
              }

              const ticketData = {
                ticketId: passenger.refNo || `MANUAL-${Date.now()}`,
                origin: passenger.from,
                destination: passenger.to,
                passengers: passenger.passengers || 1,
                fareType: 'Regular',
                totalFare: passenger.amount,
                paymentMode: passenger.paymentMode || 'CASH',
                status: 'ACCEPTED',
              };
              // Save to shift with retry so Trip Summary stays accurate
              let saved = false;
              for (let attempt = 1; attempt <= 3 && !saved; attempt++) {
                const saveResult = await saveAcceptedTicket(ticketData);
                if (saveResult?.success) {
                  saved = true;
                  break;
                }
                if (attempt < 3) await new Promise(r => setTimeout(r, 300));
              }
              if (!saved) {
                Alert.alert(
                  '⚠️ Partially saved',
                  'Ticket was accepted but failed to add to your trip list. Pull to refresh or try again.',
                  [{ text: 'OK', onPress: () => loadPassengers() }]
                );
                return;
              }

              Alert.alert(
                '✅ Ticket Accepted',
                `💵 PAID WITH ${passenger.paymentMode || 'CASH'}\n\nPassenger added to your trip list!`,
                [{ text: 'OK' }]
              );
              loadPassengers();
            } catch (error) {
              console.error('Error accepting ticket:', error);
              Alert.alert('Error', 'Failed to accept ticket');
            }
          },
        },
      ]
    );
  };

  const handleRejectTicket = (passenger) => {
    Alert.alert(
      '❌ Reject Ticket',
      `Reject ticket for ${passenger.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              if (passenger.refNo) {
                await updateTransactionStatus(passenger.refNo, 'REJECTED');
              }

              // Save rejected to shift (with actual fare for accurate reporting)
              const ticketData = {
                ticketId: passenger.refNo || `REJECTED-${Date.now()}`,
                origin: passenger.from,
                destination: passenger.to,
                passengers: passenger.passengers || 1,
                totalFare: passenger.amount || '0.00', // Use actual fare for reporting
                paymentMode: passenger.paymentMode || 'CASH',
                status: 'REJECTED',
                fareType: passenger.fareType || 'Regular',
                passengerPhone: passenger.passengerPhone || null,
              };
              await saveAcceptedTicket(ticketData);

              Alert.alert('Rejected', 'Ticket has been rejected');
              loadPassengers(); // Reload list
            } catch (error) {
              console.error('Error rejecting ticket:', error);
              Alert.alert('Error', 'Failed to reject ticket');
            }
          },
        },
      ]
    );
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PAID':
        return styles.statusPaid;
      case 'REJECTED':
      return styles.statusRejected;
      default:
    return styles.statusPending;
    }
  };

  const getStatusText = (passenger) => {
    if (passenger.status === 'PAID') {
      return passenger.paymentMode === 'WALLET' ? '📱 PAID WALLET' : '💵 PAID CASH';
    }
    if (passenger.status === 'REJECTED') {
      return '❌ REJECTED';
    }
    return '⏳ PENDING';
  };

  const getCardStyle = (status) => {
    switch (status) {
      case 'PAID':
        return styles.passengerCardPaid;
      case 'REJECTED':
        return styles.passengerCardRejected;
      default:
        return styles.passengerCard;
    }
  };

  return (
    <Screen variant="conductor" padded={false} style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <LinearGradient
        colors={[Colors.conductor.primary, '#FFD700']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>PASSENGER LIST</Text>
        <Text style={styles.headerSubtitle}>
          {conductorName ? `${conductorName} • ` : ''}Vehicle #{vehicleNo || '-'} • {shiftDate}
        </Text>
      </LinearGradient>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statItem, styles.statItemHighlight]}>
          <Text style={[styles.statValue, styles.statValueHighlight]}>{stats.paid}</Text>
          <Text style={[styles.statLabel, styles.statLabelHighlight]}>Paid</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF5252' }]}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 30) + 85 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={[Colors.conductor.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading passengers...</Text>
          </View>
        ) : (
          <>
            {/* Show limited cards or all based on showAll state */}
            {(showAll ? passengers : passengers.slice(0, MAX_VISIBLE_CARDS)).map((passenger, index) => (
              <View key={`${passenger.id}-${index}`} style={getCardStyle(passenger.status)}>
                <View style={styles.passengerHeader}>
                  <View style={styles.passengerBadge}>
                    <Text style={styles.passengerBadgeText}>
                      {passenger.passengers || 1} {(passenger.passengers || 1) > 1 ? 'PAX' : 'PAX'}
                    </Text>
                  </View>
                  <View style={getStatusStyle(passenger.status)}>
                    <Text style={styles.statusText}>
                      {getStatusText(passenger)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.passengerInfo}>
                  <View style={styles.routeContainer}>
                    <Text style={styles.routeFrom}>{passenger.from || 'N/A'}</Text>
                    <Text style={styles.routeArrow}>→</Text>
                    <Text style={styles.routeTo}>{passenger.to || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailsRow}>
                    {passenger.schedule && (
                      <Text style={styles.scheduleText}>
                        🕐 {passenger.schedule}
                      </Text>
                    )}
                    {passenger.fareType && (
                      <Text style={styles.fareTypeText}>
                        🎫 {passenger.fareType}
                      </Text>
                    )}
                  </View>

                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Fare:</Text>
                    <Text style={styles.amountValue}>
                      ₱{parseFloat(passenger.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>


                {/* Show accepted time for paid tickets */}
                {passenger.status === 'PAID' && passenger.acceptedAt && (
                  <View style={styles.acceptedTimeRow}>
                    <Text style={styles.acceptedTimeText}>
                      ✅ Accepted at {new Date(passenger.acceptedAt).toLocaleTimeString()}
                    </Text>
                </View>
                )}
              </View>
            ))}
            
            {/* Show View More / View Less button if more than MAX_VISIBLE_CARDS */}
            {passengers.length > MAX_VISIBLE_CARDS && (
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={() => setShowAll(!showAll)}
              >
                <Text style={styles.viewMoreText}>
                  {showAll 
                    ? `Show Less` 
                    : `View More (${passengers.length - MAX_VISIBLE_CARDS} more)`}
                </Text>
                <Text style={styles.viewMoreArrow}>{showAll ? '↑' : '↓'}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {passengers.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../../assets/passengers.png')}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>No passengers yet</Text>
            <Text style={styles.emptySubtext}>
              Passengers will appear here when they book tickets{'\n'}or when you accept tickets from Ticketing
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 20,
    color: '#fff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statItemHighlight: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#eee',
  },
  statValue: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 20,
    color: '#333',
  },
  statValueHighlight: {
    color: '#4CAF50',
  },
  statLabel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  statLabelHighlight: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 14,
    color: '#999',
  },
  passengerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  passengerCardPaid: {
    backgroundColor: '#F1FFF1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2.5,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  passengerCardRejected: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF5252',
    opacity: 0.7,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerBadge: {
    backgroundColor: Colors.conductor.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  passengerBadgeText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 12,
    color: '#fff',
  },
  passengerInfo: {
    marginBottom: 12,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeFrom: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  routeArrow: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 16,
    color: Colors.conductor.primary,
    marginHorizontal: 8,
  },
  routeTo: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scheduleText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 12,
    color: '#666',
  },
  fareTypeText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 12,
    color: '#666',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
  },
  amountLabel: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 13,
    color: '#666',
  },
  amountValue: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 18,
    color: Colors.conductor.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptBtnText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 14,
    color: '#fff',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5252',
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rejectBtnText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 14,
    color: '#FF5252',
  },
  statusPaid: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusRejected: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPending: {
    backgroundColor: '#FFA000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.5,
  },
  acceptedTimeRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  acceptedTimeText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: '#4CAF50',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    tintColor: '#ddd',
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 22,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.conductor.border,
    borderStyle: 'dashed',
  },
  viewMoreText: {
    fontSize: 14,
    fontFamily: FONTS.Rubik.medium,
    color: Colors.conductor.primary,
  },
  viewMoreArrow: {
    fontSize: 18,
    color: Colors.conductor.primary,
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

export default PassengerListScreen;
