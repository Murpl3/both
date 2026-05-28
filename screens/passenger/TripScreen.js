import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FONTS } from '../../fonts';
import { ROUTE_LANDMARKS, calculateFare, isValidRoute } from '../../data/routes';
import { apiRequest } from '../../utils/apiClient';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';

const RT = Colors.rapidTransit;

// Map landmarks to format expected by this screen
const DESTINATIONS = ROUTE_LANDMARKS.map(landmark => ({
  id: landmark.id,
  landmark: landmark.name,
  fare: landmark.fare,
}));

// Extract just the landmark names for the picker
const PLACES = DESTINATIONS.map(dest => dest.landmark);

export default function TripScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [routeId, setRouteId] = useState(1);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const routes = await apiRequest('/routes', { method: 'GET' });
        if (Array.isArray(routes) && routes.length > 0) {
          setRouteId(routes[0].id);
        }
      } catch {}
    })();
  }, []);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleDecreasePassengers = () => {
    if (passengers > 1) {
      setPassengers(passengers - 1);
    }
  };

  const handleIncreasePassengers = () => {
    // Limit to maximum 10 passengers per booking
    if (passengers < 10) {
      setPassengers(passengers + 1);
    }
  };

  const handleSelectOrigin = (place) => {
    setOrigin(place);
    setShowOriginPicker(false);
  };

  const handleSelectDestination = (place) => {
    setDestination(place);
    setShowDestinationPicker(false);
  };

  const handleSearchTrip = async () => {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Missing Information', 'Please select both origin and destination');
      return;
    }
    if (origin === destination) {
      Alert.alert('Invalid Route', 'Origin and destination must be different');
      return;
    }
    
    // Validate route
    if (!isValidRoute(origin, destination)) {
      Alert.alert('Invalid Route', 'The selected route is not available. Please choose a valid route.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Calculate fare using the route calculator
      const fare = calculateFare(origin, destination);
      
      console.log(`📍 Route: ${origin} → ${destination}, Fare: ₱${fare.toFixed(2)}`);
      
      // Small delay to show loading state (better UX)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate to departure schedule screen
      navigation.navigate('DepartureSchedule', {
        routeId,
        origin,
        destination,
        passengers,
        fare: fare.toFixed(2),
      });
    } catch (error) {
      console.error('Error searching trip:', error);
      Alert.alert('Error', 'Failed to search for trips. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlaceItem = (item, onSelect) => (
    <TouchableOpacity
      style={styles.placeItem}
      onPress={() => onSelect(item)}
    >
      <Text style={styles.placeItemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <Screen padded={false}>
      <AppHeader title="Trip" subtitle="Choose your route" onBack={() => navigation.goBack()} />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 30) + 85 }}
      >
        {/* White Card Container */}
        <View style={styles.whiteCard}>
          {/* Step Indicator */}
          <Text style={styles.stepIndicator}>Step 1</Text>

          {/* Origin Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Origin</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowOriginPicker(true)}
            >
              <Image
                source={require('../../assets/placeholder red.png')}
                style={styles.locationIcon}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.input,
                  !origin && styles.placeholderText,
                ]}
              >
                {origin || 'Select origin'}
              </Text>
              <TouchableOpacity
                style={styles.dropdownIcon}
                onPress={() => setShowOriginPicker(true)}
              >
                <Text style={styles.chevronDown}>⌄</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Swap Button */}
          <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
            <View style={styles.swapIconContainer}>
              <Text style={styles.swapIcon}>⇅</Text>
            </View>
          </TouchableOpacity>

          {/* Destination Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowDestinationPicker(true)}
            >
              <Image
                source={require('../../assets/placeholder black.png')}
                style={styles.locationIcon}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.input,
                  !destination && styles.placeholderText,
                ]}
              >
                {destination || 'Select destination'}
              </Text>
              <TouchableOpacity
                style={styles.dropdownIcon}
                onPress={() => setShowDestinationPicker(true)}
              >
                <Text style={styles.chevronDown}>⌄</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Separator Line */}
          <View style={styles.separator} />

          {/* Passengers Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Passengers</Text>
            <View style={styles.passengerInputContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleDecreasePassengers}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.quantityDisplay}>
                <Text style={[styles.quantityText, passengers === 0 && styles.placeholderText]}>
                  {passengers === 0 ? 'Add Quantity' : passengers.toString()}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.quantityButton, styles.quantityButtonOrange]}
                onPress={handleIncreasePassengers}
              >
                <Text style={[styles.quantityButtonText, styles.quantityButtonTextWhite]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Trip Button */}
          <TouchableOpacity 
            style={[styles.searchButton, loading && styles.searchButtonDisabled]} 
            onPress={handleSearchTrip}
            disabled={loading}
          >
            <Text style={styles.searchButtonText}>
              {loading ? 'Searching...' : 'Search Trip'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              <TouchableOpacity
                onPress={() => setShowOriginPicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={PLACES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => renderPlaceItem(item, handleSelectOrigin)}
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
              <TouchableOpacity
                onPress={() => setShowDestinationPicker(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={PLACES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => renderPlaceItem(item, handleSelectDestination)}
            />
          </View>
        </View>
      </Modal>
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
  whiteCard: {
    backgroundColor: RT.white,
    margin: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 22,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  stepIndicator: {
    textAlign: 'center',
    color: Colors.passenger.primary,
    fontSize: 12,
    fontFamily: FONTS.Rubik.bold,
    marginBottom: 20,
    backgroundColor: Colors.passenger.ultraLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    color: Colors.rapidTransit.slate600,
    marginBottom: 8,
    fontFamily: FONTS.Rubik.semiBold,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rapidTransit.slate50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: RT.slate200,
    paddingHorizontal: 14,
    height: 54,
  },
  locationIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.rapidTransit.slate800,
    paddingVertical: 0,
    fontFamily: FONTS.Rubik.medium,
  },
  placeholderText: {
    color: RT.slate400,
  },
  dropdownIcon: {
    padding: 6,
    backgroundColor: 'rgba(232, 93, 58, 0.1)',
    borderRadius: 8,
  },
  chevronDown: {
    fontSize: 18,
    color: Colors.passenger.primary,
    fontFamily: FONTS.Rubik.bold,
  },
  swapButton: {
    alignItems: 'center',
    marginVertical: 6,
  },
  swapIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: RT.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.passenger.primary,
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  swapIcon: {
    fontSize: 20,
    color: Colors.passenger.primary,
    fontFamily: FONTS.Rubik.bold,
  },
  separator: {
    height: 1.5,
    backgroundColor: RT.slate100,
    marginVertical: 18,
  },
  passengerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rapidTransit.slate50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: RT.slate200,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RT.white,
  },
  quantityButtonOrange: {
    backgroundColor: Colors.passenger.primary,
  },
  quantityButtonText: {
    fontSize: 22,
    color: Colors.rapidTransit.slate400,
    fontFamily: FONTS.Rubik.medium,
  },
  quantityButtonTextWhite: {
    color: RT.white,
  },
  quantityDisplay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
  },
  quantityText: {
    fontSize: 18,
    color: Colors.rapidTransit.slate800,
    fontFamily: FONTS.Rubik.bold,
  },
  searchButton: {
    backgroundColor: Colors.passenger.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: Colors.passenger.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  searchButtonDisabled: {
    backgroundColor: Colors.passenger.tertiary,
    opacity: 0.7,
  },
  searchButtonText: {
    color: RT.white,
    fontSize: 15,
    fontFamily: FONTS.Rubik.bold,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: RT.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: RT.slate100,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.Rubik.bold,
    color: Colors.rapidTransit.slate800,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RT.slate50,
    borderRadius: 18,
  },
  modalCloseText: {
    fontSize: 18,
    color: Colors.rapidTransit.slate400,
    fontFamily: FONTS.Rubik.medium,
  },
  placeItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: RT.slate50,
  },
  placeItemText: {
    fontSize: 14,
    color: Colors.rapidTransit.slate800,
    fontFamily: FONTS.Rubik.regular,
  },
});
