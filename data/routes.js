// EzSakay Route Data - Digos City to Bansalan
// DASUTRANSCO Route Landmarks and Fares

export const ROUTE_LANDMARKS = [
  { id: 1, name: 'Digos City Public Terminal', distance: 0, fare: 15.00 },
  { id: 2, name: 'V8 Gas Station', distance: 1, fare: 15.00 },
  { id: 3, name: 'Central Convenience (Rizal Ave.)', distance: 2, fare: 15.00 },
  { id: 4, name: 'Green Coffee/Land Bank', distance: 3, fare: 15.00 },
  { id: 5, name: 'Total Gas Station (Quezon Ave.)', distance: 4, fare: 15.00 },
  { id: 6, name: 'Flying V Gas Station', distance: 5, fare: 17.25 },
  { id: 7, name: 'Iglesia ni Cristo', distance: 6, fare: 19.50 },
  { id: 8, name: 'Tenessee Homes', distance: 7, fare: 21.50 },
  { id: 9, name: 'Greneth Store/"Kaangan"', distance: 8, fare: 23.75 },
  { id: 10, name: 'AJM Mango Buyer', distance: 9, fare: 26.00 },
  { id: 11, name: 'Colorado Elem. School', distance: 10, fare: 28.25 },
  { id: 12, name: 'Sinaragan Bridge', distance: 11, fare: 30.50 },
  { id: 13, name: 'GKK Birhen sa Fatima', distance: 12, fare: 32.50 },
  { id: 14, name: 'Crossing Cabligan', distance: 13, fare: 34.75 },
  { id: 15, name: 'South Adventist Philippine College', distance: 14, fare: 37.00 },
  { id: 16, name: "Epyong's Cambingan", distance: 15, fare: 39.25 },
  { id: 17, name: 'Matanao MPS Community Outpost', distance: 16, fare: 41.50 },
  { id: 18, name: 'DASURECO Facility', distance: 17, fare: 43.50 },
  { id: 19, name: 'Sacub Bridge', distance: 18, fare: 45.75 },
  { id: 20, name: 'Mabuhay Barangay Hall', distance: 19, fare: 48.00 },
  { id: 21, name: 'Rose Bakeshop', distance: 20, fare: 50.25 },
  { id: 22, name: 'Bansalan Terminal', distance: 21, fare: 52.50 },
  { id: 23, name: 'University of Mindanao Bansalan', distance: 22, fare: 54.50 },
  { id: 24, name: 'Bansalan-Magsaysay Hwy.', distance: 23, fare: 56.75 },
  { id: 25, name: 'Jona Store', distance: 24, fare: 59.00 },
  { id: 26, name: 'FCC Laundry Shop', distance: 25, fare: 61.25 },
  { id: 27, name: 'So-ok Basketball Court', distance: 26, fare: 63.50 },
  { id: 28, name: 'Magsaysay Medical Center', distance: 27, fare: 65.50 },
  { id: 29, name: 'Bansalan-Magsaysay', distance: 28, fare: 67.75 },
  { id: 30, name: 'AJ Gas Station', distance: 29, fare: 70.00 },
  { id: 31, name: 'Prk 4. Bob Barayong', distance: 30, fare: 72.25 },
  { id: 32, name: 'Bulatukan Steel Bridge', distance: 31, fare: 74.50 },
  { id: 33, name: 'kilolog Basketball Court', distance: 32, fare: 76.50 },
  { id: 34, name: 'Puro 4', distance: 33, fare: 78.75 },
  { id: 35, name: 'Iglesia ni Cristo Prk 1. Lower Bala', distance: 34, fare: 81.00 },
  { id: 36, name: 'Lower Bala', distance: 35, fare: 83.25 },
  { id: 37, name: 'Upper Bala', distance: 36, fare: 85.50 },
  { id: 38, name: 'GKK Sr. San Miguel Upper Bala', distance: 37, fare: 87.50 },
  { id: 39, name: 'Upper Bala Brgy. Hall', distance: 38, fare: 89.75 },
];

