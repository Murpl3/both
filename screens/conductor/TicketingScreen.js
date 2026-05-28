import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  Animated,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateFare, isValidRoute } from '../../data/routes';
import { saveAcceptedTicket, updateTransactionStatus, getConductorVehicleNo } from '../../utils/conductorUtils';
import { Colors } from '../../styles/designSystem';
import { getConductorByUsername } from '../../data/conductors';
import { apiRequest, getConductorToken } from '../../utils/apiClient';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Discount rates for fare computation
const PWD_DISCOUNT = 0.20; // 20% discount
const STUDENT_DISCOUNT = 0.20; // 20% discount

const TicketingScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverNo, setDriverNo] = useState('');
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  
  // Vehicle and Driver number options (1-10)
  const numberOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const [conductorNo, setConductorNo] = useState('');
  const [conductorName, setConductorName] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [boardingTime, setBoardingTime] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [numPassengers, setNumPassengers] = useState('1');
  const [totalFare, setTotalFare] = useState('0.00');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [fullyCollected, setFullyCollected] = useState(true);
  const [scannedTicket, setScannedTicket] = useState(null);
  const [regularCount, setRegularCount] = useState(1);
  const [studentCount, setStudentCount] = useState(0);
  const [pwdCount, setPwdCount] = useState(0);
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [showPassengerTypePicker, setShowPassengerTypePicker] = useState(false);
  const [selectedPassengerType, setSelectedPassengerType] = useState('Regular');
  const [scannedPassenger, setScannedPassenger] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Passenger type options for dropdown
  const passengerTypeOptions = [
    { label: 'Regular', value: 'Regular', discount: 0 },
    { label: 'Student/PWD/Senior', value: 'Discounted', discount: 0.20 },
  ];

  // Complete landmarks from Digos to Bansalan (39 stops)
  const destinations = [
    'Digos City Public Terminal',
    'V8 Gas Station',
    'Central Convenience (Rizal Ave.)',
    'Green Coffee/Land Bank',
    'Total Gas Station (Quezon Ave.)',
    'Flying V Gas Station',
    'Iglesia ni Cristo',
    'Tenessee Homes',
    'Greneth Store/"Kaangan"',
    'AJM Mango Buyer',
    'Colorado Elem. School',
    'Sinaragan Bridge',
    'GKK Birhen sa Fatima',
    'Crossing Cabligan',
    'South Adventist Philippine College',
    'Epyong\'s Cambingan',
    'Matanao MPS Community Outpost',
    'DASURECO Facility',
    'Sacub Bridge',
    'Mabuhay Barangay Hall',
    'Rose Bakeshop',
    'Bansalan Terminal',
    'University of Mindanao Bansalan',
    'Bansalan-Magsaysay Hwy.',
    'Jona Store',
    'FCC Laundry Shop',
    'So-ok Basketball Court',
    'Magsaysay Medical Center',
    'Bansalan-Magsaysay',
    'AJ Gas Station',
    'Prk 4. Bob Barayong',
    'Bulatukan Steel Bridge',
    'kilolog Basketball Court',
    'Puro 4',
    'Iglesia ni Cristo Prk 1. Lower Bala',
    'Lower Bala',
    'Upper Bala',
    'GKK Sr. San Miguel Upper Bala',
    'Upper Bala Brgy. Hall',
  ];

  // Auto-compute fare whenever passengers, origin, destination, or passenger type change
  useEffect(() => {
    computeFare();
  }, [regularCount, selectedPassengerType, fromLocation, toLocation]);
  
  // Auto-sync total passengers when individual counts change
  useEffect(() => {
    const total = regularCount + studentCount + pwdCount;
    setNumPassengers(String(total));
  }, [regularCount, studentCount, pwdCount]);

  useEffect(() => {
    loadConductorData();
    autoFillDateTime();
    
    // Check if ticket was scanned from QR
    if (route?.params?.scannedData) {
      loadScannedTicket(route.params.scannedData);
    }
    
    // Check if passenger was scanned from QR
    if (route?.params?.scannedPassenger) {
      handleScannedPassenger(route.params.scannedPassenger);
    }
  }, [route?.params?.scannedData, route?.params?.scannedPassenger]);

  // Reload conductor data when screen comes into focus
  // This ensures the conductor name updates if profile was saved
  useFocusEffect(
    useCallback(() => {
      loadConductorData();
    }, [])
  );

  // Real-time clock for boarding time - updates every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setBoardingTime(time);
    };

    // Update immediately
    updateClock();
    
    // Then update every second
    const clockInterval = setInterval(updateClock, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(clockInterval);
  }, []);

  // Compute fare based on passengers, route, and fare type
  const computeFare = () => {
    try {
      // Check if both locations are selected
      if (!fromLocation || !toLocation) {
        setTotalFare('0.00');
        return;
      }
      
      // Validate route
      if (!isValidRoute(fromLocation, toLocation)) {
        setTotalFare('0.00');
        return;
      }
      
      // Calculate base fare from route data (exact fares per landmark)
      const baseFare = calculateFare(fromLocation, toLocation);
      
      // Calculate fare based on selected passenger type
      const discount = selectedPassengerType === 'Discounted' ? 0.20 : 0;
      const farePerPassenger = baseFare * (1 - discount);
      const total = farePerPassenger * regularCount;
      
      setTotalFare(total.toFixed(2));
      
      console.log(`💰 Fare: ${regularCount} pax (${selectedPassengerType}) × ₱${farePerPassenger.toFixed(2)} = ₱${total.toFixed(2)}`);
    } catch (error) {
      console.error('Error computing fare:', error);
      setTotalFare('0.00');
    }
  };

  const autoFillDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    const time = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    setBookingDate(date);
    setBoardingTime(time);
  };

  const loadConductorData = async () => {
    try {
      const conductorDataJson = await AsyncStorage.getItem('conductor_data');
      if (conductorDataJson) {
        const data = JSON.parse(conductorDataJson);
        setConductorName(data.full_name || data.username || '');
        setConductorNo(data.username || '');
        
        // Get assigned vehicle and driver from pre-defined list
        const predefined = getConductorByUsername(data.username);
        if (predefined) {
          // Auto-fill assigned vehicle (read-only - conductor can't change it)
          setVehicleNo(predefined.vehicle_no.toString());
          // Auto-fill assigned driver (read-only - conductor can't change it)
          setDriverNo(predefined.driver_no.toString());
          console.log(`🚌 Auto-assigned Vehicle #${predefined.vehicle_no} & Driver #${predefined.driver_no} for Conductor ${data.username}`);
        } else if (data.vehicle_no) {
          setVehicleNo(data.vehicle_no.toString());
          if (data.driver_no) {
            setDriverNo(data.driver_no.toString());
          }
        }
      }
    } catch (error) {
      console.error('Error loading conductor data:', error);
    }
  };

  const loadScannedTicket = async (qrData) => {
    try {
      // Parse QR data - should contain transaction reference
      const ticketData = JSON.parse(qrData);
      setScannedTicket(ticketData);
      
      // Auto-fill form from scanned ticket
      setFromLocation(ticketData.origin || '');
      setToLocation(ticketData.destination || '');
      setNumPassengers(ticketData.passengers?.toString() || '1');
      setTotalFare(ticketData.amount?.toFixed(2) || '0.00');
      setPaymentMode(ticketData.type || 'CASH');
      
      console.log('✅ Ticket auto-filled from QR scan');
    } catch (error) {
      console.error('Error loading scanned ticket:', error);
      Alert.alert('Error', 'Failed to load ticket data from QR code');
    }
  };

  // Handle scanned passenger QR data
  const handleScannedPassenger = (passengerData) => {
    try {
      setScannedPassenger(passengerData);
      setPaymentMode('WALLET'); // Passenger QR typically means wallet payment
      
      console.log('✅ Passenger scanned:', passengerData.name || passengerData.phone);
      
      // Show confirmation that passenger was scanned
      Alert.alert(
        '✅ Passenger Scanned',
        `Name: ${passengerData.name || 'N/A'}\nPhone: ${passengerData.phone?.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, '$1 $2 *** $4') || 'N/A'}\n\nPlease select route and confirm fare.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error handling scanned passenger:', error);
    }
  };

  // Clear scanned passenger
  const clearScannedPassenger = () => {
    setScannedPassenger(null);
    setPaymentMode('CASH');
  };

  const handleScanQR = () => {
    navigation.navigate('QRScanner', { 
      conductorMode: true,
      returnScreen: 'Ticketing'
    });
  };

  const handleAccept = async () => {
    // Prevent double-tap
    if (isProcessing) return;
    
    // Validate required fields
    if (!vehicleNo) {
      Alert.alert('Incomplete', 'Please select a Vehicle No.');
      return;
    }
    if (!driverNo) {
      Alert.alert('Incomplete', 'Driver No. is required');
      return;
    }
    if (!fromLocation || !toLocation) {
      Alert.alert('Incomplete', 'Please select origin and destination');
      return;
    }
    
    if (regularCount < 1) {
      Alert.alert('Invalid', 'At least 1 passenger is required');
      return;
    }

    setIsProcessing(true);
    
    try {
      // If this acceptance came from a scanned ticket QR, mark it USED on the backend (atomic).
      if (scannedTicket?.payload && scannedTicket?.signature) {
        const token = await getConductorToken();
        if (!token) {
          Alert.alert('Not Logged In', 'Please login as conductor first.');
          setIsProcessing(false);
          return;
        }
        const accept = await apiRequest('/tickets/accept', {
          method: 'POST',
          token,
          body: { payload: scannedTicket.payload, signature: scannedTicket.signature },
        });
        if (accept?.alreadyUsed) {
          Alert.alert('⚠️ Ticket Already Used', 'This ticket was already accepted by another conductor.');
          setIsProcessing(false);
          return;
        }
      }

      // Save trip data
      await saveTripData();

      // Create ticket data for shift record
      const totalPax = regularCount;
      const ticketData = {
        ticketId: scannedTicket?.refNo || `TICKET-${Date.now()}`,
        origin: fromLocation,
        destination: toLocation,
        passengers: totalPax,
        regularCount: selectedPassengerType === 'Regular' ? regularCount : 0,
        studentCount: selectedPassengerType === 'Discounted' ? regularCount : 0,
        pwdCount: 0,
        fareType: selectedPassengerType === 'Regular' ? 'Regular' : 'Student/PWD/Senior',
        totalFare: totalFare,
        paymentMode: paymentMode,
        vehicleNo,
        driverNo,
        conductorNo,
        conductorName,
        bookingDate,
        boardingTime,
        status: 'ACCEPTED',
        // Include passenger info if scanned
        passengerPhone: scannedPassenger?.phone || null,
        passengerName: scannedPassenger?.name || null,
      };

      // Save to current shift for Trip Summary (retry so count is accurate)
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
        console.warn('saveAcceptedTicket failed after retries - Trip Summary may undercount');
      }

      // Increment accepted tickets count
      const acceptedCount = await AsyncStorage.getItem('conductor_accepted_today') || '0';
      await AsyncStorage.setItem('conductor_accepted_today', (parseInt(acceptedCount) + 1).toString());

      // Show success with payment status
      let successMessage = '';
      successMessage = paymentMode === 'CASH' ? '💵 PAID WITH CASH\n\n' : '📱 PAID WITH WALLET\n\n';
      
      // Build passenger breakdown string
      const paxType = selectedPassengerType === 'Regular' ? 'Regular' : 'Student/PWD/Senior';

      Alert.alert(
        '✅ Ticket Accepted',
        `${successMessage}📍 Route: ${fromLocation} → ${toLocation}\n👥 Passengers: ${totalPax} (${paxType})\n💰 Fare: ₱${totalFare}\n\nTicket has been added to Trip Summary!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form but keep conductor info
              setFromLocation('');
              setToLocation('');
              setRegularCount(1);
              setSelectedPassengerType('Regular');
              setTotalFare('0.00');
              setScannedTicket(null);
              setScannedPassenger(null);
              setPaymentMode('CASH');
              autoFillDateTime();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error accepting ticket:', error);
      Alert.alert('Error', 'Failed to accept ticket');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveTripData = async () => {
    try {
      const tripData = {
        vehicleNo,
        driverNo,
        conductorNo,
        conductorName,
        lastUpdate: new Date().toISOString(),
      };
      await AsyncStorage.setItem('current_trip_data', JSON.stringify(tripData));
    } catch (error) {
      console.error('Error saving trip data:', error);
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Ticket',
      'Are you sure you want to reject this ticket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              // Mark ticket rejected on backend (if scanned from server-signed QR)
              if (scannedTicket?.payload && scannedTicket?.signature) {
                const token = await getConductorToken();
                if (token) {
                  await apiRequest('/tickets/reject', {
                    method: 'POST',
                    token,
                    body: { payload: scannedTicket.payload, signature: scannedTicket.signature },
                  });
                }
              }

              // Save rejected ticket to shift record (with actual fare for reporting)
              const totalPax = regularCount;
              const rejectedTicket = {
                ticketId: scannedTicket?.refNo || `REJECTED-${Date.now()}`,
                origin: fromLocation || 'N/A',
                destination: toLocation || 'N/A',
                passengers: totalPax || 1,
                regularCount: selectedPassengerType === 'Regular' ? regularCount : 0,
                studentCount: selectedPassengerType === 'Discounted' ? regularCount : 0,
                pwdCount: 0,
                fareType: selectedPassengerType === 'Regular' ? 'Regular' : 'Student/PWD/Senior',
                totalFare: totalFare, // Save actual fare for reporting (not 0.00)
                paymentMode: paymentMode,
                status: 'REJECTED',
                // Include passenger info if available
                passengerPhone: scannedPassenger?.phone || null,
                passengerName: scannedPassenger?.name || null,
              };
              await saveAcceptedTicket(rejectedTicket);

              // Increment rejected tickets count
              const rejectedCount = await AsyncStorage.getItem('conductor_rejected_today') || '0';
              await AsyncStorage.setItem('conductor_rejected_today', (parseInt(rejectedCount) + 1).toString());

              // Clear form
              setFromLocation('');
              setToLocation('');
              setRegularCount(1);
              setSelectedPassengerType('Regular');
              setTotalFare('0.00');
              setScannedTicket(null);
              setScannedPassenger(null);
              setPaymentMode('CASH');
              autoFillDateTime();
              
              Alert.alert('❌ Rejected', 'Ticket has been rejected and recorded.');
            } catch (error) {
              console.error('Error rejecting ticket:', error);
              Alert.alert('Error', 'Failed to reject ticket');
            }
          },
        },
      ]
    );
  };

  return (
    <Screen variant="conductor" padded={false} style={styles.container}>
      <AppHeader title="Ticketing" subtitle="Sell/accept tickets" variant="conductor" />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 30) + 85 }}
      >
        {/* Vehicle & Driver Info */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle No. (Assigned)</Text>
              <View style={[styles.dropdownButton, styles.inputDisabledBg]}>
                <Text style={styles.dropdownText}>
                  {vehicleNo ? `Vehicle #${vehicleNo}` : 'Not assigned'}
                </Text>
                <Text style={styles.assignedBadge}>🔒</Text>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Driver No. (Assigned)</Text>
              <View style={[styles.dropdownButton, styles.inputDisabledBg]}>
                <Text style={styles.dropdownText}>
                  {driverNo ? `Driver #${driverNo}` : 'Not assigned'}
                </Text>
                <Text style={styles.assignedBadge}>🔒</Text>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Conductor No. (Auto)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={conductorNo}
                editable={false}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Conductor Name (Auto)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={conductorName}
                editable={false}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* QR Scanner Button */}
          <TouchableOpacity style={styles.qrButton} onPress={handleScanQR}>
            <Image
              source={require('../../assets/qr-code.png')}
              style={styles.qrIcon}
            />
          </TouchableOpacity>

          {/* Scanned Passenger Info */}
          {scannedPassenger && (
            <View style={styles.scannedPassengerCard}>
              <View style={styles.scannedPassengerHeader}>
                <Text style={styles.scannedPassengerTitle}>📱 SCANNED PASSENGER</Text>
                <TouchableOpacity onPress={clearScannedPassenger}>
                  <Text style={styles.clearButton}>✕ Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.scannedPassengerInfo}>
                <View style={styles.passengerAvatar}>
                  <Text style={styles.passengerInitial}>
                    {scannedPassenger.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.passengerDetails}>
                  <Text style={styles.passengerName}>
                    {scannedPassenger.name || 'Passenger'}
                  </Text>
                  <Text style={styles.passengerPhone}>
                    {scannedPassenger.phone?.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, '$1 $2 *** $4') || 'N/A'}
                  </Text>
                </View>
                <View style={styles.walletBadge}>
                  <Text style={styles.walletBadgeText}>WALLET</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Ticket Details */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TICKET DETAILS</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Booking Date (Auto)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={bookingDate}
                editable={false}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Boarding Time</Text>
              <View style={[styles.input, styles.inputDisabled, styles.clockContainer]}>
                <Text style={styles.clockText}>{boardingTime}</Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                </View>
              </View>
            </View>
          </View>

          {/* Passenger Type Dropdown */}
          <View style={styles.fullInputGroup}>
            <Text style={styles.label}>Type of Passenger *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowPassengerTypePicker(true)}
            >
              <Text style={styles.dropdownText}>
                {selectedPassengerType === 'Regular' ? '🎫 Regular (Full Fare)' : '🎓 Student/PWD/Senior (20% Discount)'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Number of Passengers */}
          <View style={styles.fullInputGroup}>
            <Text style={styles.label}>Number of Passengers *</Text>
            <View style={styles.passengerCounterRow}>
              <TouchableOpacity
                style={[styles.counterBtn, regularCount <= 1 && styles.counterBtnDisabled]}
                onPress={() => {
                  if (regularCount > 1) {
                    setRegularCount(regularCount - 1);
                  }
                }}
              >
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterValueLarge}>{regularCount}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setRegularCount(regularCount + 1)}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Origin Dropdown */}
          <View style={styles.fullInputGroup}>
            <Text style={styles.label}>From *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowOriginPicker(true)}
            >
              <Text style={[styles.dropdownText, !fromLocation && styles.placeholderText]}>
                {fromLocation || 'Select origin'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Destination Dropdown */}
          <View style={styles.fullInputGroup}>
            <Text style={styles.label}>To *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowDestinationPicker(true)}
            >
              <Text style={[styles.dropdownText, !toLocation && styles.placeholderText]}>
                {toLocation || 'Select destination'}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Total Passengers Display - Below Route */}
          <View style={styles.totalPassengersRow}>
            <Text style={styles.totalPassengersLabel}>TOTAL PASSENGERS:</Text>
            <Text style={styles.totalPassengersValue}>{regularCount}</Text>
          </View>

          {/* Origin Picker Modal */}
          <Modal
            visible={showOriginPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowOriginPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Origin</Text>
                  <TouchableOpacity onPress={() => setShowOriginPicker(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={destinations}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.pickerItem,
                        fromLocation === item && styles.pickerItemSelected
                      ]}
                      onPress={() => {
                        setFromLocation(item);
                        setShowOriginPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        fromLocation === item && styles.pickerItemTextSelected
                      ]}>
                        {item}
                      </Text>
                      {fromLocation === item && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
              />
            </View>
            </View>
          </Modal>

          {/* Destination Picker Modal */}
          <Modal
            visible={showDestinationPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDestinationPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Destination</Text>
                  <TouchableOpacity onPress={() => setShowDestinationPicker(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={destinations}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.pickerItem,
                        toLocation === item && styles.pickerItemSelected
                      ]}
                      onPress={() => {
                        setToLocation(item);
                        setShowDestinationPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        toLocation === item && styles.pickerItemTextSelected
                      ]}>
                        {item}
                      </Text>
                      {toLocation === item && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
              />
            </View>
          </View>
          </Modal>

          {/* Passenger Type Picker Modal */}
          <Modal
            visible={showPassengerTypePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowPassengerTypePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.smallModalContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Type of Passenger</Text>
                  <TouchableOpacity onPress={() => setShowPassengerTypePicker(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={passengerTypeOptions}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.pickerItem,
                        selectedPassengerType === item.value && styles.pickerItemSelected
                      ]}
                      onPress={() => {
                        setSelectedPassengerType(item.value);
                        // Update counts based on selection
                        if (item.value === 'Regular') {
                          setStudentCount(0);
                          setPwdCount(0);
                        } else {
                          // For discounted, set all passengers as PWD/Student
                          setStudentCount(regularCount);
                          setRegularCount(0);
                          setPwdCount(0);
                        }
                        setShowPassengerTypePicker(false);
                      }}
                    >
                      <View style={styles.passengerTypeItem}>
                        <Text style={[
                          styles.pickerItemText,
                          selectedPassengerType === item.value && styles.pickerItemTextSelected
                        ]}>
                          {item.value === 'Regular' ? '🎫 Regular' : '🎓 Student/PWD/Senior'}
                        </Text>
                        <Text style={[
                          styles.passengerTypeSubtext,
                          selectedPassengerType === item.value && styles.pickerItemTextSelected
                        ]}>
                          {item.discount === 0 ? 'Full fare' : '20% discount'}
                        </Text>
                      </View>
                      {selectedPassengerType === item.value && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Vehicle Number Picker Modal */}
          <Modal
            visible={showVehiclePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowVehiclePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.smallModalContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Vehicle No.</Text>
                  <TouchableOpacity onPress={() => setShowVehiclePicker(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={numberOptions}
                  keyExtractor={(item) => item}
                  numColumns={5}
                  columnWrapperStyle={styles.numberGridRow}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.numberPickerItem,
                        vehicleNo === item && styles.numberPickerItemSelected
                      ]}
                      onPress={() => {
                        setVehicleNo(item);
                        setShowVehiclePicker(false);
                        saveTripData();
                      }}
                    >
                      <Text style={[
                        styles.numberPickerText,
                        vehicleNo === item && styles.numberPickerTextSelected
                      ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
            />
          </View>
            </View>
          </Modal>


          {/* Payment Section */}
          <View style={styles.paymentSection}>
            <View style={styles.fareContainer}>
              <Text style={styles.fareLabel}>TOTAL FARE (AUTO-COMPUTED)</Text>
              <View style={styles.fareBreakdown}>
                <Text style={styles.fareBreakdownText}>
                  {fromLocation && toLocation ? `📍 ${fromLocation} → ${toLocation}` : '📍 Select route first'}
                </Text>
                <Text style={[styles.fareBreakdownText, selectedPassengerType === 'Discounted' && { color: '#4CAF50' }]}>
                  {selectedPassengerType === 'Regular' 
                    ? `🎫 ${regularCount} Regular (full fare)` 
                    : `🎓 ${regularCount} Student/PWD/Senior (-20%)`}
                </Text>
              </View>
              <Text style={styles.fareAmount}>₱ {totalFare}</Text>
            </View>
            <View style={styles.paymentInfo}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>MODE OF PAYMENT</Text>
                <View style={styles.paymentModeButtons}>
                  <TouchableOpacity
                    style={[styles.paymentModeBtn, paymentMode === 'CASH' && styles.paymentModeBtnActive]}
                    onPress={() => setPaymentMode('CASH')}
                  >
                    <Text style={[styles.paymentModeText, paymentMode === 'CASH' && styles.paymentModeTextActive]}>
                      CASH
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.paymentModeBtn, 
                      paymentMode === 'WALLET' && styles.paymentModeBtnActive,
                      !scannedPassenger && styles.paymentModeBtnDisabled
                    ]}
                    onPress={() => scannedPassenger && setPaymentMode('WALLET')}
                    disabled={!scannedPassenger}
                  >
                    <Text style={[
                      styles.paymentModeText, 
                      paymentMode === 'WALLET' && styles.paymentModeTextActive,
                      !scannedPassenger && styles.paymentModeTextDisabled
                    ]}>
                      WALLET {!scannedPassenger ? '🔒' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setFullyCollected(!fullyCollected)}
                >
                  {fullyCollected && <View style={styles.checkboxChecked} />}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>FULLY COLLECTED</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
              onPress={handleAccept}
              disabled={isProcessing}
            >
              <Text style={styles.acceptButtonText}>
                {isProcessing ? 'PROCESSING...' : 'ACCEPT'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
              onPress={handleReject}
              disabled={isProcessing}
            >
              <Text style={styles.rejectButtonText}>REJECT</Text>
            </TouchableOpacity>
          </View>
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
  header: {
    backgroundColor: Colors.conductor.primary,
    paddingVertical: SCREEN_HEIGHT * 0.022,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: Math.min(SCREEN_WIDTH * 0.042, 17),
    color: '#fff',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 14,
    color: '#333',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  fullInputGroup: {
    marginBottom: 12,
    position: 'relative',
  },
  label: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E8ECEF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.Rubik.regular,
    fontSize: 14,
    color: '#2D2D2D',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F8',
    color: '#4A4A5A',
  },
  inputDisabledBg: {
    backgroundColor: Colors.conductor.ultraLight,
    borderColor: Colors.conductor.light,
    borderWidth: 2,
  },
  assignedBadge: {
    fontSize: 14,
    marginLeft: 8,
  },
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clockText: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: Math.min(SCREEN_WIDTH * 0.037, 15),
    color: '#333',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  helpText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: Math.min(SCREEN_WIDTH * 0.028, 11),
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  passengerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passengerBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.conductor.primary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerBtnText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 24,
    color: '#fff',
  },
  passengerInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: SCREEN_HEIGHT * 0.015,
    paddingHorizontal: 10,
    fontFamily: FONTS.Rubik.bold,
    fontSize: 24,
    color: '#333',
    textAlign: 'center',
    minHeight: 48,
  },
  fareTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  fareTypeInfo: {
    flex: 1,
  },
  fareTypeLabel: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  fareTypePrice: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: '#666',
  },
  discountPrice: {
    color: '#4CAF50',
    fontFamily: FONTS.Rubik.semiBold,
  },
  fareTypeCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterBtn: {
    width: 36,
    height: 36,
    backgroundColor: Colors.conductor.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  counterBtnText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 20,
    color: '#fff',
  },
  counterValue: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 20,
    color: '#333',
    minWidth: 30,
    textAlign: 'center',
  },
  totalPassengersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.conductor.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  totalPassengersLabel: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 12,
    color: '#fff',
  },
  totalPassengersValue: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 22,
    color: '#fff',
  },
  passengerCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  counterValueLarge: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 32,
    color: '#333',
    minWidth: 50,
    textAlign: 'center',
  },
  passengerTypeItem: {
    flex: 1,
  },
  passengerTypeSubtext: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  destinationScroll: {
    marginBottom: 8,
  },
  destinationChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: SCREEN_HEIGHT * 0.01,
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    marginRight: 8,
  },
  destinationChipActive: {
    backgroundColor: Colors.conductor.primary,
    borderColor: Colors.conductor.primary,
  },
  destinationChipText: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: Math.min(SCREEN_WIDTH * 0.032, 13),
    color: '#666',
  },
  destinationChipTextActive: {
    color: '#fff',
  },
  locationIcon: {
    position: 'absolute',
    right: 12,
    top: 32,
  },
  locationDot: {
    fontSize: 18,
  },
  qrButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.conductor.primary,
    borderRadius: 8,
    padding: 10,
    marginTop: -8,
  },
  qrIcon: {
    width: 28,
    height: 28,
    tintColor: Colors.conductor.primary,
  },
  scannedPassengerCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  scannedPassengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scannedPassengerTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 12,
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  clearButton: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 12,
    color: '#D32F2F',
  },
  scannedPassengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerInitial: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 18,
    color: '#fff',
  },
  passengerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  passengerName: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 15,
    color: '#333',
  },
  passengerPhone: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  walletBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  walletBadgeText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.5,
  },
  paymentSection: {
    marginTop: 12,
    backgroundColor: Colors.conductor.ultraLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: Colors.conductor.border,
  },
  fareContainer: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ffe0b2',
    paddingBottom: 12,
  },
  fareLabel: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fareBreakdown: {
    marginVertical: 4,
  },
  fareBreakdownText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  fareAmount: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 26,
    color: Colors.conductor.primary,
  },
  paymentInfo: {
    marginTop: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 12,
    color: '#666',
  },
  paymentValue: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 12,
    color: '#333',
  },
  paymentModeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentModeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.conductor.primary,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  paymentModeBtnActive: {
    backgroundColor: Colors.conductor.primary,
  },
  paymentModeBtnDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#BDBDBD',
  },
  paymentModeText: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: 11,
    color: Colors.conductor.primary,
  },
  paymentModeTextActive: {
    color: '#fff',
  },
  paymentModeTextDisabled: {
    color: '#9E9E9E',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.conductor.primary,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    backgroundColor: Colors.conductor.primary,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: 12,
    color: '#666',
  },
  routeInfoBox: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: SCREEN_WIDTH * 0.03,
    paddingVertical: SCREEN_HEIGHT * 0.015,
  },
  routeInfoText: {
    fontFamily: FONTS.Rubik.semiBold,
    fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
    color: Colors.conductor.primary,
    marginBottom: 4,
  },
  routeInfoSubtext: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: Math.min(SCREEN_WIDTH * 0.028, 11),
    color: '#999',
    fontStyle: 'italic',
  },
  dropdownButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 12,
    color: Colors.conductor.primary,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: SCREEN_HEIGHT * 0.02,
  },
  smallModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.45,
    paddingBottom: SCREEN_HEIGHT * 0.02,
  },
  numberPickerItem: {
    flex: 1,
    margin: 6,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f5f5f5',
  },
  numberPickerText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 18,
    color: '#333',
  },
  numberPickerItemSelected: {
    backgroundColor: Colors.conductor.primary,
    borderColor: Colors.conductor.primary,
  },
  numberPickerTextSelected: {
    color: '#fff',
  },
  numberGridRow: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SCREEN_WIDTH * 0.04,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: Math.min(SCREEN_WIDTH * 0.045, 18),
    color: Colors.conductor.primary,
  },
  modalClose: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: Math.min(SCREEN_WIDTH * 0.055, 22),
    color: '#666',
    paddingHorizontal: 10,
  },
  pickerItem: {
    paddingHorizontal: SCREEN_WIDTH * 0.04,
    paddingVertical: SCREEN_HEIGHT * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#fff3e0',
  },
  pickerItemText: {
    fontFamily: FONTS.Rubik.regular,
    fontSize: Math.min(SCREEN_WIDTH * 0.035, 14),
    color: '#333',
    flex: 1,
  },
  pickerItemTextSelected: {
    fontFamily: FONTS.Rubik.semiBold,
    color: Colors.conductor.primary,
  },
  checkmark: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: Math.min(SCREEN_WIDTH * 0.045, 18),
    color: Colors.conductor.primary,
    marginLeft: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: Colors.conductor.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.conductor.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  acceptButtonText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 14,
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
    letterSpacing: 1,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.conductor.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 14,
    color: Colors.conductor.primary,
    letterSpacing: 1,
  },
});

export default TicketingScreen;
