import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// NOTE: Supabase is no longer the source of truth. The FastAPI backend owns
// users, wallet balance, tickets, and conductor data. The helpers in this
// file are kept so legacy callers don't crash, but new code should use
// utils/apiClient.js instead.
//
// We guard the client creation: if env vars are missing (the default in
// EAS production builds), we expose a Proxy that throws a clear error on
// any call instead of silently constructing a broken client.
const _supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = _supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : new Proxy({}, {
      get() {
        throw new Error(
          'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
          'EXPO_PUBLIC_SUPABASE_ANON_KEY, or migrate this caller to utils/apiClient.js.'
        );
      },
    });

// Helper function to verify OTP from Supabase
export const verifyOTPFromSupabase = async (phoneNumber, otpCode) => {
  try {
    // Validate OTP code is exactly 4 digits
    if (!otpCode || otpCode.length !== 4 || !/^\d{4}$/.test(otpCode)) {
      return { valid: false, error: 'OTP code must be 4 digits.' };
    }

    // Query the users table to find matching phone_number and OTP
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber.trim())
      .eq('otp_code', otpCode)
      .single();

    if (error) {
      // Check if it's a "no rows returned" error or actual database error
      if (error.code === 'PGRST116') {
        return { valid: false, error: 'Invalid OTP or phone number.' };
      }
      throw error;
    }

    // Check if OTP exists and is not expired
    if (!data) {
      return { valid: false, error: 'Invalid OTP or phone number.' };
    }

    // Enforce strict OTP expiry (5 minutes)
    if (!data.otp_expires) {
      return { valid: false, error: 'OTP expired. Please click "Resend" to get a new code.' };
    }
    const expiresAt = new Date(data.otp_expires);
    if (Number.isNaN(expiresAt.getTime())) {
      return { valid: false, error: 'OTP expired. Please click "Resend" to get a new code.' };
    }
    if (Date.now() > expiresAt.getTime()) {
      return { valid: false, error: 'OTP expired. Please click "Resend" to get a new code.' };
    }

    // OTP is valid - update is_verified status
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        is_verified: true,
        otp_code: null, // Clear OTP after successful verification
        otp_expires: null
      })
      .eq('phone_number', phoneNumber.trim());

    if (updateError) {
      console.error('Error updating verification status:', updateError);
    }

    // Return user data
    const updatedUser = {
      ...data,
      is_verified: true
    };

    return { 
      valid: true, 
      user: {
        id: updatedUser.id,
        phone_number: updatedUser.phone_number,
        nickname: updatedUser.nickname,
        is_verified: true,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        mpin_set: updatedUser.mpin_set || false
      }
    };
  } catch (error) {
    console.error('Supabase OTP verification error:', error);
    return { valid: false, error: error.message || 'Failed to verify OTP.' };
  }
};

// Helper function to create user and generate OTP in Supabase
export const createUserAndOTPInSupabase = async (phoneNumber) => {
  try {
    const normalizedPhone = phoneNumber.trim();
    
    // Generate 4-digit OTP
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Strict expiry: 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();

    let result;
    if (existingUser) {
      // Update existing user's OTP
      const { data, error } = await supabase
        .from('users')
        .update({
          otp_code: otpCode,
          otp_expires: expiresAt.toISOString(),
          is_verified: false
        })
        .eq('phone_number', normalizedPhone)
        .select()
        .single();

      if (error) throw error;
      result = { user: data, otp: otpCode };
    } else {
      // Create new user with OTP - directly save to Supabase
      // Use phone number as email placeholder if email column is required
      const placeholderEmail = `${normalizedPhone.replace(/\+/g, '')}@ezsakay.local`;
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          phone_number: normalizedPhone,
          email: placeholderEmail, // Placeholder email for database constraint
          otp_code: otpCode,
          otp_expires: expiresAt.toISOString(),
          is_verified: false
        }])
        .select()
        .single();

      if (error) throw error;
      result = { user: data, otp: otpCode };
    }

    console.log(`✅ User created/updated in Supabase. OTP: ${otpCode}`);
    return { 
      success: true, 
      user: result.user,
      otp: otpCode 
    };
  } catch (error) {
    console.error('Supabase create user/OTP error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create user in Supabase' 
    };
  }
};

