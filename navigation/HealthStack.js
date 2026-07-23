import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HealthDashboard from '../screens/health/HealthDashboard';
import HealthLogEntry from '../screens/health/HealthLogEntry';
import HealthHistory from '../screens/health/HealthHistory';
import HealthDayDetail from '../screens/health/HealthDayDetail';
import MedicineReminders from '../screens/health/MedicineReminders';

const Stack = createStackNavigator();

export function HealthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HealthDashboard" component={HealthDashboard} />
      <Stack.Screen name="HealthLogEntry" component={HealthLogEntry} />
      <Stack.Screen name="HealthHistory" component={HealthHistory} />
      <Stack.Screen name="HealthDayDetail" component={HealthDayDetail} />
      <Stack.Screen name="MedicineReminders" component={MedicineReminders} />
    </Stack.Navigator>
  );
}
