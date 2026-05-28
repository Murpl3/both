import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  verifyWalletDataOwnership,
  associateWalletWithUser,
  clearWalletData,
} from '../../utils/walletUtils';
import { apiRequest, getPassengerToken } from '../../utils/apiClient';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import WalletHeroCard from '../../components/ui/WalletHeroCard';
import { EmptyState } from '../../components/ui/States';

const RT = Colors.rapidTransit;
const BALANCE_SYNC_INTERVAL = 10000;
const MAX_VISIBLE_CARDS = 3;

export default function WalletScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(0.0);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const appState = useRef(AppState.currentState);
  const balanceIntervalRef = useRef(null);

  useEffect(() => {
    balanceIntervalRef.current = setInterval(() => {
      syncBalanceFromDatabase();
    }, BALANCE_SYNC_INTERVAL);

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current);
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
    } catch {}
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setShowAll(false);
    await loadWalletData();
    setRefreshing(false);
  }, []);

  const loadWalletData = async () => {
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
        } catch {
          const storedBalance = await AsyncStorage.getItem('walletBalance');
          setBalance(storedBalance ? parseFloat(storedBalance) : 0.0);
        }
      }

      const topupsJson = await AsyncStorage.getItem('topups');
      if (topupsJson) {
        const allTopups = JSON.parse(topupsJson);
        const walletOwnerPhone = await AsyncStorage.getItem('walletOwnerPhone');

        const userTopups = allTopups.filter((topup) => {
          if (topup.userPhone) {
            return topup.userPhone.trim() === currentUserPhone?.trim();
          }
          if (walletOwnerPhone && walletOwnerPhone.trim() === currentUserPhone?.trim()) {
            return true;
          }
          return false;
        });

        const formatted = userTopups.map((topup) => ({
          id: topup.id.toString(),
          type: 'TOP-UP',
          description: 'Deposited money to EzSakay Wallet',
          amount: topup.amount,
          date: topup.date,
        }));
        setTransactions(formatted);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading wallet data:', err);
      setBalance(0.0);
      setTransactions([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setShowAll(false);
      loadWalletData();
    }, [])
  );

  const handleTopUp = () => navigation.navigate('TopUp', { balance });
  const handleQr = () => navigation.navigate('PassengerQR');

  const visible = showAll ? transactions : transactions.slice(0, MAX_VISIBLE_CARDS);

  return (
    <Screen padded={false}>
      <AppHeader
        title="Wallet"
        subtitle="Balance and top-ups"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 30) + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[RT.primary]}
            tintColor={RT.primary}
          />
        }
      >
        <WalletHeroCard
          balance={balance}
          visible={balanceVisible}
          onToggleVisible={() => setBalanceVisible((v) => !v)}
          onPressTopUp={handleTopUp}
          onPressQr={handleQr}
          style={styles.hero}
        />

        <Text style={styles.sectionTitle}>Latest Transactions</Text>

        {transactions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState title="No top-ups yet" subtitle="Your top-up history will appear here." />
          </View>
        ) : (
          <>
            {visible.map((tx) => (
              <View key={tx.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <Feather name="arrow-down-left" size={20} color={RT.emerald600} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{tx.description}</Text>
                  <Text style={styles.rowDate}>{tx.date}</Text>
                </View>
                <Text style={styles.rowAmount}>+\u20B1{Number(tx.amount).toFixed(2)}</Text>
              </View>
            ))}

            {transactions.length > MAX_VISIBLE_CARDS && (
              <TouchableOpacity
                style={styles.viewMoreBtn}
                onPress={() => setShowAll(!showAll)}
                activeOpacity={0.85}
              >
                <Text style={styles.viewMoreText}>
                  {showAll
                    ? 'Show Less'
                    : `View More (${transactions.length - MAX_VISIBLE_CARDS} more)`}
                </Text>
                <Feather
                  name={showAll ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={RT.primary}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  hero: { marginBottom: 22 },
  sectionTitle: {
    fontFamily: FONTS.Poppins.black,
    fontSize: 12,
    color: RT.slate900,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
    marginLeft: 4,
  },
  emptyWrap: {
    backgroundColor: RT.white,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RT.slate100,
    borderStyle: 'dashed',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RT.slate50,
    borderWidth: 1,
    borderColor: RT.slate100,
    borderRadius: 24,
    padding: 14,
    marginBottom: 10,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: RT.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 13,
    color: RT.slate900,
  },
  rowDate: {
    marginTop: 2,
    fontFamily: FONTS.Rubik.medium,
    fontSize: 11,
    color: RT.slate400,
  },
  rowAmount: {
    fontFamily: FONTS.Poppins.black,
    fontSize: 14,
    color: RT.emerald600,
    marginLeft: 8,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RT.primarySoft,
    borderWidth: 1,
    borderColor: RT.primarySoftBorder,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  viewMoreText: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 13,
    color: RT.primary,
  },
});