// Helper function to get user by phone number from Supabase
export const getUserFromSupabase = async (phoneNumber) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { exists: false, user: null };
      }
      throw error;
    }

    // Ensure balance field is included (default to 0 if null/undefined)
    if (data && (data.balance === null || data.balance === undefined)) {
      data.balance = 0.0;
    }

    return { exists: true, user: data };
  } catch (error) {
    console.error('Supabase get user error:', error);
    return { exists: false, user: null, error: error.message };
  }
};

// Helper function to create or update user account in Supabase
export const createOrUpdateAccountInSupabase = async (phoneNumber, accountData) => {
  try {
    const normalizedPhone = phoneNumber.trim();
    
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let result;
    if (existingUser) {
      // Update existing user
      const updateData = {
        first_name: accountData.first_name || existingUser.first_name,
        last_name: accountData.last_name || existingUser.last_name,
      };

      // Add email if provided (optional)
      if (accountData.email) {
        updateData.email = accountData.email.toLowerCase().trim();
      }

      // Generate nickname if not set
      if (!updateData.nickname && accountData.first_name) {
        const baseNickname = accountData.first_name.toLowerCase().replace(/\s+/g, '');
        updateData.nickname = baseNickname;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('phone_number', normalizedPhone)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new user
      const insertData = {
        phone_number: normalizedPhone,
        first_name: accountData.first_name,
        last_name: accountData.last_name,
        is_verified: true, // Mark as verified if they got past OTP
      };

      // Add email if provided (optional)
      if (accountData.email) {
        insertData.email = accountData.email.toLowerCase().trim();
      } else {
        // Use phone number as email placeholder if email column is required
        const placeholderEmail = `${normalizedPhone.replace(/\+/g, '')}@ezsakay.local`;
        insertData.email = placeholderEmail;
      }

      // Generate nickname from first name
      if (accountData.first_name) {
        insertData.nickname = accountData.first_name.toLowerCase().replace(/\s+/g, '');
      }

      const { data, error } = await supabase
        .from('users')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        // If nickname conflict, try with number
        if (error.code === '23505' && error.message.includes('nickname')) {
          const baseNickname = insertData.nickname;
          let counter = 1;
          let inserted = false;
          
          while (!inserted && counter < 100) {
            insertData.nickname = `${baseNickname}${counter}`;
            const retryResult = await supabase
              .from('users')
              .insert([insertData])
              .select()
              .single();
            
            if (!retryResult.error) {
              result = retryResult.data;
              inserted = true;
            } else if (!retryResult.error.message.includes('nickname')) {
              throw retryResult.error;
            }
            counter++;
          }
          
          if (!inserted) {
            throw new Error('Could not create unique nickname');
          }
        } else {
          throw error;
        }
      } else {
        result = data;
      }
    }

    return { 
      success: true, 
      user: result 
    };
  } catch (error) {
    console.error('Supabase create/update account error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create/update account in Supabase' 
    };
  }
};

