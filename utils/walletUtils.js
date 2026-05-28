import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Clear wallet data (balance, transactions) but preserve topups
 * Topups should only be cleared when app is uninstalled
 */
export const clearWalletData = async () => {
  try {
    await AsyncStorage.multiRemove([
      'walletBalance',
      'transactions',
      'walletOwnerPhone', // Store which user owns this wallet data
      // NOTE: 'topups' is NOT cleared - it persists across account deletion and logout
    ]);
    await AsyncStorage.setItem('walletBalance', '0.00');
    console.log('✅ Wallet data cleared (topups preserved)');
  } catch (error) {
    console.error('Error clearing wallet data:', error);
  }
};

/**
 * Clear ALL user data including topups - for new account creation
 * This ensures a completely fresh start when creating a new account
 * @param {string} phoneNumber - New user's phone number to associate
 */
export const clearAllUserData = async (phoneNumber) => {
  try {
    await AsyncStorage.multiRemove([
      'walletBalance',
      'transactions',
      'transactionOwnerPhone',
      'walletOwnerPhone',
      'topups',           // Clear topups for fresh start
      'topupOwnerPhone',  // Clear topup ownership
      'lastReadTopupId',  // Clear read status
    ]);
    await AsyncStorage.setItem('walletBalance', '0.00');
    
    // Associate with new user
    if (phoneNumber) {
      const normalizedPhone = phoneNumber.trim();
      await AsyncStorage.setItem('walletOwnerPhone', normalizedPhone);
      await AsyncStorage.setItem('transactionOwnerPhone', normalizedPhone);
      await AsyncStorage.setItem('topupOwnerPhone', normalizedPhone);
    }
    
    console.log('✅ All user data cleared for fresh start (including topups)');
  } catch (error) {
    console.error('Error clearing all user data:', error);
  }
};

/**
 * Verify wallet data belongs to current user, clear if not
 * @param {string} currentUserPhone - Current logged-in user's phone number
 * @returns {Promise<boolean>} - True if wallet data is valid for this user
 */
export const verifyWalletDataOwnership = async (currentUserPhone) => {
  try {
    if (!currentUserPhone) {
      // No user logged in - clear wallet data
      await clearWalletData();
      return false;
    }

    const normalizedPhone = currentUserPhone.trim();
    const walletOwnerPhone = await AsyncStorage.getItem('walletOwnerPhone');

    // If owner exists and doesn't match current user → different user, clear wallet data
    if (walletOwnerPhone && walletOwnerPhone !== normalizedPhone) {
      console.log('🔄 Different user detected - clearing wallet data for fresh start');
      await clearWalletData();
      await AsyncStorage.setItem('walletOwnerPhone', normalizedPhone);
      return false;
    }

    // If no owner stored → check context:
    // - If wallet data exists with balance > 0 → might be existing user, preserve and associate
    // - If wallet data is empty or 0 → new user, associate fresh
    if (!walletOwnerPhone) {
      const existingBalance = await AsyncStorage.getItem('walletBalance');
      const balanceValue = existingBalance ? parseFloat(existingBalance) : 0;
      
      // Only preserve if there's significant wallet data (balance > 0)
      // This handles the case where user logged out and logs back in
      if (balanceValue > 0) {
        // Check if there are transactions or topups too
        const existingTopups = await AsyncStorage.getItem('topups');
        const existingTransactions = await AsyncStorage.getItem('transactions');
        const hasWalletActivity = existingTopups || existingTransactions;
        
        if (hasWalletActivity) {
          console.log('✅ Existing wallet data found - associating with current user (preserving data)');
          await AsyncStorage.setItem('walletOwnerPhone', normalizedPhone);
          return true;
        }
      }
      
      // No significant wallet data - associate fresh
      await AsyncStorage.setItem('walletOwnerPhone', normalizedPhone);
      return true;
    }

    // Owner matches current user
    return true;
  } catch (error) {
    console.error('Error verifying wallet data ownership:', error);
    // On error, don't clear - just try to associate
    if (currentUserPhone) {
      try {
        await AsyncStorage.setItem('walletOwnerPhone', currentUserPhone.trim());
      } catch (e) {
        console.error('Error associating wallet on error:', e);
      }
    }
    return true; // Return true to preserve existing data on error
  }
};

/**
 * Associate wallet data with a user (call when user logs in or creates account)
 * @param {string} userPhone - User's phone number
 */
export const associateWalletWithUser = async (userPhone) => {
  try {
    const normalizedPhone = userPhone.trim();
    await AsyncStorage.setItem('walletOwnerPhone', normalizedPhone);
    console.log(`✅ Wallet data associated with user: ${normalizedPhone}`);
  } catch (error) {
    console.error('Error associating wallet with user:', error);
  }
};

