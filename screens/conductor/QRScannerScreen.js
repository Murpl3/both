import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import { saveAcceptedTicket, updateTransactionStatus } from '../../utils/conductorUtils';
import { validateQRPayload, validateFareAmount, logSecurityEvent, getUserFriendlyError } from '../../utils/securityUtils';
import Screen from '../../components/ui/Screen';
import { apiRequest, getConductorToken } from '../../utils/apiClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function QRScannerScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torch, setTorch] = useState(false);
  
  // Conductor mode - for fare deduction
  const conductorMode = route?.params?.conductorMode || false;
  
  // Fare modal state
  const [showFareModal, setShowFareModal] = useState(false);
  const [scannedPassenger, setScannedPassenger] = useState(null);
  const [fareAmount, setFareAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // Validate if QR code is an EzSakay passenger QR (supports both V1 and V2)
  const isValidPassengerQR = (qrData) => {
    if (!qrData || typeof qrData !== 'object') return false;
    return (qrData.type === 'EZSAKAY_PASSENGER' || qrData.type === 'EZSAKAY_PASSENGER_V2') && qrData.phone;
  };

  // Validate if QR code is an EzSakay ticket QR (legacy support)
  const isValidTicketQR = (qrData) => {
    if (!qrData || typeof qrData !== 'object') return false;
    const hasRefNo = qrData.refNo && typeof qrData.refNo === 'string';
    const hasFrom = qrData.from && typeof qrData.from === 'string';
    const hasTo = qrData.to && typeof qrData.to === 'string';
    return hasRefNo && hasFrom && hasTo;
  };

  // Check if ticket is expired (5 mins BEFORE departure - boarding cutoff)
  const isTicketExpired = (qrData) => {
    if (!qrData?.departureTimestamp) return false;
    const now = Date.now();
    const expiryMinutes = qrData.expiryMinutes || 5;
    // Ticket expires 5 minutes BEFORE departure (must board before cutoff)
    const expiryTime = qrData.departureTimestamp - (expiryMinutes * 60 * 1000);
    return now > expiryTime;
  };

  // Process fare deduction from passenger wallet
  const processFareDeduction = async (passenger, fare) => {
    setProcessingPayment(true);
    
    try {
      // Deprecated: wallet deductions should be recorded via ticket acceptance flow.
      const fareNum = parseFloat(fare);
      
      if (isNaN(fareNum) || fareNum <= 0) {
        Alert.alert('Invalid Fare', 'Please enter a valid fare amount.');
        setProcessingPayment(false);
        return;
      }
      
      // Validate fare is within acceptable range (₱15 - ₱150)
      const fareValidation = validateFareAmount(fareNum);
      if (!fareValidation.valid) {
        Alert.alert('Invalid Fare Amount', fareValidation.error);
        setProcessingPayment(false);
        return;
      }
      
      Alert.alert('Info', 'Passenger wallet QR deductions are no longer supported. Please scan the ticket QR instead.');
      setProcessingPayment(false);
      return;
      
      // Save transaction for conductor's trip summary
      const ticketData = {
        ticketId: `TXN-${Date.now()}`,
        passengerPhone: phoneNumber,
        passengerName: passenger.name || 'Passenger',
        totalFare: fareNum.toFixed(2),
        paymentMode: 'WALLET',
        status: 'PAID',
        timestamp: new Date().toISOString(),
        // Include fields for trip summary compatibility
        origin: 'QR Scan',
        destination: 'QR Scan',
        passengers: 1,
        fareType: 'Regular',
        regularCount: 1,
        studentCount: 0,
        pwdCount: 0,
      };
      
      await saveAcceptedTicket(ticketData);
      
      // Log successful payment
      logSecurityEvent('PAYMENT_SUCCESS', {
        phone: phoneNumber,
        amount: fareNum,
        previousBalance: currentBalance,
        newBalance: newBalance
      });
      
      // Success!
      Alert.alert(
        '✅ Payment Successful',
        `Fare: ₱${fareNum.toFixed(2)}\nPassenger: ${passenger.name || 'Unknown'}\nNew Balance: ₱${newBalance.toFixed(2)}`,
        [
          {
            text: 'Scan Another',
            onPress: () => {
              setShowFareModal(false);
              setScannedPassenger(null);
              setFareAmount('');
              setScanned(false);
            },
          },
          {
            text: 'Done',
            onPress: () => {
              setShowFareModal(false);
              setScannedPassenger(null);
              setFareAmount('');
              setScanned(false);
              // Go back to conductor's ticketing screen
              navigation.goBack();
            },
          },
        ]
      );
      
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (!scanned && !loading) {
      setScanned(true);
      setLoading(true);

      try {
        let qrData;
        try {
          qrData = JSON.parse(data);
        } catch (e) {
          Alert.alert(
            'Invalid QR Code',
            'This QR code is not a valid EzSakay QR code.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setScanned(false);
                  setLoading(false);
                },
              },
            ]
          );
          return;
        }

        // New ticket QR format (server-signed): { payload, signature }
        if (conductorMode && qrData && qrData.payload && qrData.signature) {
          const token = await getConductorToken();
          if (!token) {
            Alert.alert('Not Logged In', 'Please login as conductor first.');
            setScanned(false);
            setLoading(false);
            return;
          }

          const scan = await apiRequest('/tickets/scan', {
            method: 'POST',
            token,
            body: { payload: qrData.payload, signature: qrData.signature },
          });

          if (!scan.valid) {
            Alert.alert('Invalid Ticket', scan.status || 'Invalid');
            setScanned(false);
            setLoading(false);
            return;
          }

          navigation.navigate('ConductorTabs', {
            screen: 'Ticketing',
            params: { scannedTicket: qrData, scannedTicketInfo: scan.ticket },
          });
          setScanned(false);
          setLoading(false);
          return;
        }

        // Check if this is a passenger QR code
        if (isValidPassengerQR(qrData)) {
          // Validate secure QR code (V2 with timestamp/signature)
          if (qrData.type === 'EZSAKAY_PASSENGER_V2') {
            const validation = await validateQRPayload(qrData);
            
            if (!validation.valid) {
              // Log security event for failed validation
              logSecurityEvent('QR_VALIDATION_FAILED', { 
                phone: qrData.phone,
                reason: validation.error,
                expired: validation.expired
              });
              
              Alert.alert(
                validation.expired ? '⏰ QR Code Expired' : '⚠️ Invalid QR Code',
                validation.error,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setScanned(false);
                      setLoading(false);
                    },
                  },
                ]
              );
              return;
            }
            
            // Show warning for legacy codes
            if (validation.warning) {
              console.log('⚠️', validation.warning);
            }
          }
          
          // Conductor scanning passenger's QR - navigate back to Ticketing with passenger info
          logSecurityEvent('QR_SCAN_SUCCESS', { phone: qrData.phone });
          
          // Navigate back to Ticketing screen with scanned passenger data
          // Use nested navigation since Ticketing is inside ConductorTabs
          navigation.navigate('ConductorTabs', {
            screen: 'Ticketing',
            params: { scannedPassenger: qrData },
          });
          setScanned(false);
          setLoading(false);
          return;
        }

        // Check if this is a ticket QR code (legacy support)
        if (isValidTicketQR(qrData)) {
          const expired = isTicketExpired(qrData);
          
          // CONDUCTOR MODE: Handle ticket QR in conductor flow (don't navigate to passenger screens)
          if (conductorMode) {
            Alert.alert('Legacy Ticket QR', 'Please use the new server-signed ticket QR.');
            setScanned(false);
            setLoading(false);
            return;
            
            const statusText = expired ? '⚠️ EXPIRED' : '✅ VALID';
            const fareAmount = qrData.amount || 0;
            const paymentType = qrData.payment === 'WALLET' || qrData.payment === 'CASHLESS' ? 'WALLET' : 'CASH';
            const paymentNote = paymentType === 'CASH' 
              ? '\n\n💵 CASH PAYMENT - Please collect ₱' + fareAmount + ' from passenger!'
              : '\n\n✅ WALLET - Already paid via app';
            
            Alert.alert(
              `🎫 Ticket Scanned ${statusText}`,
              `Route: ${qrData.from} → ${qrData.to}\nFare: ₱${fareAmount}\nPayment: ${paymentType}\nRef: ${qrData.refNo || 'N/A'}${paymentNote}${expired ? '\n\n⚠️ This ticket has expired but can still be processed.' : ''}`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    setScanned(false);
                    setLoading(false);
                  },
                },
                {
                  text: 'Accept Ticket',
                  onPress: async () => {
                    try {
                      // Conditional update first: only one conductor can mark USED
                      if (qrData.refNo) {
                        const updateResult = await updateTransactionStatus(qrData.refNo, 'USED');
                        if (updateResult.alreadyUsed) {
                          Alert.alert(
                            '⚠️ Ticket Already Used',
                            'This ticket was already accepted by another conductor.',
                            [{ text: 'OK' }]
                          );
                          setScanned(false);
                          setLoading(false);
                          return;
                        }
                      }

                      const ticketData = {
                        ticketId: qrData.refNo || `TICKET-${Date.now()}`,
                        origin: qrData.from || 'N/A',
                        destination: qrData.to || 'N/A',
                        passengers: qrData.passengers || 1,
                        totalFare: fareAmount.toString(),
                        paymentMode: qrData.payment === 'WALLET' || qrData.payment === 'CASHLESS' ? 'WALLET' : 'CASH',
                        status: 'ACCEPTED',
                        fareType: 'Regular',
                        regularCount: qrData.passengers || 1,
                        studentCount: 0,
                        pwdCount: 0,
                        passengerPhone: qrData.userPhone || null,
                        passengerName: qrData.passengerName || null,
                      };
                      let saved = false;
                      for (let attempt = 1; attempt <= 3 && !saved; attempt++) {
                        const saveResult = await saveAcceptedTicket(ticketData);
                        if (saveResult?.success) { saved = true; break; }
                        if (attempt < 3) await new Promise(r => setTimeout(r, 300));
                      }

                      const passengerInfo = qrData.passengerName ? `\nPassenger: ${qrData.passengerName}` : '';
                      const paxCount = qrData.passengers > 1 ? `\nPassengers: ${qrData.passengers}` : '';
                      const paymentReminder = paymentType === 'CASH' 
                        ? '\n\n💵 Remember to collect ₱' + fareAmount + ' CASH!' 
                        : '';
                      
                      Alert.alert(
                        '✅ Ticket Accepted',
                        `Route: ${qrData.from} → ${qrData.to}\nFare: ₱${fareAmount}\nPayment: ${paymentType}${passengerInfo}${paxCount}${paymentReminder}\n\nTicket added to your trip summary!\n🔒 QR code has been expired.`,
                        [{ text: 'OK' }]
                      );
                    } catch (error) {
                      console.error('Error accepting ticket:', error);
                      Alert.alert('Error', 'Failed to accept ticket');
                    }
                    setScanned(false);
                    setLoading(false);
                  },
                },
              ]
            );
            return;
          }
          
          // PASSENGER MODE: Navigate to ticket details screen
          // Allow scanning of expired tickets - just show warning
          if (expired) {
            Alert.alert(
              '⚠️ Ticket Expired',
              `This ticket has expired.\n\nRoute: ${qrData.from} → ${qrData.to}\nFare: ₱${qrData.amount || 0}\n\nYou can still view the ticket details.`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    setScanned(false);
                    setLoading(false);
                  },
                },
                {
                  text: 'View Details',
                  onPress: () => {
                    // Navigate to ticket details
                    const qrTransaction = {
                      id: Date.now().toString(),
                      type: qrData.payment === 'WALLET' || qrData.payment === 'CASHLESS' ? 'WALLET' : 'CASH',
                      description: `Bus ticket from ${qrData.from} to ${qrData.to}`,
                      amount: qrData.amount || 0,
                      date: qrData.date || new Date().toLocaleString(),
                      refNo: qrData.refNo,
                      origin: qrData.from || 'N/A',
                      destination: qrData.to || 'N/A',
                      status: 'EXPIRED',
                    };
                    navigation.navigate('TicketDetails', { transaction: qrTransaction });
                    setScanned(false);
                    setLoading(false);
                  },
                },
              ]
            );
            return;
          }

          // Valid ticket - navigate to details (passenger mode only)
          const qrTransaction = {
            id: Date.now().toString(),
            type: qrData.payment === 'WALLET' || qrData.payment === 'CASHLESS' ? 'WALLET' : 'CASH',
            description: `Bus ticket from ${qrData.from} to ${qrData.to}`,
            amount: qrData.amount || 0,
            date: qrData.date || new Date().toLocaleString(),
            refNo: qrData.refNo,
            origin: qrData.from || 'N/A',
            destination: qrData.to || 'N/A',
            departureTimestamp: qrData.departureTimestamp || Date.now(),
            expiryMinutes: qrData.expiryMinutes || 5,
            schedule: qrData.schedule || 'N/A',
          };

          navigation.navigate('TicketDetails', { transaction: qrTransaction });
          setScanned(false);
          setLoading(false);
          return;
        }

        // Invalid QR code
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not from the EzSakay app.',
          [
            {
              text: 'OK',
              onPress: () => {
                setScanned(false);
                setLoading(false);
              },
            },
          ]
        );
      } catch (error) {
        console.error('Error processing QR code:', error);
        Alert.alert(
          'Error',
          'Failed to process QR code. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => {
                setScanned(false);
                setLoading(false);
              },
            },
          ]
        );
      }
    }
  };

  if (!permission) {
    return (
      <Screen variant="conductor" padded={false} style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen variant="conductor" padded={false} style={styles.container}>
        <Text style={styles.messageText}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {conductorMode ? 'Scan Passenger QR' : 'Scan QR Code'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Scanning Area */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.conductor.primary} />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>
              {conductorMode 
                ? 'Point camera at passenger\'s QR code to collect fare'
                : 'Point camera at ticket QR code'}
            </Text>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomBar}>
            <TouchableOpacity 
              style={styles.flashButton}
              onPress={() => setTorch(!torch)}
            >
              <Text style={styles.flashIcon}>🔦</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      {/* Fare Input Modal */}
      <Modal
        visible={showFareModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowFareModal(false);
          setScanned(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Collect Fare</Text>
            
            {scannedPassenger && (
              <View style={styles.passengerInfo}>
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
              </View>
            )}

            <Text style={styles.fareLabel}>Enter Fare Amount (₱)</Text>
            <TextInput
              style={styles.fareInput}
              value={fareAmount}
              onChangeText={setFareAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#999"
              editable={!processingPayment}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowFareModal(false);
                  setScannedPassenger(null);
                  setFareAmount('');
                  setScanned(false);
                }}
                disabled={processingPayment}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  (!fareAmount || processingPayment) && styles.buttonDisabled
                ]}
                onPress={() => processFareDeduction(scannedPassenger, fareAmount)}
                disabled={!fareAmount || processingPayment}
              >
                {processingPayment ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>Collect ₱{fareAmount || '0'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  backIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: FONTS.Rubik.bold,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.conductor.primary,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionContainer: {
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONTS.Rubik.regular,
    textAlign: 'center',
    opacity: 0.9,
  },
  bottomBar: {
    paddingBottom: 80,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  flashButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  flashIcon: {
    fontSize: 24,
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: FONTS.Rubik.regular,
  },
  button: {
    backgroundColor: Colors.conductor.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.conductor.textDark,
    fontSize: 16,
    fontFamily: FONTS.Rubik.semiBold,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
    fontFamily: FONTS.Rubik.regular,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: FONTS.Rubik.bold,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  passengerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.conductor.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerInitial: {
    fontSize: 22,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.conductor.textDark,
  },
  passengerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontFamily: FONTS.Rubik.semiBold,
    color: '#333',
  },
  passengerPhone: {
    fontSize: 12,
    fontFamily: FONTS.Rubik.regular,
    color: '#666',
    marginTop: 2,
  },
  fareLabel: {
    fontSize: 14,
    fontFamily: FONTS.Rubik.medium,
    color: '#666',
    marginBottom: 8,
  },
  fareInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontFamily: FONTS.Rubik.bold,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: Colors.conductor.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: FONTS.Rubik.semiBold,
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: FONTS.Rubik.semiBold,
    color: Colors.conductor.textDark,
  },
});