/**
 * Update user balance in Supabase
 * @param {string} phoneNumber - User phone number
 * @param {number} balance - New balance amount
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const updateBalanceInSupabase = async (phoneNumber, balance) => {
  try {
    const normalizedPhone = phoneNumber.trim();
    
    const { error } = await supabase
      .from('users')
      .update({ balance: balance })
      .eq('phone_number', normalizedPhone);
    
    if (error) {
      console.error('Error updating balance in Supabase:', error);
      return false;
    }
    
    console.log(`✅ Balance updated in Supabase: ₱${balance.toFixed(2)} for ${normalizedPhone}`);
    return true;
  } catch (error) {
    console.error('Error updating balance in Supabase:', error);
    return false;
  }
};

/**
 * Update user profile details in Supabase
 * @param {string} phoneNumber - User phone number
 * @param {object} profileData - Profile data to update
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export const updateUserProfileInSupabase = async (phoneNumber, profileData) => {
  try {
    const normalizedPhone = phoneNumber.trim();
    
    // Build update data with all profile fields
    const updateData = {};
    if (profileData.first_name !== undefined) updateData.first_name = profileData.first_name;
    if (profileData.last_name !== undefined) updateData.last_name = profileData.last_name;
    if (profileData.address !== undefined) updateData.address = profileData.address;
    if (profileData.birthdate !== undefined) updateData.birthdate = profileData.birthdate;
    if (profileData.contact !== undefined) updateData.contact = profileData.contact;
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('phone_number', normalizedPhone)
      .select()
      .single();
    
    if (error) {
      // Handle missing column error gracefully
      if (error.code === 'PGRST204' || error.message.includes('column')) {
        console.log('⚠️ Some profile columns missing in database - saved locally only');
        return { success: true, columnMissing: true };
      }
      console.error('Error updating profile in Supabase:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`✅ Profile updated in Supabase for ${normalizedPhone}`);
    return { success: true, user: data };
  } catch (error) {
    console.error('Error updating profile in Supabase:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save a transaction (ticket booking) to Supabase
 * @param {object} transaction - Transaction object
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const saveTransactionToSupabase = async (transaction) => {
  try {
    const insertData = {
      user_phone: transaction.userPhone || '',
      ref_no: transaction.refNo,
      transaction_type: transaction.type,
      amount: transaction.amount,
      origin: transaction.origin,
      destination: transaction.destination,
      passengers: transaction.passengers || 1,
      schedule_time: transaction.schedule,
      operator: transaction.operator || 'DASUTRANSCO',
      departure_timestamp: transaction.departureTimestamp,
      expiry_minutes: transaction.expiryMinutes || 5,
      status: transaction.status || 'ACTIVE',
      passenger_details: transaction.passengerDetails ? JSON.stringify(transaction.passengerDetails) : null,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      // Handle case where transactions table doesn't exist
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Transactions table not found in Supabase - saved locally only');
        return { success: true, data: insertData, tableNotFound: true };
      }
      console.error('Error saving transaction to Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Transaction saved to Supabase: ${transaction.refNo}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error saving transaction to Supabase:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Load transactions from Supabase for a user
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<{success: boolean, transactions?: array, error?: string}>}
 */
export const loadTransactionsFromSupabase = async (phoneNumber) => {
  try {
    const normalizedPhone = phoneNumber.trim();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_phone', normalizedPhone)
      .order('created_at', { ascending: false });

    if (error) {
      // Handle case where transactions table doesn't exist
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Transactions table not found in Supabase - using local storage only');
        return { success: true, transactions: [], tableNotFound: true };
      }
      console.error('Error loading transactions from Supabase:', error);
      return { success: false, transactions: [], error: error.message };
    }

    // Convert database format to app format
    const transactions = (data || []).map(t => ({
      id: t.id.toString(),
      type: t.transaction_type,
      description: `Bus ticket from ${t.origin} to ${t.destination}`,
      amount: parseFloat(t.amount),
      passengerDetails: t.passenger_details ? (typeof t.passenger_details === 'string' ? JSON.parse(t.passenger_details) : t.passenger_details) : null,
      date: new Date(t.created_at).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      refNo: t.ref_no,
      origin: t.origin,
      destination: t.destination,
      passengers: t.passengers,
      schedule: t.schedule_time,
      operator: t.operator,
      departureTimestamp: t.departure_timestamp,
      expiryMinutes: t.expiry_minutes,
      status: t.status,
      userPhone: t.user_phone,
    }));

    console.log(`✅ Loaded ${transactions.length} transactions from Supabase for ${normalizedPhone}`);
    return { success: true, transactions };
  } catch (error) {
    console.error('Error loading transactions from Supabase:', error);
    return { success: false, transactions: [], error: error.message };
  }
};

/**
 * Check if a ticket has already been used
 * @param {string} refNo - Transaction reference number
 * @returns {Promise<{isUsed: boolean, status: string|null, error?: string}>}
 */
export const checkTicketStatus = async (refNo) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('status')
      .eq('ref_no', refNo)
      .single();

    if (error) {
      // If table doesn't exist or no record found, assume not used
      if (error.code === 'PGRST116' || error.code === 'PGRST205') {
        return { isUsed: false, status: null };
      }
      console.error('Error checking ticket status:', error);
      return { isUsed: false, status: null, error: error.message };
    }

    return { 
      isUsed: data?.status === 'USED', 
      status: data?.status || null 
    };
  } catch (error) {
    console.error('Error checking ticket status:', error);
    return { isUsed: false, status: null, error: error.message };
  }
};

