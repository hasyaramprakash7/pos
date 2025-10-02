import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";

// ⚠️ IMPORTANT: Adjust paths as necessary
import { RootState, AppDispatch } from "../store/store";
// 🚨 IMPORT BOTH FETCH THUNKS
import {
  fetchBillingOrders,
  fetchKitchenOrders,
  OrderStatus,
} from "../store/slices/orderSlice";
import { Order } from "../store/slices/orderSlice";

const SCREEN_WIDTH = Dimensions.get("window").width;
const TABLE_COUNT = 15;
const POLLING_INTERVAL = 10000;

// --- Status Definitions and Priority Mapping ---
type TableDisplayStatus =
  | "Available"
  | "Pending"
  | "Ready"
  | "Served"
  | "Occupied";

interface TableStatusInfo {
  status: TableDisplayStatus;
  color: string;
}

// Defines which statuses are truly active for display
const ACTIVE_DISPLAY_STATUSES: OrderStatus[] = [
  "Pending",
  "Kitchen",
  "Ready",
  "Served",
];

// Priority for selecting the correct order when multiple exist for one table.
const STATUS_PRIORITY: { [key in OrderStatus]?: number } = {
  Ready: 4, // Ready for pickup/serving (Highest Priority)
  Served: 3, // Needs payment
  Pending: 2, // Waiting for Kitchen to acknowledge
  Kitchen: 1, // In preparation
  Billed: 0,
  Completed: 0,
};

// Map backend OrderStatus to display properties
const getTableStatusProps = (
  status: OrderStatus | "Available"
): TableStatusInfo => {
  switch (status) {
    case "Ready":
      return { status: "Ready", color: "#D32F2F" }; // Red (Highest Alert)
    case "Served":
      return { status: "Served", color: "#E65100" }; // Orange (Waiting to be Billed)
    case "Pending":
    case "Kitchen":
      return { status: "Pending", color: "#BFA440" }; // Yellow/Gold (In Progress)
    case "Billed":
    case "Completed":
    case "Available":
    default:
      return { status: "Available", color: "#005612" }; // Green (Free)
  }
};

/**
 * Helper function to format the timestamp into a readable date and time.
 * Assumes the order object has a 'createdAt' field (string or Date).
 */
const formatDateTime = (dateString: string | Date | undefined): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);

    // Options for localized date/time display
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true, // Use 12-hour format with AM/PM
    };

    // Uses the device's locale settings for best user experience
    return date.toLocaleDateString(undefined, options);
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Invalid Date";
  }
};

