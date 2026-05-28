/**
 * Pre-defined Conductor Accounts
 * These accounts are provided by the admin - conductors cannot create their own accounts.
 * Each conductor is assigned to a specific vehicle number.
 * 
 * Login: username = conductor number (1-10), password = same as username
 * Example: Conductor 1 → username: "1", password: "1"
 * 
 * MPIN: Pre-assigned (e.g., Conductor 1 = 111111, Conductor 2 = 222222)
 */

// Randomized vehicle assignments (each vehicle 1-10 assigned to one conductor)
// This ensures no two conductors share the same vehicle
const vehicleAssignments = [5, 3, 8, 1, 10, 2, 7, 4, 9, 6];

// Randomized driver assignments (each driver 1-10 assigned to one conductor)
// This ensures no two conductors share the same driver
const driverAssignments = [3, 7, 1, 9, 4, 10, 2, 6, 8, 5];

export const CONDUCTOR_ACCOUNTS = [
  {
    id: 1,
    username: '1',
    password: '1',
    full_name: '', // Empty - conductor will fill this out
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[0], // Vehicle 5
    driver_no: driverAssignments[0], // Driver 3
    mpin: '111111', // Pre-assigned MPIN
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',                                      
  },
  {
    id: 2,
    username: '2',
    password: '2',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[1], // Vehicle 3
    driver_no: driverAssignments[1], // Driver 7
    mpin: '222222',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
  {
    id: 3,
    username: '3',
    password: '3',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[2], // Vehicle 8
    driver_no: driverAssignments[2], // Driver 1
    mpin: '333333',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
  {
    id: 4,
    username: '4',
    password: '4',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[3], // Vehicle 1
    driver_no: driverAssignments[3], // Driver 9
    mpin: '444444',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
  {
    id: 5,
    username: '5',
    password: '5',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[4], // Vehicle 10
    driver_no: driverAssignments[4], // Driver 4
    mpin: '555555',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
  {
    id: 6,
    username: '6',
    password: '6',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[5], // Vehicle 2
    driver_no: driverAssignments[5], // Driver 10
    mpin: '666666',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
  {
    id: 7,
    username: '7',
    password: '7',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[6], // Vehicle 7
    driver_no: driverAssignments[6], // Driver 2
    mpin: '777777',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
  {
    id: 8,
    username: '8',
    password: '8',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[7], // Vehicle 4
    driver_no: driverAssignments[7], // Driver 6
    mpin: '888888',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
  {
    id: 9,
    username: '9',
    password: '9',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[8], // Vehicle 9
    driver_no: driverAssignments[8], // Driver 8
    mpin: '999999',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
  {
    id: 10,
    username: '10',
    password: '10',
    full_name: '',
    first_name: '',
    last_name: '',
    vehicle_no: vehicleAssignments[9], // Vehicle 6
    driver_no: driverAssignments[9], // Driver 5
    mpin: '101010',
    mpin_set: true,
    contact: '',
    email: '',
    address: '',
    birthdate: '',
  },
];

/**
 * Get conductor by username
 * @param {string} username - The conductor's username (1-10)
 * @returns {object|null} - Conductor object or null if not found
 */
export const getConductorByUsername = (username) => {
  if (!username) return null;
  return CONDUCTOR_ACCOUNTS.find(
    (c) => c.username === username.toString().trim()
  );
};

/**
 * Validate conductor credentials
 * Username and password must match (both are the conductor number)
 * @param {string} username 
 * @param {string} password 
 * @returns {object|null} - Conductor object if valid, null otherwise
 */
export const validateConductorCredentials = (username, password) => {
  if (!username || !password) return null;
  
  // Username and password must match
  if (username.toString().trim() !== password.toString().trim()) {
    return null;
  }
  
  return getConductorByUsername(username);
};

/**
 * Validate conductor MPIN
 * @param {string} username - Conductor username
 * @param {string} mpin - MPIN to validate
 * @returns {boolean} - True if MPIN matches
 */
export const validateConductorMPIN = (username, mpin) => {
  const conductor = getConductorByUsername(username);
  if (!conductor) return false;
  return conductor.mpin === mpin;
};

/**
 * Get conductor's pre-assigned MPIN
 * @param {string} username - Conductor username
 * @returns {string|null} - MPIN or null if not found
 */
export const getConductorMPIN = (username) => {
  const conductor = getConductorByUsername(username);
  return conductor?.mpin || null;
};

/**
 * Get conductor by vehicle number
 * @param {number|string} vehicleNo - The vehicle number
 * @returns {object|null} - Conductor object or null if not found
 */
export const getConductorByVehicle = (vehicleNo) => {
  const vNo = parseInt(vehicleNo);
  return CONDUCTOR_ACCOUNTS.find((c) => c.vehicle_no === vNo);
};

/**
 * Get conductor by driver number
 * @param {number|string} driverNo - The driver number
 * @returns {object|null} - Conductor object or null if not found
 */
export const getConductorByDriver = (driverNo) => {
  const dNo = parseInt(driverNo);
  return CONDUCTOR_ACCOUNTS.find((c) => c.driver_no === dNo);
};

/**
 * Get all conductors with their assigned vehicles and drivers
 * @returns {Array} - Array of conductor-vehicle-driver assignments
 */
export const getConductorVehicleAssignments = () => {
  return CONDUCTOR_ACCOUNTS.map((c) => ({
    conductorId: c.id,
    conductorName: c.full_name || `Conductor ${c.username}`,
    username: c.username,
    vehicleNo: c.vehicle_no,
    driverNo: c.driver_no,
    mpin: c.mpin,
  }));
};

// Export summary for quick reference
export const CONDUCTOR_VEHICLE_MAP = {
  // Conductor number → Vehicle number
  '1': 5,
  '2': 3,
  '3': 8,
  '4': 1,
  '5': 10,
  '6': 2,
  '7': 7,
  '8': 4,
  '9': 9,
  '10': 6,
};

export const CONDUCTOR_DRIVER_MAP = {
  // Conductor number → Driver number
  '1': 3,
  '2': 7,
  '3': 1,
  '4': 9,
  '5': 4,
  '6': 10,
  '7': 2,
  '8': 6,
  '9': 8,
  '10': 5,
};

// Export MPIN reference
export const CONDUCTOR_MPIN_MAP = {
  '1': '111111',
  '2': '222222',
  '3': '333333',
  '4': '444444',
  '5': '555555',
  '6': '666666',
  '7': '777777',
  '8': '888888',
  '9': '999999',
  '10': '101010',
};
