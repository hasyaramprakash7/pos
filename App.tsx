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

// NOTE: These imports rely on files not provided, but are kept for context.
import { store, RootState } from "./src/store/store";
import LoginScreen from "./src/screens/Auth/LoginScreen";
import RegisterScreen from "./src/screens/Auth/RegisterScreen";
import { loadInitialAuth, logout } from "./src/store/slices/authSlice";

// --- IMPORT VENDOR/STAFF MANAGEMENT SCREENS ---
import VendorStaffManagerScreen from "./src/screens/Vendor/VendorStaffManagerScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import MenuItemCRUDScreen from "./src/screens/MenuItemCRUDScreen";
import MenuScreen from "./src/screens/MenuScreen";
import OrderManagementScreen from "./src/screens/OrderManagementScreen";
// 📢 NEW IMPORT: Order Confirmation Screen
import CreateOrderScreen from "./src/screens/CreateOrderScreen"; 

// --- Stack Navigator Setup ---
const Stack = createStackNavigator();

const RootNavigator = () => {
    const { isAuthenticated, user, isAppReady } = useSelector(
        (state: RootState) => state.auth
    );
    const dispatch = useDispatch();

    useEffect(() => {
        // Load authentication state from AsyncStorage on app start
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

    // Check if user is staff (not vendor) and unapproved
    const isUnapprovedStaff = user && user.role !== "Vendor" && !user.isApproved;
    // Check if user is a Vendor (used for navigation logic)
    const isVendor = user?.role === "Vendor";

    if (isUnapprovedStaff) {
        return (
            <View style={styles.unapprovedContainer}>
                <Text style={styles.unapprovedText}>
                    ⏳ Your Staff Account is awaiting approval from your Vendor. Please
                    try again later.
                </Text>
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
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />

                    {/* GENERAL ACCESS SCREENS (All Authenticated Roles) */}
                    <Stack.Screen
                        name="Menu"
                        component={MenuScreen}
                        options={{
                            headerShown: true,
                            title: "Restaurant Menu",
                            headerTintColor: "#005612",
                            headerTitleStyle: { fontWeight: "bold" },
                        }}
                    />
                    
                    {/* 📢 ORDER CONFIRMATION/CREATION SCREEN (Called from Menu) */}
                    <Stack.Screen
                        name="CreateOrder"
                        component={CreateOrderScreen}
                        options={{
                            headerShown: true,
                            title: "Finalize Order",
                            headerTintColor: "#005612",
                        }}
                    />

                    {/* ORDER MANAGEMENT SCREEN (Visible to ALL roles for supervisory access) */}
                    <Stack.Screen 
                        name="OrderManagement"
                        component={OrderManagementScreen}
                        options={{
                            headerShown: true,
                            title: "Order Status Board",
                            headerTintColor: "#005612",
                        }}
                    />

                    {/* CONDITIONAL ROUTES FOR VENDOR MANAGEMENT (Vendor only) */}
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
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </Stack.Group>
            )}
        </Stack.Navigator>
    );
};

// --- Main App Component ---
export default function App() {
    return (
        <Provider store={store}>
            <NavigationContainer>
                <RootNavigator />
            </NavigationContainer>
        </Provider>
    );
}

// --- Styles for App.tsx Components ---
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
    },
});
