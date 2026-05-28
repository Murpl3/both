import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FONTS } from '../../fonts';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import Card from '../../components/ui/Card';
import { Colors } from '../../styles/designSystem';

const RT = Colors.rapidTransit;
import { apiRequest, getPassengerToken } from '../../utils/apiClient';

const STORAGE_KEY = 'pushNotificationsEnabled';
const TOKEN_STORAGE_KEY = 'expoPushToken';

export default function PushNotificationsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { backendUrl } = route.params || {};

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const restorePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          setPushNotificationsEnabled(stored === 'true');
        }
      } catch {
        // best-effort restore
      }
    };
    restorePreference();
  }, []);

  const togglePushNotifications = async (value) => {
    setPushNotificationsEnabled(value);
    setStatusMessage('');
    try {
      await AsyncStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore: in-memory state still updated
    }

    // If we have an Expo push token cached (registered elsewhere when
    // expo-notifications becomes available), inform the backend so it can
    // honour the user's preference. We never block UI on this.
    try {
      const expoToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (!expoToken) {
        setStatusMessage('Saved on device. Push notifications will sync once a device token is registered.');
        return;
      }

      const authToken = await getPassengerToken();
      if (!authToken) {
        setStatusMessage('Saved on device. Sign in to sync this preference with the server.');
        return;
      }

      setSyncing(true);
      await apiRequest('/push/devices', {
        method: 'POST',
        baseUrl: backendUrl,
        token: authToken,
        body: {
          expo_token: expoToken,
          platform: Platform.OS,
          enabled: value,
        },
      });
      setStatusMessage('Preference synced.');
    } catch (err) {
      setStatusMessage('Saved on device. Could not reach the server.');
      console.warn('Push preference sync failed:', err?.message || err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen padded={false}>
      <AppHeader title="Push notifications" subtitle="Control alerts" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.pagePad}>
          <Card padded={false} style={styles.toggleCard}>
            <View style={styles.toggleInner}>
              <View style={styles.toggleContent}>
                <Text style={styles.toggleTitle}>Push Notifications</Text>
                <Text style={styles.toggleDescription}>
                  Allow the app to send you notifications.
                </Text>
              </View>
              <Switch
                value={pushNotificationsEnabled}
                onValueChange={togglePushNotifications}
                disabled={syncing}
                trackColor={{ false: RT.switchTrackOff, true: RT.switchTrackOn }}
                thumbColor={pushNotificationsEnabled ? RT.white : RT.slate200}
                ios_backgroundColor={RT.switchTrackOff}
              />
            </View>
          </Card>

          {!!statusMessage && (
            <Text style={styles.statusText}>{statusMessage}</Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pagePad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  toggleCard: {
    overflow: 'hidden',
  },
  toggleInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  toggleContent: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontFamily: FONTS.Rubik.semiBold,
    color: RT.slate800,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate500,
    lineHeight: 16,
  },
  statusText: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: FONTS.Rubik.regular,
    color: RT.slate500,
    paddingHorizontal: 4,
  },
});
