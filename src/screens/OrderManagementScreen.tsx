import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// ⚠️ IMPORTANT: Adjust paths as necessary
import {
  fetchKitchenOrders,
  fetchBillingOrders,
  updateOrderStatus,
} from "../store/slices/orderSlice";
import { RootState, AppDispatch } from "../store/store";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const STATUS_COLORS = {
  Pending: "#FFC107", // Yellow
  Kitchen: "#007BFF", // Blue
  Ready: "#28A745", // Green
  Served: "#17A2B8", // Cyan/Info
  Billed: "#6C757D", // Gray
  Completed: "#343A40", // Dark Gray
};

// --- Order Card Component ---
const OrderCard = ({ order, role, onUpdate }) => {
  // Determine the next logical status and the button text
  let nextStatus = "";
  let buttonText = "";
  let buttonColor = "#005612"; // Default green for actions

  // 📢 Roles and transitions logic
  if (
    role === "Kitchen" &&
    (order.status === "Pending" || order.status === "Kitchen")
  ) {
    nextStatus = "Ready";
    buttonText = "Mark Ready";
  } else if (
    (role === "Billing" || role === "Vendor") &&
    (order.status === "Ready" || order.status === "Served")
  ) {
    // Only Billing/Vendor can finalize the bill
    nextStatus = "Billed";
    buttonText = "Finalize Bill";
    buttonColor = "#BFA440"; // Gold color for billing
  } else if (role === "Server" && order.status === "Ready") {
    nextStatus = "Served";
    buttonText = "Mark Served";
    buttonColor = "#17A2B8"; // Info/Cyan color
  }

  // Staff status display
  const statusBg = STATUS_COLORS[order.status] || "#ccc";

  // --- Enhanced Display Details ---
  const placingStaffName = order.serverName || "Staff";
  const placingStaffRole =
    order.serverRole || (order.server === order.vendorId ? "Vendor" : "Server");
  const shortServerId = order.server ? order.server.slice(-4) : "N/A";

  // Date and Time Formatting (using the schema's 'createdAt' timestamp)
  const orderTime = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  // Get Order-Level Notes (from the main order document)
  const orderNotes = order.notes;
  // ------------------------------------------------------------------------

  return (
    <View style={styles.card}>
      {/* Header with status bar and basic info */}
      <View
        style={[
          styles.cardHeader,
          { borderLeftColor: statusBg, borderLeftWidth: 6 },
        ]}
      >
        <View>
          <Text style={styles.tableText}>Table: {order.tableNumber}</Text>
          {/* Display Name/Role and short ID */}
          <Text style={styles.serverText}>
            By:{" "}
            <Text
              style={[
                styles.serverRoleText,
                {
                  color: placingStaffRole === "Vendor" ? "#BFA440" : "#005612",
                },
              ]}
            >
              {placingStaffRole}
            </Text>{" "}
            ({placingStaffName} - ...{shortServerId})
          </Text>
        </View>
        <Text style={[styles.statusTag, { backgroundColor: statusBg }]}>
          {order.status}
        </Text>
      </View>

      {/* Time and Order-Level Notes Section */}
      <View style={styles.timeAndNotesContainer}>
        <Text style={styles.orderTimeText}>
          <Ionicons name="time-outline" size={14} color="#6C757D" /> Ordered At:{" "}
          {orderTime}
        </Text>
        {orderNotes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesHeader}>
              <Ionicons
                name="chatbox-ellipses-outline"
                size={14}
                color="#856404"
              />{" "}
              Order Notes:
            </Text>
            <Text style={styles.notesText}>{orderNotes}</Text>
          </View>
        ) : null}
      </View>

      {/* Item List */}
      <ScrollView style={styles.itemsList} nestedScrollEnabled>
        {order.items.map((item, index) => (
          <View key={item._id || index} style={styles.itemRowContainer}>
            <View style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemTable}> (T{item.itemTableNumber})</Text>
            </View>

            {/* 📢 NEW: Display Item Addons */}
            {item.addons && item.addons.length > 0 ? (
              <View style={styles.itemAddonsContainer}>
                <Text style={styles.itemAddonsText}>
                  + Addons: {item.addons.join(", ")}
                </Text>
              </View>
            ) : null}

            {/* Display Item-Specific Notes */}
            {item.notes ? (
              <View style={styles.itemNotesContainer}>
                <Text style={styles.itemNotesText}>* {item.notes}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* Footer and Action Button */}
      <View style={styles.cardFooter}>
        <Text style={styles.totalAmount}>
          Total: ₹{Number(order.totalAmount).toFixed(2)}
        </Text>
        {nextStatus && order.status !== "Completed" ? ( // Disable button if completed
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: buttonColor }]}
            onPress={() => onUpdate(order._id, nextStatus)}
            disabled={["Billed", "Completed"].includes(order.status)}
          >
            <Text style={styles.updateButtonText}>{buttonText}</Text>
            <MaterialIcons name="done" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.noActionText}>
            {order.status === "Completed"
              ? "Order Completed"
              : "Awaiting action"}
          </Text>
        )}
      </View>
    </View>
  );
};

