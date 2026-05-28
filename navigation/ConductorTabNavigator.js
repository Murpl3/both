import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, Platform, Dimensions, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../fonts';
import { Colors } from '../styles/designSystem';
import GradientSurface from '../components/ui/GradientSurface';

import ConductorDashboardScreen from '../screens/conductor/ConductorDashboardScreen';
import TicketingScreen from '../screens/conductor/TicketingScreen';
import PassengerListScreen from '../screens/conductor/PassengerListScreen';
import TripSummaryScreenConductor from '../screens/conductor/TripSummaryScreenConductor';
import ConductorProfileScreen from '../screens/conductor/ConductorProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_BAR_HEIGHT = 60;
const ICON_SIZE = 22;
const NAV_MARGIN = 16;
const NAV_BORDER_RADIUS = 28;

function FloatingConductorTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  const iconSources = {
    ConductorHome: require('../assets/home.png'),
    Ticketing: require('../assets/ticket.png'),
    PassengerList: require('../assets/passengers.png'),
    TripSummaryConductor: require('../assets/bill.png'),
    ConductorProfile: require('../assets/profile.png'),
  };

  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 12);

  return (
    <View style={[styles.floatingBarOuter, { bottom: bottomOffset }]}>
      <GradientSurface style={styles.floatingBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const iconSource = iconSources[route.name];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
            >
              {iconSource && (
                <Image
                  source={iconSource}
                  style={[styles.tabIcon, { tintColor: isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }]}
                  resizeMode="contain"
                />
              )}
              {isFocused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </GradientSurface>
    </View>
  );
}

const ConductorTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingConductorTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="ConductorHome" component={ConductorDashboardScreen} />
      <Tab.Screen name="Ticketing" component={TicketingScreen} />
      <Tab.Screen name="PassengerList" component={PassengerListScreen} />
      <Tab.Screen name="TripSummaryConductor" component={TripSummaryScreenConductor} />
      <Tab.Screen name="ConductorProfile" component={ConductorProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  floatingBarOuter: {
    position: 'absolute',
    left: NAV_MARGIN,
    right: NAV_MARGIN,
    alignItems: 'center',
    zIndex: 30,
  },
  floatingBar: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: NAV_BORDER_RADIUS,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    gap: 4,
  },
  tabIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.floatingTab.dotConductor,
  },
});

export default ConductorTabNavigator;