/**
 * Update transaction status in Supabase (e.g., mark as USED or EXPIRED)
 * @param {string} refNo - Transaction reference number
 * @param {string} status - New status (ACTIVE, EXPIRED, USED)
 * @returns {Promise<boolean>}
 */
export const updateTransactionStatusInSupabase = async (refNo, status) => {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('ref_no', refNo);

    if (error) {
      // Handle case where transactions table doesn't exist
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Transactions table not found - status update skipped');
        return true;
      }
      console.error('Error updating transaction status:', error);
      return false;
    }

    console.log(`✅ Transaction ${refNo} status updated to ${status}`);
    return true;
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return false;
  }
};

/**
 * Save a fare deduction transaction to Supabase (when conductor collects fare via QR)
 * @param {object} fareData - { passengerPhone, amount, origin, destination, conductorName, vehicleNo }
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const saveFareDeductionToSupabase = async (fareData) => {
  try {
    const refNo = `FARE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const insertData = {
      user_phone: fareData.passengerPhone,
      ref_no: refNo,
      transaction_type: 'FARE_DEDUCTION',
      amount: fareData.amount,
      origin: fareData.origin || 'N/A',
      destination: fareData.destination || 'N/A',
      passengers: fareData.passengers || 1,
      operator: fareData.conductorName || 'Conductor',
      status: 'COMPLETED',
      schedule_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      // Handle case where transactions table doesn't exist
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Transactions table not found - fare deduction saved locally only');
        return { success: true, data: { ...insertData, id: Date.now() }, tableNotFound: true, refNo };
      }
      console.error('Error saving fare deduction to Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Fare deduction saved to Supabase: ${refNo} for ₱${fareData.amount}`);
    return { success: true, data, refNo };
  } catch (error) {
    console.error('Error saving fare deduction to Supabase:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Load recent fare deductions for a passenger
 * @param {string} phoneNumber - Passenger's phone number
 * @param {number} limit - Number of records to fetch (default 10)
 * @returns {Promise<{success: boolean, deductions?: array, error?: string}>}
 */
export const loadFareDeductionsFromSupabase = async (phoneNumber, limit = 10) => {
  try {
    const normalizedPhone = phoneNumber.trim();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_phone', normalizedPhone)
      .eq('transaction_type', 'FARE_DEDUCTION')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Handle case where transactions table doesn't exist
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Transactions table not found - using local storage only');
        return { success: true, deductions: [], tableNotFound: true };
      }
      console.error('Error loading fare deductions from Supabase:', error);
      return { success: false, deductions: [], error: error.message };
    }

    // Convert database format to app format
    const deductions = (data || []).map(t => ({
      id: t.id.toString(),
      type: 'FARE_DEDUCTION',
      amount: parseFloat(t.amount),
      origin: t.origin,
      destination: t.destination,
      date: new Date(t.created_at).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      refNo: t.ref_no,
      conductor: t.operator,
      passengers: t.passengers,
    }));

    console.log(`✅ Loaded ${deductions.length} fare deductions from Supabase for ${normalizedPhone}`);
    return { success: true, deductions };
  } catch (error) {
    console.error('Error loading fare deductions from Supabase:', error);
    return { success: false, deductions: [], error: error.message };
  }
};

// ==================== CONDUCTOR FUNCTIONS ====================

/**
 * Get conductor by username from Supabase
 * @param {string} username - Conductor username
 * @returns {Promise<{exists: boolean, conductor?: object, error?: string}>}
 */
export const getConductorFromSupabase = async (username) => {
  try {
    const { data, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { exists: false, conductor: null };
      }
      // Handle table not found
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Conductors table not found');
        return { exists: false, conductor: null, tableNotFound: true };
      }
      // Handle column not found
      if (error.code === 'PGRST204' || error.message.includes('Could not find')) {
        console.log('ℹ️ Conductors table has missing columns');
        return { exists: false, conductor: null, tableNotFound: true };
      }
      throw error;
    }

    return { exists: true, conductor: data };
  } catch (error) {
    console.error('Error getting conductor from Supabase:', error);
    return { exists: false, conductor: null, error: error.message };
  }
};

