import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Shadows } from '../styles/designSystem';

const RT = Colors.rapidTransit;

import HomeScreen from '../screens/passenger/HomeScreen';
import TransactionScreen from '../screens/passenger/TransactionScreen';
import WalletScreen from '../screens/passenger/WalletScreen';
import ProfileScreen from '../screens/passenger/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_BAR_HEIGHT = 60;
const NAV_MARGIN = 16;
const NAV_BORDER_RADIUS = 36;

const TAB_ICONS = {
  Home: 'home',
  Transaction: 'list',
  Wallet: 'credit-card',
  Profile: 'user',
};

function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) + 8;

  return (
    <View style={[styles.outer, { bottom: bottomOffset }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const iconName = TAB_ICONS[route.name] || 'circle';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.75}
            >
              <Feather
                name={iconName}
                size={22}
                color={isFocused ? RT.tabActive : RT.slate500}
              />
              {isFocused ? <View style={styles.activeDot} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transaction" component={TransactionScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: NAV_MARGIN,
    right: NAV_MARGIN,
    alignItems: 'center',
    zIndex: 30,
  },
  bar: {
    width: '100%',
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    borderRadius: NAV_BORDER_RADIUS,
    backgroundColor: RT.tabBarBg,
    borderWidth: 1,
    borderColor: RT.tabBarBorder,
    ...Shadows.large,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: RT.primary,
  },
});