// Departure schedules with seat capacity
export const DEPARTURE_SCHEDULES = [
  { id: 1, time: '05:00 AM', totalSeats: 30, availableSeats: 30 },
  { id: 2, time: '06:00 AM', totalSeats: 30, availableSeats: 30 },
  { id: 3, time: '07:00 AM', totalSeats: 30, availableSeats: 30 },
  { id: 4, time: '08:00 AM', totalSeats: 30, availableSeats: 30 },
  { id: 5, time: '09:00 AM', totalSeats: 30, availableSeats: 30 },
  { id: 6, time: '10:00 AM', totalSeats: 30, availableSeats: 30 },
  { id: 7, time: '11:00 AM', totalSeats: 30, availableSeats: 30 },
  { id: 8, time: '12:00 PM', totalSeats: 30, availableSeats: 30 },
  { id: 9, time: '01:00 PM', totalSeats: 30, availableSeats: 30 },
  { id: 10, time: '02:00 PM', totalSeats: 30, availableSeats: 30 },
  { id: 11, time: '03:00 PM', totalSeats: 30, availableSeats: 30 },
  { id: 12, time: '04:00 PM', totalSeats: 30, availableSeats: 30 },
  { id: 13, time: '05:00 PM', totalSeats: 30, availableSeats: 30 },
  { id: 14, time: '06:00 PM', totalSeats: 30, availableSeats: 30 },
];

/**
 * Calculate fare between two landmarks (works both directions!)
 * Fare is based on distance traveled, not direction
 * 
 * @param {string} origin - Origin landmark name
 * @param {string} destination - Destination landmark name
 * @returns {number} - Fare amount
 */
export const calculateFare = (origin, destination) => {
  const originLandmark = ROUTE_LANDMARKS.find(l => l.name === origin);
  const destLandmark = ROUTE_LANDMARKS.find(l => l.name === destination);
  
  if (!originLandmark || !destLandmark) {
    console.warn('Landmark not found:', { origin, destination });
    return 15.00; // Base fare (minimum)
  }
  
  // Calculate distance traveled (absolute value for both directions)
  const distanceTraveled = Math.abs(destLandmark.distance - originLandmark.distance);
  
  // Base fare is ₱15.00 for first 4km, then ₱2.25 per km after
  const BASE_FARE = 15.00;
  const BASE_DISTANCE = 4; // km covered by base fare
  const FARE_PER_KM = 2.25;
  
  if (distanceTraveled <= BASE_DISTANCE) {
    return BASE_FARE;
  }
  
  // Calculate fare: base + (extra km × rate)
  const extraKm = distanceTraveled - BASE_DISTANCE;
  const fare = BASE_FARE + (extraKm * FARE_PER_KM);
  
  // Round to 2 decimal places
  return Math.round(fare * 100) / 100;
};

/**
 * Check if route is valid (origin and destination must be different)
 * Now allows BOTH directions (Digos→Bansalan OR Bansalan→Digos)
 * 
 * @param {string} origin - Origin landmark name
 * @param {string} destination - Destination landmark name
 * @returns {boolean}
 */
export const isValidRoute = (origin, destination) => {
  const originLandmark = ROUTE_LANDMARKS.find(l => l.name === origin);
  const destLandmark = ROUTE_LANDMARKS.find(l => l.name === destination);
  
  if (!originLandmark || !destLandmark) return false;
  
  // Just check they're different locations (allow both directions!)
  return originLandmark.id !== destLandmark.id;
};

/**
 * Get travel direction
 * @param {string} origin - Origin landmark name
 * @param {string} destination - Destination landmark name
 * @returns {string} - 'TO_UPPER_BALA' or 'TO_DIGOS'
 */
export const getTravelDirection = (origin, destination) => {
  const originLandmark = ROUTE_LANDMARKS.find(l => l.name === origin);
  const destLandmark = ROUTE_LANDMARKS.find(l => l.name === destination);
  
  if (!originLandmark || !destLandmark) return 'UNKNOWN';
  
  return destLandmark.distance > originLandmark.distance ? 'TO_UPPER_BALA' : 'TO_DIGOS';
};

