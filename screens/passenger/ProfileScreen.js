import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONTS } from '../../fonts';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';
import Card from '../../components/ui/Card';

const RT = Colors.rapidTransit;

const MENU = [
  { id: 'details', label: 'Profile details', icon: 'user', tone: 'slate' },
  { id: 'notifications', label: 'Push Notifications', icon: 'bell', tone: 'slate' },
  { id: 'help', label: 'Help', icon: 'help-circle', tone: 'slate' },
  { id: 'logout', label: 'Logout', icon: 'log-out', tone: 'danger' },
];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const getUserName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) return user.first_name;
    if (user?.nickname) return user.nickname;
    return 'User';
  };

  const getUserEmail = () => user?.email || 'user@example.com';

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Proceed to log out?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['user', 'token', 'mpin_set']);
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } catch (err) {
              console.error('Logout error:', err);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handlePress = (id) => {
    if (id === 'details') navigation.navigate('ProfileDetails', { user });
    else if (id === 'notifications') navigation.navigate('PushNotifications');
    else if (id === 'logout') handleLogout();
  };

  const initial = (getUserName() || 'P').charAt(0).toUpperCase();

  return (
    <Screen padded={false}>
      <AppHeader
        title="Profile"
        subtitle="Account & preferences"
        onBack={() => navigation.navigate('Home')}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 30) + 100 }]}
      >
        <Card radius="card" style={styles.profile}>
          <View style={styles.avatarRing}>
            <LinearGradient colors={RT.avatarGradient} style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{getUserName()}</Text>
          <Text style={styles.userEmail}>{getUserEmail()}</Text>
        </Card>

        <View style={styles.menuList}>
          {MENU.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.row}
              onPress={() => handlePress(item.id)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.rowIcon,
                  item.tone === 'danger' && styles.rowIconDanger,
                ]}
              >
                <Feather
                  name={item.icon}
                  size={18}
                  color={item.tone === 'danger' ? RT.primary : RT.slate600}
                />
              </View>
              <Text
                style={[
                  styles.rowLabel,
                  item.tone === 'danger' && styles.rowLabelDanger,
                ]}
              >
                {item.label}
              </Text>
              <Feather name="chevron-right" size={18} color={RT.slate400} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  profile: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 18,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 36,
    padding: 4,
    backgroundColor: RT.slate900,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: RT.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  avatar: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontFamily: FONTS.Poppins.black,
    color: RT.white,
  },
  userName: {
    fontSize: 18,
    fontFamily: FONTS.Poppins.bold,
    color: RT.slate900,
  },
  userEmail: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONTS.Rubik.medium,
    color: RT.slate500,
  },
  menuList: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RT.slate50,
    borderWidth: 1,
    borderColor: RT.slate100,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: RT.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIconDanger: {
    backgroundColor: RT.primarySoft,
  },
  rowLabel: {
    flex: 1,
    fontFamily: FONTS.Rubik.bold,
    fontSize: 14,
    color: RT.slate800,
  },
  rowLabelDanger: {
    color: RT.primary,
  },
});