// --- Component Start ---
export default function TableSelectionScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const isFocused = useIsFocused();

  const user = useSelector((state: RootState) => state.auth.user);

  // Fetching both lists
  const kitchenOrders = useSelector(
    (state: RootState) => state.order.kitchenOrders
  );
  const billingOrders = useSelector(
    (state: RootState) => state.order.billingOrders
  );

  // CONSOLIDATED LIST
  const allActiveOrders = useMemo(() => {
    return [...kitchenOrders, ...billingOrders];
  }, [kitchenOrders, billingOrders]);

  const loadingStatus = useSelector((state: RootState) => state.order.status);
  const isLoading = loadingStatus === "loading";

  const [refreshing, setRefreshing] = useState(false);

  // --- Core Fetch Function ---
  const handleFetchOrders = useCallback(() => {
    // Dispatch both thunks to get all data
    return Promise.allSettled([
      dispatch(fetchKitchenOrders()),
      dispatch(fetchBillingOrders()),
    ]);
  }, [dispatch]);

  // --- Live Data Polling Logic ---
  useEffect(() => {
    if (!isFocused) {
      return;
    }

    handleFetchOrders();
    const intervalId = setInterval(handleFetchOrders, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isFocused, handleFetchOrders]);

  // Pull-to-Refresh Handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    handleFetchOrders().then(() => {
      setRefreshing(false);
    });
  }, [handleFetchOrders]);

  // MODIFIED MAP CALCULATION: Stores an ARRAY of active orders per table
  const tableDataMap = useMemo(() => {
    // Map stores tableNumber -> Array of Orders
    const map: { [key: number]: Order[] } = {};

    allActiveOrders
      // Step 1: Filter out orders that signify a free table (Billed/Completed)
      .filter((order) => ACTIVE_DISPLAY_STATUSES.includes(order.status))
      .forEach((order) => {
        const tableNumber = order.tableNumber;
        if (!map[tableNumber]) {
          map[tableNumber] = [];
        }
        map[tableNumber].push(order);
      });

    // Step 2: Sort orders within the array by priority (highest priority first)
    Object.values(map).forEach((orders) => {
      orders.sort((a, b) => {
        const priorityA = STATUS_PRIORITY[a.status] || 0;
        const priorityB = STATUS_PRIORITY[b.status] || 0;
        return priorityB - priorityA;
      });
    });

    return map;
  }, [allActiveOrders]);

  // Helper to determine the *primary* status/color of the table
  const getTablePrimaryStatus = (tableNumber: number) => {
    const orders = tableDataMap[tableNumber];
    if (orders && orders.length > 0) {
      return orders[0].status;
    }
    return "Available";
  };

  const renderTable = (tableNumber: number) => {
    const activeOrders = tableDataMap[tableNumber] || [];
    const primaryStatus = getTablePrimaryStatus(tableNumber);
    const { status, color } = getTableStatusProps(primaryStatus);

    const isOrderActive = activeOrders.length > 0;

    const handleStartNewOrder = () => {
      navigation.navigate("Menu", {
        tableNumber,
        existingOrderId: undefined,
      });
    };

    const handleContinueOrder = (order: Order) => {
      navigation.navigate("Menu", {
        tableNumber,
        existingOrderId: order._id,
      });
    };

    const handleViewOrder = (order: Order) => {
      navigation.navigate("OrderManagement", {
        orderIdFilter: order._id,
        tableNumberFilter: tableNumber,
      });
    };

    return (
      <View
        key={tableNumber}
        style={[styles.tableCard, { borderColor: color }]}
      >
        {/* --- Table Header --- */}
        <View style={styles.tableHeader}>
          <Ionicons name="tablet-landscape-outline" size={36} color={color} />
          <View style={[styles.statusBadge, { backgroundColor: color }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <Text style={styles.tableNumberText}>Table {tableNumber}</Text>

        {isLoading && !refreshing && (
          <ActivityIndicator
            size="small"
            color={color}
            style={styles.loadingOverlay}
          />
        )}
        <View style={styles.separator} />

        {/* --- Order Details Display (Multiple Orders) --- */}
        {isOrderActive ? (
          activeOrders.map((order, index) => {
            const orderStatusProps = getTableStatusProps(order.status);

            // Get item details
            const firstItemName =
              order.items && order.items.length > 0
                ? order.items[0].name
                : "No Items Added";
            const remainingItemCount = (order.items?.length || 0) - 1;

            // 💡 Get formatted date and time
            const orderDateTime = formatDateTime(order.createdAt);

            return (
              <View
                key={order._id}
                style={[
                  styles.orderDetails,
                  {
                    borderColor: orderStatusProps.color,
                    borderLeftWidth: 5,
                  },
                ]}
              >
                {/* Order ID and Status Pill */}
                <View style={styles.orderDetailRow}>
                  <Text style={styles.orderDetailText}>
                    Order ID: **#{order._id.slice(-4)}**
                  </Text>
                  <View
                    style={[
                      styles.orderStatusPill,
                      { backgroundColor: orderStatusProps.color },
                    ]}
                  >
                    <Text style={styles.orderStatusPillText}>
                      {orderStatusProps.status}
                    </Text>
                  </View>
                </View>

                {/* 🚨 New Row for Date and Time */}
                <View style={styles.orderDetailRow}>
                  <Text style={styles.orderPlacedText}>
                    Placed: **{orderDateTime}**
                  </Text>
                </View>

                {/* Item Name and Total Amount Display */}
                <View style={[styles.orderDetailRow, styles.finalDetailRow]}>
                  <Text style={styles.itemDetailText}>
                    {firstItemName}
                    {remainingItemCount > 0 && (
                      <Text style={{ fontWeight: "400", color: "#666" }}>
                        {" "}
                        (+{remainingItemCount} more)
                      </Text>
                    )}
                  </Text>
                  <Text style={styles.orderTotalText}>
                    Total: ₹{order.totalAmount.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.buttonActionRow}>
                  {/* Action button for each specific order */}
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.addEditButton,
                      isLoading && styles.disabledButton,
                    ]}
                    onPress={() => handleContinueOrder(order)}
                    disabled={isLoading}
                  >
                    <Text style={styles.actionButtonText}>Add/Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.viewButton,
                      isLoading && styles.disabledButton,
                    ]}
                    onPress={() => handleViewOrder(order)}
                    disabled={isLoading}
                  >
                    <Text style={styles.actionButtonText}>Manage</Text>
                  </TouchableOpacity>
                </View>
                {/* Separator between orders if there's more than one */}
                {index < activeOrders.length - 1 && (
                  <View style={styles.orderSeparator} />
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptySlot}>
            <Text style={styles.emptySlotText}>Ready for Order</Text>
          </View>
        )}

        {/* --- Start New Order Button --- */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isOrderActive && styles.newOrderButton,
            isLoading && styles.disabledButton,
          ]}
          onPress={handleStartNewOrder}
          disabled={isLoading}
        >
          <Text style={styles.actionButtonText}>
            {isOrderActive ? "Start Additional Order" : "Start New Order"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Table Order Management</Text>
        <Text style={styles.subHeaderUser}>
          Logged in as: **{user?.name || "Staff"}** ({user?.role || "Server"})
        </Text>
        <Text style={styles.subHeader}>
          {isLoading && !refreshing
            ? "Auto-updating statuses..."
            : `Last updated: ${new Date().toLocaleTimeString()}`}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#005612"
          />
        }
      >
        {/* Render all tables, one per row */}
        {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map(renderTable)}
      </ScrollView>
    </View>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  header: {
    padding: 20,
    backgroundColor: "#005612",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    marginBottom: 10,
    paddingTop: Platform.OS === "android" ? 40 : 50,
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  subHeader: { fontSize: 12, color: "#C5E1A5", marginTop: 4 },
  subHeaderUser: {
    fontSize: 14,
    color: "#fff",
    marginTop: 8,
    fontWeight: "600",
  },
  scrollContent: {
    flexDirection: "column",
    alignItems: "center",
    padding: 10,
  },
  tableCard: {
    width: SCREEN_WIDTH - 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 3,
    padding: 15,
    marginBottom: 10,
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    marginBottom: 5,
  },
  tableNumberText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1C",
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  statusBadge: {
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  loadingOverlay: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  separator: {
    height: 1,
    backgroundColor: "#E0E0E0",
    width: "100%",
    marginBottom: 10,
  },
  orderSeparator: {
    height: 1,
    backgroundColor: "#E0E0E0",
    width: "90%",
    marginVertical: 10,
    alignSelf: "center",
  },

  // --- Order Details ---
  orderDetails: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F9FBE7",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  orderDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  finalDetailRow: {
    marginTop: 8, // Extra space before the final detail row
  },
  orderDetailText: {
    fontSize: 14,
    color: "#005612",
    fontWeight: "500",
  },
  orderPlacedText: {
    fontSize: 12,
    color: "#4A4A4A", // Neutral color for timestamp
    fontWeight: "500",
    fontStyle: "italic",
  },
  itemDetailText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flexShrink: 1,
    paddingRight: 10,
  },
  orderTotalText: {
    fontSize: 16,
    color: "#D32F2F",
    fontWeight: "bold",
  },
  orderStatusPill: {
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  orderStatusPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptySlot: {
    width: "100%",
    padding: 20,
    marginBottom: 8,
    alignItems: "center",
  },
  emptySlotText: {
    fontSize: 16,
    color: "#005612",
    fontWeight: "500",
  },

  // --- Button Styles ---
  actionButton: {
    backgroundColor: "#005612",
    paddingVertical: 10,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 5,
  },
  newOrderButton: {
    backgroundColor: "#005612",
    marginTop: 15,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  buttonActionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
    marginTop: 5,
  },
  addEditButton: {
    backgroundColor: "#BFA440",
    flex: 1,
    paddingVertical: 8,
  },
  viewButton: {
    backgroundColor: "#6c757d",
    flex: 1,
    paddingVertical: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
