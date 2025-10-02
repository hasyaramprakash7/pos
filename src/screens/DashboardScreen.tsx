import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { StackScreenProps } from "@react-navigation/stack";
import * as Clipboard from "expo-clipboard";
import { MaterialIcons } from "@expo/vector-icons";

// NOTE: Ensure the path to RootState and logout is correct
import { RootState } from "../app/store"; // Corrected path assumption
import { logout } from "../store/slices/authSlice"; // Corrected path assumption

// Define the root stack param list for navigation type safety
type RootStackParamList = {
  Dashboard: undefined;
  StaffManager: undefined;
  MenuItemCRUD: undefined;
  Menu: undefined;
  OrderManagement: undefined;
  // 📢 NEW: Sales Report Screen must be registered here
  SalesReports: undefined;
};

type DashboardScreenProps = StackScreenProps<RootStackParamList, "Dashboard">;

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  const userRole = user?.role || "Staff";
  const isApprovedText = user?.isApproved ? "Approved" : "Pending Approval";
  const isVendor = user?.role === "Vendor";

  // Check if user is Vendor or Billing for Sales Report access
  const isVendorOrBilling = isVendor || user?.role === "Billing";

  const vendorId = user?.vendorId;

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleStaffManager = () => {
    navigation.navigate("StaffManager");
  };

  const handleMenuItemManager = () => {
    navigation.navigate("MenuItemCRUD");
  };

  const handleMenuViewer = () => {
    navigation.navigate("Menu");
  };

  // Handler for Order Management (Visible to all authenticated roles for supervisory access)
  const handleOrderManager = () => {
    navigation.navigate("OrderManagement");
  };

  // 📢 NEW: Handler for Sales Reports
  const handleSalesReports = () => {
    navigation.navigate("SalesReports");
  };

  const copyVendorIdToClipboard = async () => {
    if (vendorId) {
      await Clipboard.setStringAsync(vendorId);
      Alert.alert(
        "Copied!",
        "Vendor ID copied to clipboard for staff sharing.",
        [{ text: "OK" }]
      );
    }
  };

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        color="#005612"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.dashboardContainer}>
      {/* VENDOR ID DISPLAY AND COPY ACTION (TOP) */}
      {isVendor && vendorId && (
        <View style={styles.vendorIdSection}>
          <Text style={styles.vendorIdLabel}>Your Shop ID (Tap to Copy):</Text>
          <TouchableOpacity
            style={styles.vendorIdDisplay}
            onPress={copyVendorIdToClipboard}
          >
            <Text style={styles.vendorIdText}>
              {vendorId.substring(0, 4)}...
              {vendorId.substring(vendorId.length - 4)}
            </Text>
            <Text style={styles.copyIcon}>📋</Text>
          </TouchableOpacity>
          <Text style={styles.vendorIdHelper}>
            Share this ID with staff for registration.
          </Text>
        </View>
      )}

      <Text style={styles.dashboardHeader}>Welcome, {user?.username}!</Text>
      <Text style={styles.dashboardText}>
        Role: <Text style={styles.roleText}>{userRole}</Text>
      </Text>

      {/* Approval Status Display for Staff (non-Vendor) */}
      {user?.role !== "Vendor" && (
        <View
          style={[
            styles.dashboardStatus,
            {
              backgroundColor: user?.isApproved ? "#d4edda" : "#fff3cd",
              borderColor: user?.isApproved ? "#c3e6cb" : "#ffeeba",
            },
          ]}
        >
          <Text
            style={{
              color: user?.isApproved ? "#155724" : "#856404",
              fontWeight: "bold",
            }}
          >
            Account Status: {isApprovedText}
          </Text>
        </View>
      )}

      {/* --- GENERAL STAFF ACTIONS (ALL ROLES) --- */}
      <View style={styles.generalActionsGroup}>
        {/* View Menu Button */}
        <TouchableOpacity style={styles.menuButton} onPress={handleMenuViewer}>
          <MaterialIcons name="list-alt" size={24} color="#005612" />
          <Text style={styles.menuButtonText}>View Restaurant Menu</Text>
        </TouchableOpacity>

        {/* Order Management Button - Visible to all authenticated users */}
        <TouchableOpacity
          style={[
            styles.menuButton,
            { borderLeftColor: "#D32F2F", marginTop: 10 },
          ]}
          onPress={handleOrderManager}
        >
          <MaterialIcons name="view-timeline" size={24} color="#D32F2F" />
          <Text style={[styles.menuButtonText, { color: "#D32F2F" }]}>
            Order Status / KOT Board
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- VENDOR & BILLING ACTIONS (Sales Reports) --- */}
      {isVendorOrBilling && (
        <View style={styles.vendorActionsGroup}>
          <Text style={styles.vendorActionsTitle}>
            {isVendor ? "Management & Reporting" : "Billing Tools"}
          </Text>

          {/* 📢 NEW: Sales Report Button (Vendor/Billing Only) */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#28A745" }]}
            onPress={handleSalesReports}
          >
            <MaterialIcons name="assessment" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>
              View Sales Reports & History
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- VENDOR-SPECIFIC ACTIONS --- */}
      {isVendor && (
        <View style={styles.vendorActionsGroup}>
          <Text style={styles.vendorActionsTitle}>Vendor Administration</Text>

          {/* Menu Item CRUD Button (Vendor-only creation/editing) */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleMenuItemManager}
          >
            <MaterialIcons name="edit-note" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Edit/Add Menu Items</Text>
          </TouchableOpacity>

          {/* Manage Staff Button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#BFA440" }]}
            onPress={handleStaffManager}
          >
            <MaterialIcons name="people" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Manage Shop Staff</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.dashboardProtectedText}>
        Logged in as {user?.email}.
      </Text>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// --- Styles (Updated to separate general and vendor action groups) ---
const styles = StyleSheet.create({
  dashboardContainer: {
    flexGrow: 1,
    padding: 25,
    paddingTop: Platform.OS === "android" ? 60 : 30,
    backgroundColor: "#F0F4F8",
    alignItems: "center",
  },
  vendorIdSection: {
    width: "100%",
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#BFA440",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  vendorIdLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 8,
    textAlign: "center",
  },
  vendorIdDisplay: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#005612",
  },
  vendorIdText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#005612",
    marginRight: 10,
    letterSpacing: 1.5,
  },
  copyIcon: { fontSize: 20, color: "#005612" },
  vendorIdHelper: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 5,
    textAlign: "center",
  },

  dashboardHeader: {
    color: "#1C1C1C",
    marginBottom: 10,
    fontSize: 28,
    fontWeight: "bold",
  },
  dashboardText: { fontSize: 18, color: "#333", marginBottom: 20 },
  roleText: { fontWeight: "bold", color: "#BFA440" },

  dashboardStatus: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginBottom: 30,
    borderWidth: 1,
  },

  // --- General Action Group (New) ---
  generalActionsGroup: { width: "100%", marginTop: 20, marginBottom: 20 },
  menuButton: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#005612", // Subtle design touch
  },
  menuButtonText: { color: "#005612", fontSize: 18, fontWeight: "600" },

  // --- Vendor Action Group ---
  vendorActionsGroup: {
    width: "100%",
    gap: 15,
    marginTop: 20,
    marginBottom: 30,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  vendorActionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1C",
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    backgroundColor: "#005612",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  actionButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "600" },

  dashboardProtectedText: {
    marginTop: 30,
    color: "#6c757d",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 20,
    textAlign: "center",
    width: "100%",
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: "#D32F2F",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "80%",
  },
  logoutButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default DashboardScreen;
