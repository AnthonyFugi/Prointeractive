import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider, useCart } from './src/context/CartContext';
import { colors } from './src/theme';

import HomeScreen from './src/screens/HomeScreen';
import BusinessesScreen from './src/screens/BusinessesScreen';
import CartScreen from './src/screens/CartScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import AccountScreen from './src/screens/AccountScreen';
import ProductScreen from './src/screens/ProductScreen';
import BusinessScreen from './src/screens/BusinessScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import InboxScreen from './src/screens/InboxScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = { Shop: '🛍', Businesses: '🏬', Cart: '🛒', Orders: '📦', Account: '👤' };

function Tabs() {
  const { count } = useCart();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Shop" component={HomeScreen} options={{ headerTitle: 'Pro·interactive' }} />
      <Tab.Screen name="Businesses" component={BusinessesScreen} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarBadge: count > 0 ? count : undefined }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ headerTitle: 'My orders' }} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.paper, primary: colors.navy },
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NavigationContainer theme={theme}>
          <StatusBar style="dark" />
          <Stack.Navigator>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="Product" component={ProductScreen} options={{ title: 'Product' }} />
            <Stack.Screen name="Business" component={BusinessScreen} options={{ title: 'Storefront' }} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="Inbox" component={InboxScreen} />
            <Stack.Screen name="Thread" component={ThreadScreen} options={{ title: 'Conversation' }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </CartProvider>
    </AuthProvider>
  );
}