// --- Main Screen Component ---
export default function OrderManagementScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const { user } = useSelector((state) => state.auth);
  const { kitchenOrders, billingOrders, status, error } = useSelector(
    (state) => state.order
  );

  const userRole = user?.role;
  const isKitchen = userRole === "Kitchen";
  const isBilling = userRole === "Billing";
  const isServer = userRole === "Server";

  // 1. Determine which fetch operation to run initially
  const fetchData = () => {
    // Kitchen always fetches kitchenOrders
    if (isKitchen) {
      dispatch(fetchKitchenOrders());
    }
    // Vendor needs both for a full supervisory view
    else if (userRole === "Vendor") {
      dispatch(fetchKitchenOrders()); // Fetch preparation orders
      dispatch(fetchBillingOrders()); // Fetch service/billing orders
    }
    // Billing/Server need data pulled by fetchBillingOrders
    else {
      dispatch(fetchBillingOrders());
    }
  };

  // 2. Determine which list to display and if it needs local filtering
  let listToDisplay = [];
  let screenTitle = "Order Status Board";
  let screenSubtitle = "";

  if (isKitchen) {
    listToDisplay = kitchenOrders;
    screenTitle = "Kitchen KOT View";
    screenSubtitle = "Orders to be Prepared (Pending & Kitchen)";
  } else if (isBilling) {
    // BILLING: Show Ready, Served, Billed, and COMPLETED orders.
    listToDisplay = billingOrders.filter(
      (o) => !["Pending", "Kitchen"].includes(o.status)
    );
    screenTitle = "Billing and Finalization";
    screenSubtitle = "Orders Ready, Billed, and Completed";
  } else if (isServer) {
    // Server only needs live service orders
    listToDisplay = billingOrders.filter(
      (o) => o.status === "Ready" || o.status === "Served"
    );
    screenTitle = "Server Pickup & Service";
    screenSubtitle = "Orders Ready for Pickup / In Service";
  } else if (userRole === "Vendor") {
    // VENDOR: Show ALL orders, including 'Completed' for full history/supervision.
    const allOrders = [...kitchenOrders, ...billingOrders];

    // Use a Map to ensure unique orders (in case of overlap or data duplication)
    const uniqueOrdersMap = new Map();
    allOrders.forEach((order) => {
      uniqueOrdersMap.set(order._id, order);
    });

    // Display ALL orders (no status filter)
    listToDisplay = Array.from(uniqueOrdersMap.values());

    screenTitle = "Vendor Supervisory Board";
    screenSubtitle = `ALL Orders (Live & Completed) - Total: ${listToDisplay.length}`;
  }

  // Initial Data Fetch on mount/role change
  useEffect(() => {
    fetchData();
  }, [userRole]);

  // Error Handling
  useEffect(() => {
    if (status === "failed" && error) {
      Alert.alert("Data Error", error);
    }
  }, [status, error]);

  // Handle Refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    setTimeout(() => setRefreshing(false), 1500);
  };

  // Handle Status Update
  const handleUpdateStatus = (orderId, newStatus) => {
    Alert.alert(
      "Confirm Status Change",
      `Set order ${orderId.slice(-4)} status to ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            dispatch(updateOrderStatus({ orderId, newStatus: newStatus }));
          },
        },
      ]
    );
  };

  // Render Loading/Error States
  if (status === "loading" && listToDisplay.length === 0) {
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color="#005612" />
        <Text style={styles.loadingText}>Loading Orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{screenTitle}</Text>
        <Text style={styles.headerSubtitle}>{screenSubtitle}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#005612"]}
          />
        }
      >
        {listToDisplay.length === 0 && status !== "loading" ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="local-dining" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {userRole === "Server"
                ? "All orders are in the kitchen or already served."
                : "The queue is clear! Refresh to check again."}
            </Text>
          </View>
        ) : (
          listToDisplay.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              role={userRole || "Unknown"}
              onUpdate={handleUpdateStatus}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  loadingText: { marginTop: 10, fontSize: 16, color: "#005612" },

  header: {
    backgroundColor: "#005612",
    padding: 20,
    paddingTop: Platform.OS === "android" ? 40 : 55,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    elevation: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 16, color: "#C5E1A5", marginTop: 4 },

  scrollView: { flex: 1 },
  scrollContent: { padding: 15, alignItems: "center" },

  // --- Order Card Styles ---
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  tableText: { fontSize: 18, fontWeight: "bold", color: "#1C1C1C" },
  serverText: { fontSize: 12, color: "#6c757d", marginTop: 4 },
  serverRoleText: { fontWeight: "bold", color: "#005612" },
  statusTag: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },

  // Styles for Time and Order-Level Notes
  timeAndNotesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  orderTimeText: {
    fontSize: 12,
    color: "#6C757D",
    marginBottom: 4,
    gap: 5,
    alignItems: "center",
  },
  notesBox: {
    marginTop: 5,
    padding: 8,
    backgroundColor: "#FFF3CD", // Light warning color
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },
  notesHeader: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 2,
  },
  notesText: {
    fontSize: 13,
    color: "#856404",
  },
  // ---------------------------------

  itemsList: {
    maxHeight: SCREEN_HEIGHT * 0.35,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // Style for wrapping item row and notes
  itemRowContainer: {
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemQty: { fontSize: 16, fontWeight: "bold", color: "#005612", width: 30 },
  itemName: { flex: 1, fontSize: 16, color: "#333" },
  itemTable: { fontSize: 12, color: "#BFA440", marginLeft: 5 },

  // NEW Style for item-specific ADDONS
  itemAddonsContainer: {
    marginLeft: 30,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 1,
    backgroundColor: "#D4EDDA", // Light green for additions
    borderRadius: 4,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  itemAddonsText: {
    fontSize: 12,
    color: "#155724", // Dark green
    fontStyle: "italic",
    fontWeight: "500",
  },

  // UPDATED Style for item-specific NOTES (Bolder background/text)
  itemNotesContainer: {
    marginLeft: 30, // Aligns notes under the item name
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F8D7DA", // Light Red/Danger for high visibility
    borderRadius: 4,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  itemNotesText: {
    fontSize: 13,
    color: "#721C24", // Dark Red/Maroon
    fontStyle: "italic",
    fontWeight: "500",
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#F8F8F8",
  },
  totalAmount: { fontSize: 20, fontWeight: "bold", color: "#1C1C1C" },
  updateButton: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 5,
    alignItems: "center",
  },
  updateButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  noActionText: { fontSize: 14, color: "#888" },

  // --- Empty State ---
  emptyState: {
    alignItems: "center",
    marginTop: 50,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "90%",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#495057",
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
    textAlign: "center",
  },
});
