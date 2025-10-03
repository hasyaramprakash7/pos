import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  View,
  Text, // Added Text for the custom button label
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from "react-native";
import { useSelector } from "react-redux";

// Import your tab screens (Paths must be correct relative to this file)
import HomeScreen from "./DashboardScreen"; // Used for 'Home' (Menu)
import PayScreen from "./OrderManagementScreen"; // Used for 'Pay' (Order Management)
import TableSelectionScreen from "./TableSelectionScreen"; // Used for 'Order' tab (New Order Flow)
import KitchenScreen from "./MenuItemCRUDScreen"; // Menu Item CRUD (used for 'Kitchen' tab)
import BillingScreen from "../screens/Vendor/VendorStaffManagerScreen"; // Staff Manager (used for 'Billing' tab)
import KitchenDashboardScreen from "../screens/Staff/KitchenDashboardScreen"; // Dedicated Kitchen Dashboard (used for 'KDash' tab)

// Import your logo images
const BLuxuryLogo = require("../../assets/assets/Gemini_Generated_Image_z8uyflz8uyflz8uy.png");
const RamLogo = require("../../assets/assets/Gemini_Generated_Image_z8uyflz8uyflz8uy.png");

// --- Type Definitions (Minimal Redux State for Role Check) ---
interface MinimalUser {
  role: "Vendor" | "Server" | "Kitchen" | "Billing";
}

interface MinimalRootState {
  auth: {
    user: MinimalUser | null;
  };
}

export type BottomTabParamList = {
  Home: undefined;
  Order: undefined;
  Pay: undefined; // Order Management
  Kitchen: undefined; // Menu Item CRUD
  KDash: undefined; // Kitchen Dashboard
  Billing: undefined; // Vendor Staff Manager
};

const { width, height } = Dimensions.get("window");

// --- Modern Color Palette ---
const Colors = {
  starbucksGreen: "#0A3D2B",
  starbucksDarkGreen: "#0A3D2B",
  starbucksLightGreen: "#0A3D2B",
  starbucksAccent: "#0A3D2B",
  textWhite: "#F8F5F0",
  textDark: "#1A1A1A",
  grayText: "black",
  lightGray: "#F8FAFC",
  borderGray: "#E5E7EB",
  glassWhite: "rgba(255, 255, 255, 0.95)",
  shadowDark: "rgba(0, 0, 0, 0.1)",
  gradientStart: "#0A3D2B",
  gradientEnd: "#0A3D2B",
  goldenYellow: "#FFD700",
  goldenShadow: "#0A3D2B",
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// --- Access Denied Screen Component ---
const AccessDeniedScreen = () => (
  <View style={tabStyles.accessDeniedContainer}>
    <Ionicons
      name="lock-closed-outline"
      size={60}
      color={Colors.starbucksDarkGreen}
    />
    <Text style={tabStyles.accessDeniedTitle}>Access Denied</Text>
    <Text style={tabStyles.accessDeniedText}>
      You do not have permission to view this screen.
    </Text>
  </View>
);

// --- Custom Tab Bar Button with the new logo (Central Action Button) ---
// 🚨 MODIFIED: Added Text Label below the image
const CustomOrderTabBarButton = ({ onPress, focused, imageSource }) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  const opacityValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(opacityValue, {
        toValue: focused ? 0.9 : 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, [focused]);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 0.95,
        useNativeDriver: true,
        duration: 100,
      }),
      Animated.spring(scaleValue, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        duration: 100,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      style={tabStyles.customButtonContainer}
      onPress={handlePress}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          tabStyles.customButton,
          {
            transform: [{ scale: scaleValue }],
            opacity: opacityValue,
          },
          focused && tabStyles.customButtonFocused,
        ]}
      >
        <Image
          source={imageSource}
          style={tabStyles.orderButtonLogo}
          resizeMode="contain"
        />
      </Animated.View>
      
      {/* 🚨 NEW: Title/Label for the Order Button */}
      <Text style={[tabStyles.customButtonLabel, { color: focused ? Colors.starbucksGreen : Colors.grayText }]}>
        Tables
      </Text>

      {/* The focus indicator dot (removed the old one for the new label) 
      {focused && (
        <View style={tabStyles.actionIndicator}>
          <View style={tabStyles.actionDot} />
        </View>
      )}
      */}
    </TouchableOpacity>
  );
};

