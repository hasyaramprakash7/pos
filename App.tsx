// App.tsx

import React, { useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Provider, useSelector, useDispatch } from "react-redux";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// NOTE: Please ensure these paths and files exist
import { store, RootState } from "./src/store/store";
import LoginScreen from "./src/screens/Auth/LoginScreen";
import RegisterScreen from "./src/screens/Auth/RegisterScreen";
// 🚨 FIX: loadInitialAuth is a thunk, logout is a reducer action. Import them correctly.
import { loadInitialAuth, logout } from "./src/store/slices/authSlice";

// --- IMPORT VENDOR/STAFF MANAGEMENT SCREENS ---
import VendorStaffManagerScreen from "./src/screens/Vendor/VendorStaffManagerScreen";
// 🚨 IMPORTANT: Import UserTabNavigator (the dashboard UI)
import UserTabNavigator from "./src/screens/UserTabNavigator"; // 👈 CONFIRM THIS PATH
import MenuItemCRUDScreen from "./src/screens/MenuItemCRUDScreen";

// 📢 IMPORT CORE WORKFLOW SCREENS
import TableSelectionScreen from "./src/screens/TableSelectionScreen";
import MenuScreen from "./src/screens/MenuScreen";
import CreateOrderScreen from "./src/screens/CreateOrderScreen";
import OrderManagementScreen from "./src/screens/OrderManagementScreen";

// 📢 IMPORT ROLE-SPECIFIC SCREENS
import KitchenDashboard from "./src/screens/Staff/KitchenDashboardScreen";
import CompletedOrdersReportScreen from "./src/screens/CompletedOrdersReportScreen";

// --- Stack Navigator Setup ---
const Stack = createStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated, user, isAppReady } = useSelector(
    (state: RootState) => state.auth
  );
  const dispatch = useDispatch();

  useEffect(() => {
    // Dispatching thunk to load token from AsyncStorage
    dispatch(loadInitialAuth() as any);
  }, [dispatch]);

  if (!isAppReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#005612" />
        <Text style={styles.loadingText}>Loading App Data...</Text>
      </View>
    );
  }

  const isUnapprovedStaff = user && user.role !== "Vendor" && !user.isApproved;
  const isVendor = user?.role === "Vendor";
  const isKitchenStaff = user?.role === "Kitchen";
  const isVendorOrBilling = isVendor || user?.role === "Billing";

  if (isUnapprovedStaff) {
    return (
      <View style={styles.unapprovedContainer}>
        <Text style={styles.unapprovedText}>
          ⏳ Your Staff Account is awaiting approval from your Vendor. Please
          try again later.
        </Text>
        <TouchableOpacity
          style={styles.logoutButton}
          // 🚨 FIX: Dispatch the synchronous logout action correctly
          onPress={() => dispatch(logout())}
        >
          <Text style={{ color: "#856404", fontWeight: "bold" }}>Log Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? "Dashboard" : "Login"}
      screenOptions={{ headerShown: false }}
    >
      {isAuthenticated ? (
        <Stack.Group>
          {/* 🚀 THE MAIN DASHBOARD - This is the Tab Navigator */}
          <Stack.Screen
            name="Dashboard"
            component={UserTabNavigator} // 👈 This renders the navigation bar
            options={{ headerShown: false }}
          />

          {/* ... all other Stack.Screens for deep linking/modals */}

          {isKitchenStaff && (
            <Stack.Screen
              name="KitchenDashboard"
              component={KitchenDashboard}
              options={{
                headerShown: true,
                title: "Kitchen Order Board",
                headerTintColor: "#005612",
              }}
            />
          )}

          <Stack.Screen
            name="TableSelection"
            component={TableSelectionScreen}
            options={{
              headerShown: true,
              title: "Select Table",
              headerTintColor: "#005612",
              headerTitleStyle: { fontWeight: "bold" },
            }}
          />

          <Stack.Screen
            name="Menu"
            component={MenuScreen}
            options={{
              headerShown: true,
              title: "Add Items to Order",
              headerTintColor: "#005612",
              headerTitleStyle: { fontWeight: "bold" },
            }}
          />

          <Stack.Screen
            name="CreateOrder"
            component={CreateOrderScreen}
            options={{
              headerShown: true,
              title: "Finalize Order",
              headerTintColor: "#005612",
            }}
          />

          <Stack.Screen
            name="OrderManagement"
            component={OrderManagementScreen}
            options={{
              headerShown: true,
              title: "Order Status Board",
              headerTintColor: "#005612",
            }}
          />

          {isVendorOrBilling && (
            <Stack.Screen
              name="SalesReports"
              component={CompletedOrdersReportScreen}
              options={{
                headerShown: true,
                title: "Completed Orders & Sales",
                headerTintColor: "#343A40",
                headerTitleStyle: { fontWeight: "bold" },
              }}
            />
          )}

          {isVendor && (
            <>
              <Stack.Screen
                name="StaffManager"
                component={VendorStaffManagerScreen}
                options={{
                  headerShown: true,
                  title: "Staff Management",
                  headerTintColor: "#005612",
                }}
              />

              <Stack.Screen
                name="MenuItemCRUD"
                component={MenuItemCRUDScreen}
                options={{
                  headerShown: true,
                  title: "Menu Item Management",
                  headerTintColor: "#005612",
                }}
              />
            </>
          )}
        </Stack.Group>
      ) : (
        <Stack.Group>
          {/* Authentication Routes */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </Provider>
  );
}

// ... styles remain unchanged
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: { fontSize: 18, color: "#005612", marginTop: 10 },
  unapprovedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff3cd",
    borderColor: "#ffeeba",
    borderWidth: 1,
    margin: 20,
    borderRadius: 8,
  },
  unapprovedText: { fontSize: 16, color: "#856404", textAlign: "center" },
  logoutButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f8d7da",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#f5c6cb",
  },
});
