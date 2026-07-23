import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Home from '../screens/Home';
import Analytics from '../screens/Analytics';

const Stack = createStackNavigator();

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeDashboard" component={Home} />
      <Stack.Screen name="Analytics" component={Analytics} />
    </Stack.Navigator>
  );
}
