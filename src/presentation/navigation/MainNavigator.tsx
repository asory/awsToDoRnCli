import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { TasksScreen } from '../screens/main/TasksScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

export type MainTabParamList = {
  Tasks: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const renderTasksIcon = ({
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) => (
  <Text style={{ fontSize: size, color }} accessibilityLabel="Tasks">
    📋
  </Text>
);

const renderProfileIcon = ({
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) => (
  <Text style={{ fontSize: size, color }} accessibilityLabel="Profile">
    👤
  </Text>
);

export const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: 'My Tasks',
          tabBarLabel: 'Tasks',
          tabBarIcon: renderTasksIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
};