/**
 * Update conductor MPIN in Supabase
 * @param {string} username - Conductor username
 * @param {string} mpinHash - Hashed MPIN (full 64-char SHA-256 hash)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateConductorMPINInSupabase = async (username, mpinHash) => {
  try {
    const { error } = await supabase
      .from('conductors')
      .update({ 
        mpin_hash: mpinHash,
        mpin_set: true 
      })
      .eq('username', username.toLowerCase());

    if (error) {
      // Handle table not found
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Conductors table not found - MPIN saved locally only');
        return { success: true, tableNotFound: true };
      }
      // Handle value too long error - save locally only
      if (error.message.includes('value too long')) {
        console.log('ℹ️ MPIN hash too long for database column - saved locally only');
        return { success: true, columnTooSmall: true };
      }
      throw error;
    }

    console.log(`✅ Conductor MPIN updated in Supabase: ${username}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating conductor MPIN:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify conductor MPIN from Supabase
 * @param {string} username - Conductor username
 * @param {string} mpinHash - Full MPIN hash to verify
 * @returns {Promise<{valid: boolean, conductor?: object, error?: string}>}
 */
export const verifyConductorMPINFromSupabase = async (username, mpinHash) => {
  try {
    const { data, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('username', username.toLowerCase())
      .eq('mpin_hash', mpinHash)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, error: 'Invalid MPIN' };
      }
      // Handle table not found
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Conductors table not found - verifying locally');
        return { valid: false, tableNotFound: true };
      }
      throw error;
    }

    if (!data) {
      return { valid: false, error: 'Invalid MPIN' };
    }

    console.log(`✅ Conductor MPIN verified: ${username}`);
    return { valid: true, conductor: data };
  } catch (error) {
    console.error('Error verifying conductor MPIN:', error);
    return { valid: false, error: error.message };
  }
};

/**
 * Update conductor profile details in Supabase
 * @param {string} username - Conductor username
 * @param {object} profileData - Profile data (address, birthdate, contact, email, last_name)
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const updateConductorProfileInSupabase = async (username, profileData) => {
  try {
    const updateData = {
      address: profileData.address || null,
      birthdate: profileData.birthdate || null,
      contact: profileData.contact || null,
      email: profileData.email || null,
    };
    
    // Add first_name and last_name if provided
    if (profileData.first_name !== undefined) {
      updateData.first_name = profileData.first_name || null;
    }
    if (profileData.last_name !== undefined) {
      updateData.last_name = profileData.last_name || null;
    }
    // Update full_name if first_name and last_name are provided
    if (profileData.first_name && profileData.last_name) {
      updateData.full_name = `${profileData.first_name} ${profileData.last_name}`.trim();
    }
    
    // Add updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // First, try to update existing conductor
    const { data, error } = await supabase
      .from('conductors')
      .update(updateData)
      .eq('username', username.toLowerCase())
      .select()
      .single();

    if (error) {
      // Handle table not found or column missing
      if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
        console.log('ℹ️ Conductors table not found - profile saved locally only');
        return { success: true, tableNotFound: true };
      }
      if (error.code === 'PGRST204' || error.message.includes('column')) {
        console.log('ℹ️ Some columns missing in conductors table - profile saved locally only');
        return { success: true, columnMissing: true };
      }
      // Handle "no rows" error - conductor doesn't exist in database yet
      // This is expected if conductors haven't been seeded in Supabase
      if (error.code === 'PGRST116') {
        console.log(`ℹ️ Conductor ${username} not found in Supabase database - profile saved locally only`);
        console.log('💡 Tip: Run SEED_CONDUCTOR_ACCOUNTS.sql in Supabase to create conductor accounts');
        return { success: true, conductorNotFound: true };
      }
      throw error;
    }

    if (!data) {
      // No rows updated - conductor doesn't exist
      console.log(`ℹ️ Conductor ${username} not found in Supabase - profile saved locally only`);
      return { success: true, conductorNotFound: true };
    }

    console.log(`✅ Conductor profile updated in Supabase: ${username}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error updating conductor profile:', error);
    return { success: false, error: error.message };
  }
};

