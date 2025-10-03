import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import OrderManagementScreen from "../OrderManagementScreen"; // Import the main KOT view
import { RootState } from "../../store/store"; // Assuming correct path to store

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function KitchenDashboardScreen() {
  // We only need the user role for the header greeting
  const { user } = useSelector((state: RootState) => state.auth);
  const userName = user?.username || "Chef";

  // --- Placeholder Stats (Replace with real data fetch if necessary) ---
  // const stats = [
  //   { label: "Incoming Orders", value: 3, icon: "schedule" },
  //   { label: "Items to Prep", value: 45, icon: "restaurant" },
  //   { label: "Avg Prep Time", value: "8 min", icon: "timer" },
  // ];

  return (
    <View style={styles.container}>
      {/* --- Dedicated Header for Kitchen Staff --- */}
      {/* <View style={styles.header}>
         <Text style={styles.greetingText}>Welcome back, {userName}!</Text>
        <Text style={styles.headerTitle}>Kitchen Command Center</Text>
      </View> */}

      {/* --- Operational Stats Bar --- */}
      {/* <View style={styles.statsBar}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statBox}>
            <MaterialIcons name={stat.icon as any} size={20} color="#005612" />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View> */}

      {/* --- KOT Board View --- */}
      <View style={styles.kotContainer}>
        <OrderManagementScreen />
      </View>

      <View style={styles.statusIndicator}>
        <Text style={styles.statusLabel}>Current Shift Status: </Text>
        <Text style={styles.statusText}>READY</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },
  header: {
    backgroundColor: "#005612",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 50 : 65,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  greetingText: {
    fontSize: 16,
    color: "#C5E1A5",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },

  // --- Stats Bar ---
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginTop: -10, // Pull it up slightly under the header curve
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  statBox: {
    alignItems: "center",
    paddingHorizontal: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C1C1C",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },

  // --- KOT Content Container ---
  kotContainer: {
    flex: 1,
    // The OrderManagementScreen content will scroll inside this area
  },

  // --- Fixed Status Footer ---
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    elevation: 5,
  },
  statusLabel: {
    fontSize: 16,
    color: "#6c757d",
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#28A745", // Green for READY
  },
});
