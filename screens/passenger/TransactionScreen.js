import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { FONTS } from '../../fonts';
import { apiRequest, getPassengerToken } from '../../utils/apiClient';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import { EmptyState } from '../../components/ui/States';

const RT = Colors.rapidTransit;
const MAX_VISIBLE_CARDS = 5;

export default function TransactionScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const token = await getPassengerToken();
      if (!token) {
        setTransactions([]);
        return;
      }
      const tickets = await apiRequest('/tickets', { method: 'GET', token });
      const mapped = (tickets || []).map((t) => ({
        id: String(t.id),
        type: 'TICKET',
        description: `${t.origin} \u2192 ${t.destination}`,
        amount: parseFloat(t.fare_amount) || 0,
        date: t.created_at,
        refNo: t.ref_no,
        origin: t.origin,
        destination: t.destination,
        passengers: t.passengers,
        schedule: t.departure_time,
        status: t.status,
        serviceDate: t.service_date,
      }));
      setTransactions(mapped);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setShowAll(false);
      loadTransactions();
    }, [])
  );

  const visible = showAll ? transactions : transactions.slice(0, MAX_VISIBLE_CARDS);

  return (
    <Screen padded={false}>
      <AppHeader
        title="Transactions"
        subtitle="Tap a transaction to view ticket"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 30) + 100 },
        ]}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={RT.primary} />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              title="No transactions yet"
              subtitle="Your completed bookings will appear here."
            />
          </View>
        ) : (
          <>
            {visible.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={styles.row}
                onPress={() => navigation.navigate('TicketDetails', { transaction: tx })}
                activeOpacity={0.85}
              >
                <View style={styles.rowIcon}>
                  <Feather name="truck" size={20} color={RT.primary} />
                </View>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {tx.description}
                  </Text>
                  <Text style={styles.rowDate} numberOfLines={1}>
                    {tx.date}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowAmount}>
                    -\u20B1{Number(tx.amount).toFixed(2)}
                  </Text>
                  <Feather name="chevron-right" size={16} color={RT.slate400} />
                </View>
              </TouchableOpacity>
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
    backgroundColor: RT.primarySoft,
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
  },
  rowAmount: {
    fontFamily: FONTS.Poppins.black,
    fontSize: 13,
    color: RT.slate900,
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
  emptyWrap: {
    backgroundColor: RT.white,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RT.slate100,
    borderStyle: 'dashed',
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
  },
});
