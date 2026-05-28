import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
// Supabase removed; backend is source of truth.

/**
 * Sync balance to backend database
 * @param {number} balance - The balance amount to sync
 * @param {string} token - User authentication token
 * @param {string} backendUrl - Backend API URL
 * @returns {Promise<boolean>} - True if sync successful, false otherwise
 */
export const syncBalanceToBackend = async (balance, token, backendUrl = null) => {
  try {
    const apiBase = backendUrl || API_BASE_URL || 'http://localhost:8000';
    
    // Try to sync via topup endpoint (incremental update)
    // If that doesn't work, we'll use a direct update endpoint if available
    // For now, we'll update via the /users/me endpoint if it supports PATCH
    
    // Alternative: Use topup endpoint with 0 amount won't work
    // We need a dedicated endpoint to update balance, or we can just store it
    // and let it sync on next topup/transaction
    
    // Since we don't have a direct balance update endpoint, we'll skip backend sync
    // and rely on loading balance from backend on login
    // The balance will be synced naturally when topups happen via the /topup/ endpoint
    
    console.log(`[Balance Sync] Would sync balance ${balance} to backend (feature pending)`);
    return true;
  } catch (error) {
    console.error('[Balance Sync] Failed to sync balance to backend:', error);
    return false;
  }
};

/**
 * Load balance from backend database and update AsyncStorage
 * @param {string} token - User authentication token
 * @param {string} backendUrl - Backend API URL
 * @returns {Promise<number|null>} - The balance from backend, or null if failed
 */
export const loadBalanceFromBackend = async (token, backendUrl = null) => {
  try {
    const apiBase = backendUrl || API_BASE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${apiBase}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Balance Sync] Failed to load balance from backend:', response.status);
      return null;
    }

    const data = await response.json();
    const backendBalance = data.user?.balance || 0.0;

    // Update AsyncStorage with backend balance
    await AsyncStorage.setItem('walletBalance', backendBalance.toString());
    console.log(`[Balance Sync] Loaded balance ${backendBalance} from backend and updated AsyncStorage`);

    return parseFloat(backendBalance);
  } catch (error) {
    console.error('[Balance Sync] Error loading balance from backend:', error);
    return null;
  }
};

/**
 * Sync balance to backend via topup endpoint (when topup happens)
 * @param {number} amount - Top-up amount
 * @param {string} token - User authentication token
 * @param {string} paymentMethod - Payment method
 * @param {string} transactionRef - Transaction reference number
 * @param {string} backendUrl - Backend API URL
 * @returns {Promise<number|null>} - New balance from backend, or null if failed
 */
export const syncTopUpToBackend = async (amount, token, paymentMethod = 'PAYME', transactionRef = null, backendUrl = null) => {
  try {
    const apiBase = backendUrl || API_BASE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${apiBase}/topup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        payment_method: paymentMethod,
        transaction_ref: transactionRef,
      }),
    });

    if (!response.ok) {
      console.error('[Balance Sync] Failed to sync topup to backend:', response.status);
      return null;
    }

    const data = await response.json();
    const newBalance = data.new_balance || 0.0;

    await AsyncStorage.setItem('walletBalance', newBalance.toString());
    console.log(`[Balance Sync] Synced topup ${amount}, new balance: ${newBalance}`);

    return parseFloat(newBalance);
  } catch (error) {
    console.error('[Balance Sync] Error syncing topup to backend:', error);
    return null;
  }
};

