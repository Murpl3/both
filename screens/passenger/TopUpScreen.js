import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GCashLogo from '../../components/GCashLogo';
import MastercardLogo from '../../components/MastercardLogo';
import MayaLogo from '../../components/MayaLogo';
import PayMeLogo from '../../components/PayMeLogo';
import { API_BASE_URL } from '../../config';
import { apiRequest, getPassengerToken } from '../../utils/apiClient';
import { FONTS } from '../../fonts';
import { Colors, Shadows } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import TextField from '../../components/ui/TextField';
import { PrimaryButton, AmountChip } from '../../components/ui/Buttons';

const RT = Colors.rapidTransit;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRE_DEFINED_AMOUNTS = [50, 100, 200, 300, 500, 1000];

const PAYMENT_METHODS = [
  { id: 'GCASH', name: 'GCash', Logo: GCashLogo, available: false },
  { id: 'MAYA', name: 'Maya', Logo: MayaLogo, available: false },
  { id: 'MASTERCARD', name: 'Debit / Credit Card', Logo: MastercardLogo, available: false },
  { id: 'PAYME', name: 'PayMe', Logo: PayMeLogo, available: true },
];

export default function TopUpScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialBalance = route.params?.balance || 0.0;

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePreDefinedAmount = (val) => {
    setAmount(val.toString());
  };

  const handleAmountChange = (text) => {
    const numeric = text.replace(/[^0-9.]/g, '');
    setAmount(numeric);
  };

  const handleSelectMethod = (method) => {
    if (!method.available) {
      Alert.alert(
        'Coming Soon',
        `${method.name} integration is part of future enhancements. Please use PayMe to top up for now.`
      );
      return;
    }
    setSelectedMethod(method.id);
  };

  const generateRefNo = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let refNo = '';
    for (let i = 0; i < 8; i++) {
      refNo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return refNo;
  };

  const handleProceed = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to top up.');
      return;
    }
    if (numAmount < 10) {
      Alert.alert('Minimum Amount', 'Minimum top-up amount is \u20B110.00');
      return;
    }
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please choose how you want to pay.');
      return;
    }
    const chosen = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
    if (!chosen?.available) {
      Alert.alert(
        'Payment Method Unavailable',
        'Only PayMe is currently supported. Other gateways are part of future enhancements.'
      );
      return;
    }

    setLoading(true);
    try {
      const token = await getPassengerToken();
      if (!token) throw new Error('Not authenticated');

      const transaction_ref = generateRefNo();
      const backendUrl = route.params?.backendUrl || API_BASE_URL;

      const response = await apiRequest('/topup/', {
        method: 'POST',
        token,
        baseUrl: backendUrl,
        body: {
          amount: numAmount,
          payment_method: selectedMethod,
          transaction_ref,
        },
      });

      let newBalance = (balance || 0) + numAmount;
      if (response?.new_balance !== undefined) {
        newBalance = parseFloat(response.new_balance) || newBalance;
      }
      await AsyncStorage.setItem('walletBalance', newBalance.toFixed(2));
      setBalance(newBalance);

      Alert.alert(
        'Top-up Successful',
        `\u20B1${numAmount.toFixed(2)} has been added to your wallet.\n\nNew Balance: \u20B1${newBalance.toFixed(2)}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error('Top-up error:', err);
      Alert.alert('Top-up Failed', err?.message || 'Failed to process top-up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const numericAmount = parseFloat(amount) || 0;
  const canProceed = !!amount && numericAmount > 0 && !!selectedMethod && !loading;

  return (
    <Screen padded={false}>
      <AppHeader
        title="Top-Up Wallet"
        subtitle="Add funds to your account"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>
              {`\u20B1 ${Number(balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Amount</Text>
            <View style={styles.amountGrid}>
              {PRE_DEFINED_AMOUNTS.map((val) => {
                const isSelected = amount === val.toString();
                return (
                  <AmountChip
                    key={val}
                    label={`\u20B1${val}`}
                    selected={isSelected}
                    onPress={() => handlePreDefinedAmount(val)}
                    style={styles.amountChip}
                  />
                );
              })}
            </View>

            <TextField
              prefix={'\u20B1'}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="Enter custom amount"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.methodsList}>
              {PAYMENT_METHODS.map((method) => {
                const Logo = method.Logo;
                const isSelected = selectedMethod === method.id;
                const isAvailable = method.available;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.methodItem,
                      isSelected && styles.methodItemSelected,
                      !isAvailable && styles.methodItemDisabled,
                    ]}
                    onPress={() => handleSelectMethod(method)}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    <View
                      style={[
                        styles.methodIconBg,
                        !isAvailable && styles.methodIconBgDisabled,
                      ]}
                    >
                      <Logo width={32} height={20} />
                    </View>
                    <View style={styles.methodTextWrap}>
                      <Text
                        style={[
                          styles.methodName,
                          isSelected && styles.methodNameSelected,
                          !isAvailable && styles.methodNameDisabled,
                        ]}
                      >
                        {method.name}
                      </Text>
                      {!isAvailable && (
                        <Text style={styles.methodSub}>Coming soon</Text>
                      )}
                    </View>
                    <View
                      style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Payment</Text>
          <Text style={styles.totalValue}>{`\u20B1${numericAmount.toFixed(2)}`}</Text>
        </View>

        <PrimaryButton
          title="Confirm Top-Up"
          onPress={handleProceed}
          disabled={!canProceed}
          loading={loading}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 160,
  },
  balanceCard: {
    backgroundColor: RT.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 25,
    shadowColor: RT.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.Rubik.medium,
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    color: RT.white,
    fontFamily: FONTS.Rubik.bold,
    fontSize: 32,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.Rubik.bold,
    color: RT.slate800,
    marginBottom: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  amountChip: {
    width: (SCREEN_WIDTH - 64) / 3,
  },
  methodsList: {
    gap: 12,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RT.white,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: RT.slate200,
  },
  methodItemSelected: {
    borderColor: RT.primary,
    backgroundColor: RT.slate50,
  },
  methodIconBg: {
    width: 48,
    height: 48,
    backgroundColor: RT.slate100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIconBgDisabled: {
    opacity: 0.55,
  },
  methodTextWrap: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate600,
  },
  methodNameSelected: {
    color: RT.slate800,
    fontFamily: FONTS.Rubik.bold,
  },
  methodNameDisabled: {
    color: RT.slate400,
  },
  methodSub: {
    marginTop: 2,
    fontFamily: FONTS.Rubik.medium,
    fontSize: 11,
    color: RT.slate400,
  },
  methodItemDisabled: {
    backgroundColor: RT.slate50,
    borderColor: RT.slate100,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: RT.slate300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: RT.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RT.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: RT.white,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: RT.slate100,
    ...Shadows.medium,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
  },
  totalValue: {
    fontSize: 24,
    fontFamily: FONTS.Rubik.bold,
    color: RT.primary,
  },
});
