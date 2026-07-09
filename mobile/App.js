import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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

const Tab = createBottomTabNavigator();

// Consistent, breathable header styling on every stack
const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { fontWeight: '800', fontSize: 17, color: colors.ink },
  headerTintColor: colors.navy,
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: colors.paper },
};

const makeStack = () => createNativeStackNavigator();

const ShopStack = makeStack();
function ShopStackScreen() {
  return (
    <ShopStack.Navigator screenOptions={stackScreenOptions}>
      <ShopStack.Screen name="ShopHome" component={HomeScreen} options={{ title: 'Pro·interactive' }} />
      <ShopStack.Screen name="Product" component={ProductScreen} options={{ title: '' }} />
      <ShopStack.Screen name="Business" component={BusinessScreen} options={{ title: 'Storefront' }} />
    </ShopStack.Navigator>
  );
}

const BizStack = makeStack();
function BizStackScreen() {
  return (
    <BizStack.Navigator screenOptions={stackScreenOptions}>
      <BizStack.Screen name="BusinessesHome" component={BusinessesScreen} options={{ title: 'Businesses' }} />
      <BizStack.Screen name="Business" component={BusinessScreen} options={{ title: 'Storefront' }} />
      <BizStack.Screen name="Product" component={ProductScreen} options={{ title: '' }} />
    </BizStack.Navigator>
  );
}

const CartStack = makeStack();
function CartStackScreen() {
  return (
    <CartStack.Navigator screenOptions={stackScreenOptions}>
      <CartStack.Screen name="CartHome" component={CartScreen} options={{ title: 'Cart' }} />
      <CartStack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
    </CartStack.Navigator>
  );
}

const OrdersStack = makeStack();
function OrdersStackScreen() {
  return (
    <OrdersStack.Navigator screenOptions={stackScreenOptions}>
      <OrdersStack.Screen name="OrdersHome" component={OrdersScreen} options={{ title: 'My orders' }} />
    </OrdersStack.Navigator>
  );
}

const AccountStack = makeStack();
function AccountStackScreen() {
  return (
    <AccountStack.Navigator screenOptions={stackScreenOptions}>
      <AccountStack.Screen name="AccountHome" component={AccountScreen} options={{ title: 'Account' }} />
      <AccountStack.Screen name="Inbox" component={InboxScreen} />
      <AccountStack.Screen name="Thread" component={ThreadScreen} options={{ title: 'Conversation' }} />
      <AccountStack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
      <AccountStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
    </AccountStack.Navigator>
  );
}

const ICONS = { ShopTab: '🛍', BusinessesTab: '🏬', CartTab: '🛒', OrdersTab: '📦', AccountTab: '👤' };

function Tabs() {
  const { count } = useCart();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.55 }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="ShopTab" component={ShopStackScreen} options={{ tabBarLabel: 'Shop' }} />
      <Tab.Screen name="BusinessesTab" component={BizStackScreen} options={{ tabBarLabel: 'Businesses' }} />
      <Tab.Screen name="CartTab" component={CartStackScreen}
        options={{ tabBarLabel: 'Cart', tabBarBadge: count > 0 ? count : undefined }} />
      <Tab.Screen name="OrdersTab" component={OrdersStackScreen} options={{ tabBarLabel: 'Orders' }} />
      <Tab.Screen name="AccountTab" component={AccountStackScreen} options={{ tabBarLabel: 'Account' }} />
    </Tab.Navigator>
  );
}

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.paper, primary: colors.navy },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationContainer theme={theme}>
            <StatusBar style="dark" />
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
              <Tabs />
            </SafeAreaView>
          </NavigationContainer>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