// 🚨 The core logic is here
const UserTabNavigator = () => {
  // 1. Get the user role from Redux state
  const user = useSelector((state: MinimalRootState) => state.auth.user);
  const userRole = user?.role;

  // --- 2. Define Screen Access Rules ---
  // Maps each tab name to the roles that are allowed to see it.
  const screenAccessMap = {
    Home: ["Vendor", "Server", "Kitchen", "Billing"], // Everyone sees the Home/Menu screen
    Order: ["Vendor", "Server"], // Only Order Takers (Table Selection / New Order)
    Pay: ["Vendor", "Server", "Billing", "Kitchen"], // Order Management / Checkout
    Kitchen: ["Vendor", "Kitchen"], // Menu Item CRUD (Uses KitchenScreen path)
    KDash: ["Vendor", "Kitchen"], // 🚨 RE-ADDED: Kitchen Dashboard
    Billing: ["Vendor"], // Vendor Staff Manager
  };

  // --- 3. Define ALL Possible Screens with their details ---
  const allScreens = [
    {
      name: "Home",
      component: HomeScreen,
      options: { title: "Menu" },
      iconName: (focused) => (focused ? "home" : "home-outline"),
    },
    {
      name: "Order",
      component: TableSelectionScreen,
      options: {
        title: "", // Title remains empty as the button handles the label
        tabBarButton: (props) => (
          <CustomOrderTabBarButton {...props} imageSource={BLuxuryLogo} />
        ),
      },
    },
    {
      name: "Pay",
      component: PayScreen,
      options: { title: "Orders" },
      iconName: (focused) => (focused ? "list-circle" : "list-circle-outline"), // Order Management
    },
    {
      name: "Kitchen",
      component: KitchenScreen || AccessDeniedScreen, 
      options: { title: "Items" }, // Items (for Menu Item CRUD)
      iconName: (focused) => (focused ? "create" : "create-outline"), // Pencil for CRUD
    },
    // {
    //   name: "KDash", // 🚨 RE-ADDED
    //   component: KitchenDashboardScreen || AccessDeniedScreen, 
    //   options: { title: "K Dash" }, // Changed back to K Dash since Orders is on 'Pay'
    //   iconName: (focused) => (focused ? "grid" : "grid-outline"), // Grid for Dashboard
    // },
    {
      name: "Billing",
      component: BillingScreen || AccessDeniedScreen, 
      options: { title: "Staff" }, // Staff Manager
      iconName: (focused) => (focused ? "people" : "people-outline"), 
    },
  ];

  // --- 4. Filter Screens based on User Role ---
  const filteredScreens = allScreens.filter((screen) =>
    screenAccessMap[screen.name]?.includes(userRole)
  );

  // Fallback: If no tabs are available (e.g., user role is unknown), show a message
  if (!userRole || filteredScreens.length === 0) {
    return (
      <View style={tabStyles.accessDeniedContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="red" />
        <Text style={tabStyles.accessDeniedTitle}>Configuration Error</Text>
        <Text style={tabStyles.accessDeniedText}>
          User role is undefined or not configured for any tabs. Current Role:{" "}
          {userRole || "NONE"}
        </Text>
      </View>
    );
  }

  // --- 5. Render the Tab Navigator with Filtered Screens ---
  return (
    <View style={tabStyles.navigatorContainer}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            // Find the iconName from the filtered screen list
            const screen = filteredScreens.find((s) => s.name === route.name);
            const iconName = screen?.iconName
              ? screen.iconName(focused)
              : "help-circle-outline";

            // Central button tab does not render a standard icon/label
            if (route.name === "Order") {
              // The custom button handles its own visual state
              return null;
            }

            const iconColor = focused ? Colors.starbucksGreen : Colors.grayText;
            const iconSize = focused ? 20 : 18;

            return (
              <View style={focused ? tabStyles.focusedIconContainer : null}>
                <Ionicons name={iconName} size={iconSize} color={iconColor} />
                {focused && <View style={tabStyles.iconIndicator} />}
              </View>
            );
          },
          // ... (Rest of the standard tab bar options)
          tabBarActiveTintColor: Colors.starbucksGreen,
          tabBarInactiveTintColor: Colors.grayText,
          tabBarStyle: {
            backgroundColor: Colors.textWhite,
            borderTopWidth: 0,
            height: 70,
            paddingBottom: 1,
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            elevation: 50,
            shadowColor: Colors.shadowDark,
            shadowOffset: {
              width: 0,
              height: -8,
            },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            zIndex: 1001,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "900",
            letterSpacing: 0.3,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
        })}
      >
        {/* Render only the screens the user is allowed to see */}
        {filteredScreens.map((screen) => (
          <Tab.Screen
            key={screen.name}
            name={screen.name as keyof BottomTabParamList}
            component={screen.component}
            options={screen.options}
          />
        ))}
      </Tab.Navigator>
    </View>
  );
};

// ... (tabStyles remain the same)
const tabStyles = StyleSheet.create({
  navigatorContainer: {
    flex: 1,
    position: "relative",
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: Colors.lightGray,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.starbucksDarkGreen,
    marginTop: 15,
    marginBottom: 10,
  },
  accessDeniedText: {
    fontSize: 16,
    color: Colors.grayText,
    textAlign: "center",
    lineHeight: 24,
  },
  customButtonContainer: {
    top: -25,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    zIndex: 10,
    paddingBottom: 16, // Adjusted to make space for the label
  },
  customButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    shadowColor: Colors.goldenShadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  customButtonFocused: {
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  orderButtonLogo: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
  },
  // 🚨 NEW STYLE FOR LABEL
  customButtonLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    // Positioned below the button, not overlapping
  },
  actionIndicator: {
    // This is no longer needed since the label acts as the indicator
    position: "absolute",
    bottom: -8,
    alignItems: "center",
  },
  actionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.starbucksAccent,
    marginTop: 4,
  },
  focusedIconContainer: {
    alignItems: "center",
  },
  iconIndicator: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.starbucksGreen,
    marginTop: 4,
  },
});

export default UserTabNavigator;