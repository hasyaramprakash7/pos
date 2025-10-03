import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { RootState } from "../../store/store"; // Adjust path

export default function StaffDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const userRole = user?.role || "Staff";

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Welcome, {user?.username} ({userRole})
      </Text>
      <Text style={styles.subtitle}>Quick Actions:</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate("Menu")}
      >
        <MaterialIcons name="menu-book" size={24} color="#fff" />
        <Text style={styles.buttonText}>Start New Order</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate("OrderManagement")}
      >
        <MaterialIcons name="view-timeline" size={24} color="#fff" />
        <Text style={styles.buttonText}>
          {userRole === "Billing" ? "Manage Bills" : "Check Served Orders"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#F8F5F0",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#005612",
    marginBottom: 20,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 18,
    color: "#1C1C1C",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 5,
    width: "100%",
    textAlign: "center",
  },
  actionButton: {
    flexDirection: "row",
    backgroundColor: "#BFA440",
    padding: 15,
    borderRadius: 10,
    width: "90%",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