/**
 * Filter out past departure times (real-time)
 * Only show upcoming departures
 * @returns {Array} - Available upcoming schedules
 */
export const getAvailableDepartures = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  return DEPARTURE_SCHEDULES.filter(schedule => {
    // Parse schedule time (e.g., "08:00 AM")
    const [time, period] = schedule.time.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    let scheduleHour = hours;
    if (period === 'PM' && hours !== 12) scheduleHour += 12;
    if (period === 'AM' && hours === 12) scheduleHour = 0;
    
    // Check if schedule is in the future
    // Add 30-minute buffer (remove if departure time passed by 30+ mins)
    if (scheduleHour > currentHour) return true;
    if (scheduleHour === currentHour && minutes > currentMinute + 30) return true;
    
    return false;
  });
};

/**
 * Get today's date key for seat storage
 */
const getTodayKey = () => {
  const today = new Date();
  return `seats_${today.getFullYear()}_${today.getMonth() + 1}_${today.getDate()}`;
};

/**
 * Load persisted seat data from AsyncStorage
 */
export const loadPersistedSeats = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const todayKey = getTodayKey();
    const seatsJson = await AsyncStorage.getItem(todayKey);
    
    if (seatsJson) {
      const seatsData = JSON.parse(seatsJson);
      // Apply persisted seat counts to schedules
      DEPARTURE_SCHEDULES.forEach(schedule => {
        if (seatsData[schedule.id] !== undefined) {
          schedule.availableSeats = seatsData[schedule.id];
        }
      });
      console.log('✅ Loaded persisted seat data for today');
    } else {
      // New day - reset all seats
      resetAllSeats();
      console.log('🔄 New day - all seats reset');
    }
  } catch (error) {
    console.error('Error loading persisted seats:', error);
  }
};

/**
 * Save seat data to AsyncStorage
 */
const persistSeats = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const todayKey = getTodayKey();
    const seatsData = {};
    
    DEPARTURE_SCHEDULES.forEach(schedule => {
      seatsData[schedule.id] = schedule.availableSeats;
    });
    
    await AsyncStorage.setItem(todayKey, JSON.stringify(seatsData));
  } catch (error) {
    console.error('Error persisting seats:', error);
  }
};

/**
 * Book seats for a departure
 * @param {number} scheduleId - Schedule ID
 * @param {number} numSeats - Number of seats to book
 * @returns {boolean} - True if booking successful
 */
export const bookSeats = async (scheduleId, numSeats) => {
  const schedule = DEPARTURE_SCHEDULES.find(s => s.id === scheduleId);
  
  if (!schedule) {
    console.error('Schedule not found:', scheduleId);
    return false;
  }
  
  if (schedule.availableSeats < numSeats) {
    console.warn('Not enough seats available');
    return false;
  }
  
  // Update available seats
  schedule.availableSeats -= numSeats;
  
  // Persist to AsyncStorage
  await persistSeats();
  
  console.log(`✅ Booked ${numSeats} seat(s) for ${schedule.time}`);
  console.log(`   Remaining: ${schedule.availableSeats}/${schedule.totalSeats}`);
  
  return true;
};

/**
 * Get seat availability display
 * @param {number} scheduleId - Schedule ID
 * @returns {string} - e.g., "25/30"
 */
export const getSeatAvailability = (scheduleId) => {
  const schedule = DEPARTURE_SCHEDULES.find(s => s.id === scheduleId);
  if (!schedule) return '0/30';
  return `${schedule.availableSeats}/${schedule.totalSeats}`;
};

/**
 * Reset all seats (for testing or daily reset)
 */
export const resetAllSeats = async () => {
  DEPARTURE_SCHEDULES.forEach(schedule => {
    schedule.availableSeats = schedule.totalSeats;
  });
  // Persist the reset
  await persistSeats();
  console.log('✅ All seats reset');
};

export default {
  ROUTE_LANDMARKS,
  DEPARTURE_SCHEDULES,
  calculateFare,
  isValidRoute,
  getAvailableDepartures,
  bookSeats,
  getSeatAvailability,
  resetAllSeats,
  loadPersistedSeats,
};
