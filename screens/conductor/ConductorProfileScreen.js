import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../../fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../styles/designSystem';
import Screen from '../../components/ui/Screen';
import AppHeader from '../../components/ui/AppHeader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ConductorProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [conductorName, setConductorName] = useState('');
  const [conductorEmail, setConductorEmail] = useState('');
  const [pushNotifications, setPushNotifications] = useState(true);

  useEffect(() => {
    loadConductorData();
  }, []);

  const loadConductorData = async () => {
    try {
      const conductorData = await AsyncStorage.getItem('conductor_data');
      if (conductorData) {
        const data = JSON.parse(conductorData);
        setConductorName(data.full_name || data.username || 'Conductor');
        setConductorEmail(data.email || 'conductor@ezsakay.com');
      }

      // Load notification preference
      const notifPref = await AsyncStorage.getItem('conductor_push_notifications');
      if (notifPref !== null) {
        setPushNotifications(JSON.parse(notifPref));
      }
    } catch (error) {
      console.error('Error loading conductor data:', error);
    }
  };

  const handleProfileDetails = () => {
    navigation.navigate('ConductorProfileDetails');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings page coming soon!');
  };

  const handlePushNotifications = async () => {
    const newValue = !pushNotifications;
    setPushNotifications(newValue);
    try {
      await AsyncStorage.setItem(
        'conductor_push_notifications',
        JSON.stringify(newValue)
      );
    } catch (error) {
      console.error('Error saving notification preference:', error);
    }
  };

  const handleHelp = () => {
    Alert.alert('Help', 'Help center coming soon!');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear conductor session data
              await AsyncStorage.removeItem('conductor_token');

              // Navigate back to welcome screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen variant="conductor" padded={false} style={styles.container}>
      <AppHeader title="Profile" subtitle="Conductor settings" variant="conductor" />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 30) + 105 }}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('../../assets/user.png')}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.profileName}>{conductorName}</Text>
          <Text style={styles.profileEmail}>{conductorEmail}</Text>
        </View>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleProfileDetails}
          >
            <View style={styles.menuIconContainer}>
              <Image
                source={require('../../assets/user.png')}
                style={styles.menuIcon}
              />
            </View>
            <Text style={styles.menuText}>Profile details</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleSettings}
          >
            <View style={styles.menuIconContainer}>
              <Image
                source={require('../../assets/setting.png')}
                style={styles.menuIcon}
              />
            </View>
            <Text style={styles.menuText}>Settings</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Image
                source={require('../../assets/bell.png')}
                style={styles.menuIcon}
              />
            </View>
            <Text style={styles.menuText}>Push Notifications</Text>
            <Switch
              value={pushNotifications}
              onValueChange={handlePushNotifications}
              trackColor={{ false: '#ddd', true: '#FFB366' }}
              thumbColor={pushNotifications ? Colors.conductor.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleHelp}
          >
            <View style={styles.menuIconContainer}>
              <Image
                source={require('../../assets/helpdesk.png')}
                style={styles.menuIcon}
              />
            </View>
            <Text style={styles.menuText}>Help</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <View style={styles.menuIconContainer}>
              <Image
                source={require('../../assets/logout.png')}
                style={styles.menuIcon}
              />
            </View>
            <Text style={styles.menuText}>Logout</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: Colors.conductor.primary,
    paddingVertical: SCREEN_HEIGHT * 0.022,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: Math.min(SCREEN_WIDTH * 0.042, 17),
    color: '#fff',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.conductor.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.conductor.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatar: {
    width: 44,
    height: 44,
    tintColor: '#fff',
  },
  profileName: {
    fontFamily: FONTS.Rubik.bold,
    fontSize: 20,
    color: '#2D2D2D',
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: FONTS.Rubik.medium,
    fontSize: 13,
    color: '#8A8A9A',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.conductor.ultraLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: Colors.conductor.border,
  },
  menuIcon: {
    width: 20,
    height: 20,
    tintColor: Colors.conductor.primary,
  },
  menuText: {
    flex: 1,
    fontFamily: FONTS.Rubik.medium,
    fontSize: 14,
    color: '#2D2D2D',
  },
  menuArrow: {
    fontSize: 20,
    color: '#B0B0C0',
    fontFamily: FONTS.Rubik.medium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F3F5',
    marginLeft: 56,
  },
});

export default ConductorProfileScreen;
