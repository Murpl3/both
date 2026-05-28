import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Clipboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { API_BASE_URL } from '../../config';
import { apiRequest } from '../../utils/apiClient';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import Card from '../../components/ui/Card';
import { PrimaryButton } from '../../components/ui/Buttons';

const RT = Colors.rapidTransit;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QR_SIZE = Math.min(SCREEN_WIDTH * 0.6, 240);

function formatSecretGroups(secret) {
  if (!secret) return '';
  return secret.replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') || secret;
}

const SetupTOTPScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { phoneNumber, mode } = route.params || {};
  const backendUrl = route.params?.backendUrl || API_BASE_URL || 'http://localhost:8000';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otpauthUri, setOtpauthUri] = useState('');
  const [secret, setSecret] = useState('');
  const [issuer, setIssuer] = useState('EzSakay');
  const [copyState, setCopyState] = useState('idle'); // idle | copied

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      try {
        const res = await apiRequest('/auth/totp/setup', {
          method: 'POST',
          baseUrl: backendUrl,
          body: { phone_number: phoneNumber },
        });
        if (!mounted) return;
        setOtpauthUri(res?.otpauth_uri || '');
        setSecret(res?.secret || '');
        setIssuer(res?.issuer || 'EzSakay');
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || 'Failed to start authenticator setup. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    setup();
    return () => {
      mounted = false;
    };
  }, [backendUrl, phoneNumber]);

  const handleCopySecret = () => {
    if (!secret) return;
    try {
      Clipboard.setString(secret);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // best-effort copy
    }
  };

  const handleContinue = () => {
    navigation.navigate('VerifyOTP', {
      phoneNumber,
      mode,
      backendUrl,
    });
  };

  return (
    <Screen>
      <AppHeader title="Set up authenticator" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scrollInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card radius="large" style={styles.card}>
          <Text style={styles.title}>Scan to add EzSakay</Text>
          <Text style={styles.subtitle}>
            Open Google Authenticator, Authy, or any compatible app, then scan
            the QR code below. Each code refreshes every 30 seconds.
          </Text>

          <View style={styles.qrWrap}>
            {loading ? (
              <ActivityIndicator size="large" color={RT.primary} />
            ) : error && !otpauthUri ? (
              <Feather name="alert-triangle" size={36} color={RT.primary} />
            ) : otpauthUri ? (
              <QRCode
                value={otpauthUri}
                size={QR_SIZE}
                backgroundColor={RT.qrFrameBg}
                color={RT.slate900}
              />
            ) : null}
          </View>

          {!!error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Text style={styles.helperLabel}>Can't scan? Enter this key manually:</Text>
          <TouchableOpacity
            style={styles.secretRow}
            onPress={handleCopySecret}
            activeOpacity={0.85}
            disabled={!secret}
          >
            <Text style={styles.secretText} numberOfLines={2}>
              {formatSecretGroups(secret) || '\u2014'}
            </Text>
            <Feather
              name={copyState === 'copied' ? 'check' : 'copy'}
              size={18}
              color={copyState === 'copied' ? RT.emerald600 : RT.slate500}
            />
          </TouchableOpacity>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Account</Text>
            <Text style={styles.metaValue} numberOfLines={1}>{phoneNumber || ''}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Issuer</Text>
            <Text style={styles.metaValue}>{issuer}</Text>
          </View>

          <PrimaryButton
            title="I've added it"
            onPress={handleContinue}
            disabled={loading || !otpauthUri}
            loading={loading}
          />

          <Text style={styles.footerHint}>
            On the next screen, enter the 6-digit code your authenticator
            app shows for EzSakay.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Math.min(SCREEN_WIDTH * 0.07, 28),
    paddingVertical: 24,
  },
  card: {
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: Math.min(SCREEN_WIDTH * 0.06, 24),
    fontFamily: FONTS.Poppins.black,
    color: RT.slate900,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.034, 14),
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  qrWrap: {
    alignSelf: 'center',
    width: QR_SIZE + 24,
    height: QR_SIZE + 24,
    borderRadius: 24,
    backgroundColor: RT.qrFrameBg,
    borderWidth: 1,
    borderColor: RT.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 12,
  },
  errorText: {
    color: RT.primaryDark,
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    textAlign: 'center',
    marginBottom: 12,
    backgroundColor: RT.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  helperLabel: {
    fontSize: 11,
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: RT.slate50,
    borderWidth: 1,
    borderColor: RT.slate100,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  secretText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: RT.slate900,
    letterSpacing: 1,
    marginRight: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: FONTS.Rubik.semiBold,
    color: RT.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: FONTS.Rubik.bold,
    color: RT.slate800,
    flexShrink: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  footerHint: {
    marginTop: 12,
    fontSize: 11,
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate400,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default SetupTOTPScreen;
