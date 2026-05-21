import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  BottomTabBar,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import StripeAppWrapper from './src/stripe/StripeAppWrapper';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider, useCart } from './src/context/CartContext';
import { ConfigProvider } from './src/context/ConfigContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { ViewCartBar } from './src/components/ViewCartBar';
import Login from './src/screens/Login';
import Register from './src/screens/Register';
import Home from './src/screens/Home';
import RestaurantDetail from './src/screens/RestaurantDetail';
import Cart from './src/screens/Cart';
import Orders from './src/screens/Orders';
import OrderDetail from './src/screens/OrderDetail';
import Profile from './src/screens/Profile';
import { Ionicons } from '@expo/vector-icons';
import { brand } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  bootSplash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: brand.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

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
      tabBar={(props: BottomTabBarProps) => (
        <View>
          <ViewCartBar
            currentRouteName={props.state?.routes?.[props.state?.index ?? 0]?.name}
            absolute={false}
          />
          <BottomTabBar {...props} />
        </View>
      )}
    >
      <Tab.Screen
        name="HomeTab"
        component={Home}
        options={{
          title: 'Halal Map',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={Cart}
        options={{
          title: 'Cart',
          tabBarLabel: 'Cart',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size} color={color} />
          ),
          tabBarBadge: items.length > 0 ? items.length : undefined,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={Orders}
        options={{
          title: 'Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={Profile}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </TabNav>
  );
}

function AppNavigator() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.bootSplash} accessibilityLabel="Loading">
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  const NavContainer = NavigationContainer as React.ComponentType<any>;
  const StackNav = Stack.Navigator as React.ComponentType<any>;
  const isAuthenticated = Boolean(token && user);

  return (
    <NavContainer>
      <StackNav
        screenOptions={{
          headerStyle: { backgroundColor: brand.surface },
          headerTintColor: brand.textPrimary,
          contentStyle: { backgroundColor: brand.background },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={Register} options={{ title: 'Sign up' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="RestaurantDetail"
              component={RestaurantDetail}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderDetail"
              component={OrderDetail}
              options={{ headerShown: false }}
            />
          </>
        )}
      </StackNav>
    </NavContainer>
  );
}

export default function App() {
  return (
    <StripeAppWrapper>
      <AuthProvider>
        <ConfigProvider>
          <FavoritesProvider>
            <CartProvider>
              <StatusBar style="dark" />
              <AppNavigator />
            </CartProvider>
          </FavoritesProvider>
        </ConfigProvider>
      </AuthProvider>
    </StripeAppWrapper>
  );
}
