import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider, useCart } from './src/context/CartContext';
import Login from './src/screens/Login';
import Register from './src/screens/Register';
import Home from './src/screens/Home';
import RestaurantDetail from './src/screens/RestaurantDetail';
import Cart from './src/screens/Cart';
import Orders from './src/screens/Orders';
import OrderDetail from './src/screens/OrderDetail';
import Profile from './src/screens/Profile';
import { brand } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { items } = useCart();
  const TabNav = Tab.Navigator as React.ComponentType<any>;
  return (
    <TabNav
      screenOptions={{
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: brand.textSecondary,
        headerStyle: { backgroundColor: brand.surface },
        headerTintColor: brand.textPrimary,
      }}
    >
      <Tab.Screen name="HomeTab" component={Home} options={{ title: 'Halal Map', tabBarLabel: 'Home' }} />
      <Tab.Screen
        name="CartTab"
        component={Cart}
        options={{
          title: 'Cart',
          tabBarLabel: 'Cart',
          tabBarBadge: items.length > 0 ? items.length : undefined,
        }}
      />
      <Tab.Screen name="OrdersTab" component={Orders} options={{ title: 'Orders', tabBarLabel: 'Orders' }} />
      <Tab.Screen name="ProfileTab" component={Profile} options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
    </TabNav>
  );
}

function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) return null;

  const NavContainer = NavigationContainer as React.ComponentType<any>;
  const StackNav = Stack.Navigator as React.ComponentType<any>;
  return (
    <NavContainer>
      <StackNav
        screenOptions={{
          headerStyle: { backgroundColor: brand.surface },
          headerTintColor: brand.textPrimary,
          contentStyle: { backgroundColor: brand.background },
        }}
      >
        {!token ? (
          <>
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={Register} options={{ title: 'Sign up' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="RestaurantDetail" component={RestaurantDetail} options={{ title: 'Restaurant' }} />
            <Stack.Screen name="OrderDetail" component={OrderDetail} options={{ title: 'Order' }} />
          </>
        )}
      </StackNav>
    </NavContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </CartProvider>
    </AuthProvider>
  );
}
