// components/ResponsiveTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Dimensions, Platform } from 'react-native';
import { Home, Clock, TrendingUp, User } from 'lucide-react-native';

// Import your screens
import HomeScreen from '@/app/(tabs)/index'; 
import PreviousScreen from '@/app/(tabs)/previous';
import ProgressScreen from '@/app/(tabs)/progress';
import ProfileScreen from '@/app/(tabs)/profile';

const Tab = createBottomTabNavigator();
const { width: screenWidth } = Dimensions.get('window');

// Responsive calculations
const isSmallScreen = screenWidth < 380;
const isVerySmallScreen = screenWidth < 350;
const isTablet = screenWidth > 768;

const getResponsiveTabBarStyle = () => ({
  height: isVerySmallScreen ? 55 : isSmallScreen ? 60 : isTablet ? 70 : 65,
  paddingBottom: Platform.OS === 'ios' 
    ? (isVerySmallScreen ? 2 : isSmallScreen ? 5 : 8)
    : (isVerySmallScreen ? 5 : isSmallScreen ? 8 : 10),
  paddingTop: isVerySmallScreen ? 2 : 5,
  backgroundColor: '#FFFFFF',
  borderTopWidth: 1,
  borderTopColor: '#E1E1E6',
});

const getResponsiveLabelStyle = () => ({
  fontSize: isVerySmallScreen ? 9 : isSmallScreen ? 10 : isTablet ? 13 : 11,
  fontFamily: 'Poppins-Medium',
  marginTop: isVerySmallScreen ? 2 : 3,
});

const getResponsiveIconSize = () => {
  if (isVerySmallScreen) return 18;
  if (isSmallScreen) return 20;
  if (isTablet) return 26;
  return 22;
};

const getTabLabel = (full: string, short: string, emoji: string) => {
  if (isVerySmallScreen) return emoji;
  if (isSmallScreen) return short;
  return full;
};

export default function ResponsiveTabNavigator() {
  const iconSize = getResponsiveIconSize();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: getResponsiveTabBarStyle(),
        tabBarLabelStyle: getResponsiveLabelStyle(),
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarAllowFontScaling: false,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: getTabLabel('Home', 'Home', '🏠'),
          tabBarIcon: ({ color }) => (
            <Home size={iconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Previous"
        component={PreviousScreen}
        options={{
          tabBarLabel: getTabLabel('Previous', 'Prev', '📚'),
          tabBarIcon: ({ color }) => (
            <Clock size={iconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: getTabLabel('Progress', 'Stats', '📊'),
          tabBarIcon: ({ color }) => (
            <TrendingUp size={iconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: getTabLabel('Profile', 'Me', '👤'),
          tabBarIcon: ({ color }) => (
            <User size={iconSize} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

