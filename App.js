import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { 
  Poppins_100Thin,
  Poppins_100Thin_Italic,
  Poppins_200ExtraLight,
  Poppins_200ExtraLight_Italic,
  Poppins_300Light,
  Poppins_300Light_Italic,
  Poppins_400Regular,
  Poppins_400Regular_Italic,
  Poppins_500Medium,
  Poppins_500Medium_Italic,
  Poppins_600SemiBold,
  Poppins_600SemiBold_Italic,
  Poppins_700Bold,
  Poppins_700Bold_Italic,
  Poppins_800ExtraBold,
  Poppins_800ExtraBold_Italic,
  Poppins_900Black,
  Poppins_900Black_Italic,
} from '@expo-google-fonts/poppins';
import {
  Rubik_300Light,
  Rubik_300Light_Italic,
  Rubik_400Regular,
  Rubik_400Regular_Italic,
  Rubik_500Medium,
  Rubik_500Medium_Italic,
  Rubik_600SemiBold,
  Rubik_600SemiBold_Italic,
  Rubik_700Bold,
  Rubik_700Bold_Italic,
  Rubik_800ExtraBold,
  Rubik_800ExtraBold_Italic,
  Rubik_900Black,
  Rubik_900Black_Italic,
} from '@expo-google-fonts/rubik';
import { API_BASE_URL } from './config';

// Auth screens (sign-in / sign-up flow)
import WelcomeScreen from './screens/auth/WelcomeScreen';
import EmailScreen from './screens/auth/EmailScreen';
import VerifyOTPScreen from './screens/auth/VerifyOTPScreen';
import SetupTOTPScreen from './screens/auth/SetupTOTPScreen';
import CreateAccountScreen from './screens/auth/CreateAccountScreen';
import CreateScreen from './screens/auth/CreateScreen';
import PhoneNumberScreen from './screens/auth/PhoneNumberScreen';
import MPINScreen from './screens/auth/MPINScreen';

// Passenger screens
import TabNavigator from './navigation/TabNavigator';
import ProfileDetailsScreen from './screens/passenger/ProfileDetailsScreen';
import PushNotificationsScreen from './screens/passenger/PushNotificationsScreen';
import TripScreen from './screens/passenger/TripScreen';
import DepartureScheduleScreen from './screens/passenger/DepartureScheduleScreen';
import PassengerDetailsScreen from './screens/passenger/PassengerDetailsScreen';
import TicketSummaryScreen from './screens/passenger/TicketSummaryScreen';
import TicketDetailsScreen from './screens/passenger/TicketDetailsScreen';
import TopUpScreen from './screens/passenger/TopUpScreen';
import PassengerQRScreen from './screens/passenger/PassengerQRScreen';

// Conductor screens
import ConductorTabNavigator from './navigation/ConductorTabNavigator';
import ConductorLoginScreen from './screens/conductor/ConductorLoginScreen';
import ConductorMPINScreen from './screens/conductor/ConductorMPINScreen';
import ConductorDashboardScreen from './screens/conductor/ConductorDashboardScreen';
import ConductorProfileDetailsScreen from './screens/conductor/ConductorProfileDetailsScreen';
import QRScannerScreen from './screens/conductor/QRScannerScreen';

const BACKEND_URL = API_BASE_URL || 
  (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

export { BACKEND_URL };

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_100Thin,
    Poppins_100Thin_Italic,
    Poppins_200ExtraLight,
    Poppins_200ExtraLight_Italic,
    Poppins_300Light,
    Poppins_300Light_Italic,
    Poppins_400Regular,
    Poppins_400Regular_Italic,
    Poppins_500Medium,
    Poppins_500Medium_Italic,
    Poppins_600SemiBold,
    Poppins_600SemiBold_Italic,
    Poppins_700Bold,
    Poppins_700Bold_Italic,
    Poppins_800ExtraBold,
    Poppins_800ExtraBold_Italic,
    Poppins_900Black,
    Poppins_900Black_Italic,
    Rubik_300Light,
    Rubik_300Light_Italic,
    Rubik_400Regular,
    Rubik_400Regular_Italic,
    Rubik_500Medium,
    Rubik_500Medium_Italic,
    Rubik_600SemiBold,
    Rubik_600SemiBold_Italic,
    Rubik_700Bold,
    Rubik_700Bold_Italic,
    Rubik_800ExtraBold,
    Rubik_800ExtraBold_Italic,
    Rubik_900Black,
    Rubik_900Black_Italic,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const screenOptions = {
    headerShown: false,
    animation: 'slide_from_right',
  };

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Welcome"
        screenOptions={screenOptions}
      >
        {/* Auth */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="Email" component={EmailScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="SetupTOTP" component={SetupTOTPScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="CreateAccount" component={CreateAccountScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="MPIN" component={MPINScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="CreateScreen" component={CreateScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="PhoneNumber" component={PhoneNumberScreen} initialParams={{ backendUrl: BACKEND_URL }} />

        {/* Conductor */}
        <Stack.Screen name="ConductorLogin" component={ConductorLoginScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="ConductorMPIN" component={ConductorMPINScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="ConductorDashboard" component={ConductorDashboardScreen} />
        <Stack.Screen name="ConductorTabs" component={ConductorTabNavigator} />
        <Stack.Screen name="ConductorProfileDetails" component={ConductorProfileDetailsScreen} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />

        {/* Passenger */}
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="PushNotifications" component={PushNotificationsScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="Trip" component={TripScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="DepartureSchedule" component={DepartureScheduleScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="PassengerDetails" component={PassengerDetailsScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="TicketSummary" component={TicketSummaryScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="TopUp" component={TopUpScreen} initialParams={{ backendUrl: BACKEND_URL }} />
        <Stack.Screen name="PassengerQR" component={PassengerQRScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
