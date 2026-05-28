import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  RefreshControl,
  AppState,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '../../fonts';
import { verifyWalletDataOwnership, associateWalletWithUser, clearWalletData } from '../../utils/walletUtils';
import { Colors, Shadows, scaleFont } from '../../styles/designSystem';
import { apiRequest, getPassengerToken } from '../../utils/apiClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BALANCE_SYNC_INTERVAL = 10000;
const RT = Colors.rapidTransit;

const QUICK_SERVICES = [
  { id: 'bus', label: 'Book Bus', icon: 'truck' },
  { id: 'wallet', label: 'E-Wallet', icon: 'credit-card' },
  { id: 'schedule', label: 'Schedules', icon: 'clock' },
  { id: 'history', label: 'History', icon: 'rotate-ccw' },
];

const QUICK_COLORS = [RT.blue600, RT.emerald600, RT.orange500, RT.violet600];

export default function HomeScreen({ navigation }) {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(route.params?.user || null);
  const [balance, setBalance] = useState(0.0);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [topUps, setTopUps] = useState([]);
  const [fareDeductions, setFareDeductions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [unreadTopupsCount, setUnreadTopupsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const appState = useRef(AppState.currentState);
  const balanceIntervalRef = useRef(null);

  useEffect(() => {
    loadUserData();
    loadBalance();
    loadTopUps();
    loadFareDeductions();

    balanceIntervalRef.current = setInterval(() => {
      syncBalanceFromDatabase();
      loadFareDeductions();
    }, BALANCE_SYNC_INTERVAL);

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      syncBalanceFromDatabase();
    }
    appState.current = nextAppState;
  };

  const syncBalanceFromDatabase = async () => {
    try {
      const token = await getPassengerToken();
      if (!token) return;
      const wallet = await apiRequest('/wallet/me', { method: 'GET', token });
      const newBalance = parseFloat(wallet?.balance) || 0;
      if (Math.abs(newBalance - balance) > 0.001) {
        await AsyncStorage.setItem('walletBalance', newBalance.toFixed(2));
        setBalance(newBalance);
      }
    } catch (error) {
      // Silent fail for background sync
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBalance(), loadTopUps(), loadFareDeductions()]);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBalance();
      loadTopUps();
      loadFareDeductions();
      const timer = setTimeout(() => {
        markTopupsAsRead();
      }, 1000);
      return () => clearTimeout(timer);
    }, [])
  );

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadBalance = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;
      const currentUserPhone = currentUser?.phone_number;

      if (currentUserPhone) {
        await verifyWalletDataOwnership(currentUserPhone);
        await associateWalletWithUser(currentUserPhone);
      } else {
        await clearWalletData();
      }

      const token = await getPassengerToken();
      if (token) {
        try {
          const wallet = await apiRequest('/wallet/me', { method: 'GET', token });
          const newBalance = parseFloat(wallet?.balance) || 0;
          await AsyncStorage.setItem('walletBalance', newBalance.toFixed(2));
          setBalance(newBalance);
          return;
        } catch {}
      }

      const storedBalance = await AsyncStorage.getItem('walletBalance');
      setBalance(storedBalance ? parseFloat(storedBalance) : 0.0);
    } catch (error) {
      console.error('Error loading balance:', error);
      setBalance(0.0);
    }
  };

  const loadTopUps = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;
      const currentUserPhone = currentUser?.phone_number;

      if (!currentUserPhone) {
        setTopUps([]);
        setUnreadTopupsCount(0);
        return;
      }

      const topupOwnerPhone = await AsyncStorage.getItem('topupOwnerPhone');
      if (topupOwnerPhone && topupOwnerPhone.trim() !== currentUserPhone.trim()) {
        await AsyncStorage.removeItem('topups');
        await AsyncStorage.setItem('topupOwnerPhone', currentUserPhone.trim());
        setTopUps([]);
        setUnreadTopupsCount(0);
        return;
      }

      if (!topupOwnerPhone) {
        await AsyncStorage.setItem('topupOwnerPhone', currentUserPhone.trim());
      }

      const topupsJson = await AsyncStorage.getItem('topups');
      if (topupsJson) {
        const allTopups = JSON.parse(topupsJson);
        const walletOwnerPhone = await AsyncStorage.getItem('walletOwnerPhone');

        const userTopups = allTopups.filter((topup) => {
          if (topup.userPhone) {
            return topup.userPhone.trim() === currentUserPhone.trim();
          }
          if (walletOwnerPhone && walletOwnerPhone.trim() === currentUserPhone.trim()) {
            return true;
          }
          return false;
        });

        const readTopupsKey = `readTopups_${currentUserPhone.trim()}`;
        const readTopupsJson = await AsyncStorage.getItem(readTopupsKey);
        const readTopups = readTopupsJson ? JSON.parse(readTopupsJson) : [];
        const unreadCount = userTopups.filter(topup => !readTopups.includes(topup.id)).length;
        setUnreadTopupsCount(unreadCount);
        setTopUps(userTopups.slice(0, 3));
      } else {
        setTopUps([]);
        setUnreadTopupsCount(0);
      }
    } catch (error) {
      console.error('Error loading top-ups:', error);
      setTopUps([]);
      setUnreadTopupsCount(0);
    }
  };

  const loadFareDeductions = async () => {
    try {
      const token = await getPassengerToken();
      if (!token) {
        setFareDeductions([]);
        return;
      }
      const wallet = await apiRequest('/wallet/me', { method: 'GET', token });
      const ledger = wallet?.last_ledger || [];
      // Backend records ticket purchases as 'TICKET_PURCHASE' (and may use
      // 'FARE_DEDUCTION' in the future). Match both so the Home feed isn't empty.
      const fare = ledger.filter(
        (e) => e.type === 'TICKET_PURCHASE' || e.type === 'FARE_DEDUCTION'
      );
      setFareDeductions(fare.slice(0, 5));
    } catch (error) {
      console.error('Error loading fare deductions:', error);
      setFareDeductions([]);
    }
  };

  useEffect(() => {
    // Normalise to a single sortable timestamp because top-ups carry
    // a stringified `date` field while ledger entries carry `createdAt`.
    const toMillis = (item) => {
      const raw = item?.createdAt || item?.date;
      if (!raw) return 0;
      const ms = new Date(raw).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };

    const combinedActivity = [
      ...topUps.map(t => ({ ...t, activityType: 'TOPUP' })),
      ...fareDeductions.map(f => ({ ...f, activityType: 'FARE' })),
    ];
    combinedActivity.sort((a, b) => toMillis(b) - toMillis(a));
    setRecentActivity(combinedActivity.slice(0, 5));
  }, [topUps, fareDeductions]);

  const markTopupsAsRead = async () => {
    try {
      if (topUps.length === 0) return;
      const userData = await AsyncStorage.getItem('user');
      const currentUser = userData ? JSON.parse(userData) : null;
      const currentUserPhone = currentUser?.phone_number;
      if (!currentUserPhone) return;

      const readTopupsKey = `readTopups_${currentUserPhone.trim()}`;
      const readTopupsJson = await AsyncStorage.getItem(readTopupsKey);
      const readTopups = readTopupsJson ? JSON.parse(readTopupsJson) : [];
      const newReadTopups = [...readTopups];
      topUps.forEach(topup => {
        if (topup.id && !newReadTopups.includes(topup.id)) {
          newReadTopups.push(topup.id);
        }
      });
      await AsyncStorage.setItem(readTopupsKey, JSON.stringify(newReadTopups));
      setUnreadTopupsCount(0);
    } catch (error) {
      console.error('Error marking topups as read:', error);
    }
  };

  const getUserName = () => {
    if (user?.first_name) return user.first_name;
    if (user?.nickname) return user.nickname;
    return 'Passenger';
  };

  const handleServicePress = (serviceId) => {
    if (serviceId === 'bus') navigation.navigate('Trip');
    if (serviceId === 'wallet') navigation.navigate('TopUp');
    if (serviceId === 'schedule') navigation.navigate('Trip');
    if (serviceId === 'history') navigation.navigate('Transaction');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['user', 'token', 'mpin_set']);
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const initial = (getUserName() || 'P').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <LinearGradient colors={RT.avatarGradient} style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>
          <View>
            <Text style={styles.welcomeLabel}>Passenger Portal</Text>
            <Text style={styles.userName}>Welcome, {getUserName()}!</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Feather name="log-out" size={18} color={RT.slate400} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 30) + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[RT.primary]}
            tintColor={RT.primary}
          />
        }
      >
        <View style={styles.walletCard}>
          <TouchableOpacity
            style={styles.walletCardTap}
            onPress={() => navigation.navigate('PassengerQR')}
            activeOpacity={0.92}
          >
            <View style={styles.walletCardTop}>
              <View>
                <Text style={styles.walletLabel}>E-Wallet Balance</Text>
                <Text style={styles.walletAmount}>
                  ₱{balanceVisible ? balance.toFixed(2) : '••••••'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBalanceVisible(!balanceVisible)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name={balanceVisible ? 'eye' : 'eye-off'} size={20} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          <View style={styles.walletFooter}>
            <TouchableOpacity
              style={styles.addFundsBtn}
              onPress={() => navigation.navigate('TopUp')}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={14} color="rgba(255,255,255,0.95)" />
              <Text style={styles.addFundsText}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.qrFab}
              onPress={() => navigation.navigate('PassengerQR')}
              activeOpacity={0.85}
            >
              <Feather name="grid" size={24} color={RT.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.walletGlow1} />
          <View style={styles.walletGlow2} />
        </View>

        <View style={styles.servicesGrid}>
          {QUICK_SERVICES.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={styles.serviceItem}
              onPress={() => handleServicePress(item.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.serviceIconCircle, { backgroundColor: QUICK_COLORS[idx] }]}>
                <Feather name={item.icon} size={22} color={RT.white} />
              </View>
              <Text style={styles.serviceLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>Your Activity</Text>
            {(unreadTopupsCount > 0 || fareDeductions.length > 0) ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {(unreadTopupsCount + fareDeductions.length) > 9 ? '9+' : (unreadTopupsCount + fareDeductions.length)}
                </Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => navigation.navigate('Transaction')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 3).map((activity, index) => (
              <View key={activity.id || index} style={styles.activityCard}>
                <View style={styles.activityCardRow}>
                  <View
                    style={[
                      styles.activityIconCircle,
                      { backgroundColor: activity.activityType === 'TOPUP' ? RT.emerald50 : RT.primarySoft },
                    ]}
                  >
                    <Feather
                      name={activity.activityType === 'TOPUP' ? 'arrow-down-left' : 'truck'}
                      size={20}
                      color={activity.activityType === 'TOPUP' ? RT.emerald600 : RT.primary}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityPrimary} numberOfLines={1}>
                      {activity.activityType === 'FARE' && activity.origin
                        ? `${activity.origin} → ${activity.destination}`
                        : activity.activityType === 'TOPUP'
                          ? 'Wallet Top-up'
                          : 'Fare payment'}
                    </Text>
                    <Text style={styles.activityDate}>{activity.date}</Text>
                  </View>
                  <Text
                    style={[
                      styles.activityAmount,
                      activity.activityType === 'TOPUP' ? styles.amountGreen : styles.amountDark,
                    ]}
                  >
                    {activity.activityType === 'TOPUP' ? '+' : '-'}₱{Number(activity.amount).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Feather name="credit-card" size={32} color={RT.slate300} />
              <Text style={styles.emptyText}>No recent transactions</Text>
              <Text style={styles.emptySubtext}>Top up your wallet to get started!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RT.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: RT.white,
    borderBottomWidth: 1,
    borderBottomColor: RT.slate50,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: RT.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: FONTS.Poppins.bold,
    color: RT.white,
  },
  welcomeLabel: {
    fontSize: scaleFont(9),
    fontFamily: FONTS.Poppins.black,
    color: RT.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  userName: {
    fontSize: scaleFont(17),
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate900,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: RT.slate50,
    borderWidth: 1,
    borderColor: RT.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingHorizontal: 16 },

  walletCard: {
    backgroundColor: RT.walletDark,
    borderRadius: 40,
    padding: 28,
    marginBottom: 22,
    overflow: 'hidden',
    ...Shadows.medium,
    shadowColor: RT.slate900,
  },
  walletCardTap: {
    marginBottom: 4,
  },
  walletCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletLabel: {
    fontSize: 10,
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate400,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  walletAmount: {
    fontSize: scaleFont(30),
    fontFamily: FONTS.Poppins.black,
    color: RT.white,
    letterSpacing: -0.5,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  addFundsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  addFundsText: {
    fontSize: 10,
    fontFamily: FONTS.Poppins.bold,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  qrFab: {
    backgroundColor: RT.white,
    padding: 14,
    borderRadius: 18,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  walletGlow1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: -1,
  },
  walletGlow2: {
    position: 'absolute',
    bottom: -16,
    right: -16,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: RT.walletAccentBlob,
    zIndex: -1,
  },

  servicesGrid: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  serviceItem: {
    flex: 1,
    alignItems: 'center',
  },
  serviceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceLabel: {
    fontSize: scaleFont(10),
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  activitySection: { marginBottom: 20 },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  activityTitle: {
    fontSize: scaleFont(12),
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate900,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  badge: {
    backgroundColor: RT.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: RT.white,
    fontSize: 10,
    fontFamily: FONTS.Rubik.bold,
  },
  viewAllLink: {
    fontSize: scaleFont(10),
    fontFamily: FONTS.Poppins.bold,
    color: RT.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  activityCard: {
    backgroundColor: RT.white,
    borderRadius: 24,
    padding: 16,
    marginBottom: 10,
    ...Shadows.small,
    borderWidth: 1,
    borderColor: RT.slate100,
  },
  activityCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityInfo: { flex: 1, minWidth: 0 },
  activityPrimary: {
    fontSize: scaleFont(13),
    fontFamily: FONTS.Rubik.bold,
    color: RT.slate900,
  },
  activityDate: {
    fontSize: scaleFont(10),
    fontFamily: FONTS.Rubik.bold,
    color: RT.slate400,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  activityAmount: {
    fontSize: scaleFont(14),
    fontFamily: FONTS.Poppins.bold,
    marginLeft: 8,
  },
  amountGreen: { color: RT.emerald600 },
  amountDark: { color: RT.slate900 },

  emptyActivity: {
    backgroundColor: RT.white,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RT.slate200,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyText: {
    fontSize: scaleFont(14),
    fontFamily: FONTS.Rubik.semiBold,
    color: RT.slate500,
  },
  emptySubtext: {
    fontSize: scaleFont(12),
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate400,
  },
});
