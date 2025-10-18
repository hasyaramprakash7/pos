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
  LayoutAnimation, // Used for smoother visual transitions
  UIManager,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";

// ⚠️ IMPORTANT: Adjust paths as necessary
import { RootState, AppDispatch } from "../store/store";
import {
  fetchBillingOrders,
  fetchKitchenOrders,
  OrderStatus,
} from "../store/slices/orderSlice";
import { Order } from "../store/slices/orderSlice";

// Enable LayoutAnimation for Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const TABLE_COUNT = 15;
const POLLING_INTERVAL = 10000;

// --- Status Definitions and Priority Mapping (UNCHANGED) ---
type TableDisplayStatus =
  | "Vacant"
  | "Placing Order"
  | "Awaiting Service"
  | "Seated/Dining"
  | "Active Service";

interface TableStatusInfo {
  status: TableDisplayStatus;
  color: string;
}

const ACTIVE_DISPLAY_STATUSES: OrderStatus[] = [
  "Pending",
  "Kitchen",
  "Ready",
  "Served",
];

const STATUS_PRIORITY: { [key in OrderStatus]?: number } = {
  Ready: 4, // -> Awaiting Service
  Served: 3, // -> Seated/Dining
  Pending: 2, // -> Placing Order
  Kitchen: 1, // -> Placing Order
  Billed: 0,
  Completed: 0,
};

const getTableStatusProps = (
  status: OrderStatus | "Available"
): TableStatusInfo => {
  switch (status) {
    case "Ready":
      return { status: "Awaiting Service", color: "#D32F2F" }; // Crimson Red
    case "Served":
      return { status: "Seated/Dining", color: "#C09F80" }; // Rich Brass
    case "Pending":
    case "Kitchen":
      return { status: "Placing Order", color: "#FFC107" }; // Classic Gold
    case "Billed":
    case "Completed":
    case "Available":
    default:
      return { status: "Vacant", color: "#1D3557" }; // Elegant Dark Green/Navy
  }
};

/**
 * Helper function to format the timestamp into a readable date and time. (UNCHANGED)
 */
const formatDateTime = (dateString: string | Date | undefined): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return date.toLocaleDateString(undefined, options);
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Invalid Date";
  }
};

// ====================================================================
// --- New Component: Order Details Dock (Rendered inside the Screen) ---
// ====================================================================

interface OrderDocketProps {
  order: Order;
  handleContinueOrder: (order: Order) => void;
  handleViewOrder: (order: Order) => void;
  isLoading: boolean;
}

const OrderDocket = React.memo(
  ({
    order,
    handleContinueOrder,
    handleViewOrder,
    isLoading,
  }: OrderDocketProps) => {
    const orderStatusProps = getTableStatusProps(order.status);
    const firstItemName =
      order.items && order.items.length > 0
        ? order.items[0].name
        : "No Items Added";
    const remainingItemCount = (order.items?.length || 0) - 1;
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
            Order Docket:{" "}
            <Text style={styles.boldText}>#{order._id.slice(-4)}</Text>
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

        {/* Date and Time */}
        <View style={styles.orderDetailRow}>
          <Text style={styles.orderPlacedText}>
            Commenced: <Text style={styles.boldText}>{orderDateTime}</Text>
          </Text>
        </View>

        {/* Item Name and Total Amount Display */}
        <View style={[styles.orderDetailRow, styles.finalDetailRow]}>
          <Text style={styles.itemDetailText}>
            **{firstItemName}**
            {remainingItemCount > 0 && (
              <Text style={styles.additionalCoursesText}>
                {" "}
                (+{remainingItemCount} additional courses)
              </Text>
            )}
          </Text>
          <Text style={styles.orderTotalText}>
            Value: ₹{order.totalAmount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.buttonActionRow}>
          {/* Action button for each specific order */}
          <TouchableOpacity
            style={[
              styles.actionButtonSmall,
              { backgroundColor: "#C09F80" }, // Subtle Brass/Copper
              isLoading && styles.disabledButton,
            ]}
            onPress={() => handleContinueOrder(order)}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonTextSmall}>Refine Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButtonSmall,
              { backgroundColor: "#A9A9A9" }, // Silver/Dark Grey
              isLoading && styles.disabledButton,
            ]}
            onPress={() => handleViewOrder(order)}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonTextSmall}>Service Log</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

// ====================================================================
// --- Main Component: TableSelectionScreen ---
// ====================================================================

export default function TableSelectionScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const isFocused = useIsFocused();

  const user = useSelector((state: RootState) => state.auth.user);
  const kitchenOrders = useSelector(
    (state: RootState) => state.order.kitchenOrders
  );
  const billingOrders = useSelector(
    (state: RootState) => state.order.billingOrders
  );
  const loadingStatus = useSelector((state: RootState) => state.order.status);
  const isLoading = loadingStatus === "loading";
  const [refreshing, setRefreshing] = useState(false);

  // 💡 NEW STATE: Track the currently selected table
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // CONSOLIDATED LIST & Polling Logic (UNCHANGED)
  const allActiveOrders = useMemo(() => {
    return [...kitchenOrders, ...billingOrders];
  }, [kitchenOrders, billingOrders]);

  const handleFetchOrders = useCallback(() => {
    return Promise.allSettled([
      dispatch(fetchKitchenOrders()),
      dispatch(fetchBillingOrders()),
    ]);
  }, [dispatch]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    handleFetchOrders();
    const intervalId = setInterval(handleFetchOrders, POLLING_INTERVAL);
    return () => clearInterval(intervalId);
  }, [isFocused, handleFetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    handleFetchOrders().then(() => {
      setRefreshing(false);
    });
  }, [handleFetchOrders]);

  // MODIFIED MAP CALCULATION (UNCHANGED)
  const tableDataMap = useMemo(() => {
    const map: { [key: number]: Order[] } = {};

    allActiveOrders
      .filter((order) => ACTIVE_DISPLAY_STATUSES.includes(order.status))
      .forEach((order) => {
        const tableNumber = order.tableNumber;
        if (!map[tableNumber]) {
          map[tableNumber] = [];
        }
        map[tableNumber].push(order);
      });

    Object.values(map).forEach((orders) => {
      orders.sort((a, b) => {
        const priorityA = STATUS_PRIORITY[a.status] || 0;
        const priorityB = STATUS_PRIORITY[b.status] || 0;
        return priorityB - priorityA;
      });
    });

    return map;
  }, [allActiveOrders]);

  const getTablePrimaryStatus = (tableNumber: number) => {
    const orders = tableDataMap[tableNumber];
    if (orders && orders.length > 0) {
      return orders[0].status;
    }
    return "Available";
  };

  // 💡 NEW HANDLER: Toggles the selected table
  const handleTablePress = useCallback((tableNumber: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedTable((prev) => (prev === tableNumber ? null : tableNumber));
  }, []);

  const handleStartNewOrder = useCallback(
    (tableNumber: number) => {
      navigation.navigate("Menu", {
        tableNumber,
        existingOrderId: undefined,
      });
    },
    [navigation]
  );

  const handleContinueOrder = useCallback(
    (order: Order) => {
      navigation.navigate("Menu", {
        tableNumber: order.tableNumber,
        existingOrderId: order._id,
      });
    },
    [navigation]
  );

  const handleViewOrder = useCallback(
    (order: Order) => {
      navigation.navigate("OrderManagement", {
        orderIdFilter: order._id,
        tableNumberFilter: order.tableNumber,
      });
    },
    [navigation]
  );

  // --- RENDER FUNCTIONS ---

  const renderTableCard = (tableNumber: number) => {
    const isSelected = selectedTable === tableNumber;
    const activeOrders = tableDataMap[tableNumber] || [];
    const primaryStatus = getTablePrimaryStatus(tableNumber);
    const { status, color } = getTableStatusProps(primaryStatus);
    const isOrderActive = activeOrders.length > 0;

    return (
      <TouchableOpacity
        key={tableNumber}
        style={[
          styles.tableCard,
          { borderColor: color },
          isSelected && styles.tableCardSelected, // Highlight if selected
        ]}
        onPress={() => handleTablePress(tableNumber)}
        activeOpacity={0.8}
      >
        {/* --- Table Header (Visible for all) --- */}
        <View style={styles.tableHeader}>
          <MaterialCommunityIcons
            name="table-furniture"
            size={32}
            color={color}
          />
          <View style={[styles.statusBadge, { backgroundColor: color }]}>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        <Text style={styles.tableNumberText}>
          The Grand Table {tableNumber}
        </Text>

        {/* Loading Indicator */}
        {isLoading && !refreshing && (
          <ActivityIndicator
            size="small"
            color="#F9A825"
            style={styles.loadingOverlay}
          />
        )}

        {/* Active Order Count Badge */}
        {isOrderActive && (
          <View
            style={[styles.activeOrderCountBadge, { backgroundColor: color }]}
          >
            <Text style={styles.activeOrderCountText}>
              {activeOrders.length}
            </Text>
          </View>
        )}

        {/* --- Order Details Section (Conditionally Rendered) --- */}
        {isSelected && (
          <View style={styles.detailsContainer}>
            <View style={styles.separator} />

            {isOrderActive ? (
              activeOrders.map((order, index) => (
                <View key={order._id}>
                  <OrderDocket
                    order={order}
                    handleContinueOrder={handleContinueOrder}
                    handleViewOrder={handleViewOrder}
                    isLoading={isLoading}
                  />
                  {index < activeOrders.length - 1 && (
                    <View style={styles.orderSeparator} />
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptySlot}>
                <Text style={styles.emptySlotText}>
                  Prepared for New Patronage
                </Text>
              </View>
            )}

            {/* Start New Order Button (Always visible when expanded) */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                isOrderActive && styles.newOrderButton,
                isLoading && styles.disabledButton,
              ]}
              onPress={() => handleStartNewOrder(tableNumber)}
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>
                {isOrderActive
                  ? "Initiate Supplementary Order"
                  : "Commence New Service"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="crown"
          size={36}
          color="#FFC107"
          style={{ marginBottom: 5 }}
        />
        <Text style={styles.headerTitle}>Grand Hall Service Registry</Text>
        <Text style={styles.subHeaderUser}>
          Maitre D':{" "}
          <Text style={styles.boldText}>{user?.name || "Staff"}</Text> (
          <Text style={styles.boldText}>{user?.role || "Server"}</Text>)
        </Text>
        <Text style={styles.subHeader}>
          {isLoading && !refreshing
            ? "Live Registry Refreshing..."
            : `Last synchronized: ${new Date().toLocaleTimeString()}`}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F9A825"
          />
        }
      >
        {/* Render all tables */}
        {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map(
          renderTableCard
        )}
      </ScrollView>
    </View>
  );
}

// ====================================================================
// --- Stylesheet (ADJUSTED FOR NEW LAYOUT) ---
// ====================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EAEAEA" },
  header: {
    padding: 20,
    backgroundColor: "#0B132B", // Royal Dark Navy
    marginBottom: 15,
    paddingTop: Platform.OS === "android" ? 40 : 50,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFC107", // Gold
    letterSpacing: 1.5,
    // fontVariant: ['small-caps'], // Removed as it can cause warnings on some platforms
  },
  subHeader: {
    fontSize: 12,
    color: "#A9A9A9", // Silver/Grey
    marginTop: 4,
    fontStyle: "italic",
  },
  subHeaderUser: {
    fontSize: 14,
    color: "#fff",
    marginTop: 10,
    fontWeight: "600",
  },
  boldText: {
    fontWeight: "bold",
    color: "#FFC107",
  },
  scrollContent: {
    flexDirection: "column",
    alignItems: "center",
    padding: 15,
    paddingBottom: 30,
  },
  tableCard: {
    width: SCREEN_WIDTH - 30,
    backgroundColor: "#fff",
    borderRadius: 15,
    borderWidth: 4,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    // Base Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  tableCardSelected: {
    // Enhanced shadow/border on selection
    borderWidth: 6,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 12,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  tableNumberText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0B132B",
    marginBottom: 10,
    alignSelf: "flex-start",
    letterSpacing: 0.5,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  activeOrderCountBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  activeOrderCountText: {
    color: "#0B132B",
    fontWeight: "bold",
    fontSize: 14,
  },
  loadingOverlay: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 5,
  },
  detailsContainer: {
    width: "100%",
    paddingTop: 10,
  },
  separator: {
    height: 2,
    backgroundColor: "#F9A825", // Gold separator
    width: "100%",
    marginBottom: 15,
  },
  orderSeparator: {
    height: 1,
    backgroundColor: "#E0E0E0",
    width: "90%", // Adjusted to be inside the orderDetails box
    marginVertical: 10,
    alignSelf: "center",
  },

  // --- Order Details Dock Styles (Used by OrderDocket Component) ---
  orderDetails: {
    width: "100%",
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  orderDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  finalDetailRow: {
    marginTop: 10,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  orderDetailText: {
    fontSize: 14,
    color: "#0B132B",
    fontWeight: "600",
  },
  orderPlacedText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    fontStyle: "italic",
  },
  itemDetailText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "700",
    flexShrink: 1,
    paddingRight: 10,
  },
  additionalCoursesText: {
    fontWeight: "400",
    color: "#A9A9A9",
  },
  orderTotalText: {
    fontSize: 18,
    color: "#D32F2F",
    fontWeight: "900",
  },
  orderStatusPill: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  orderStatusPillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  emptySlot: {
    width: "100%",
    padding: 20,
    marginBottom: 15,
    alignItems: "center",
    backgroundColor: "#EFEFEF",
    borderRadius: 10,
  },
  emptySlotText: {
    fontSize: 16,
    color: "#1D3557",
    fontWeight: "600",
    fontStyle: "italic",
  },

  // --- Button Styles ---
  actionButton: {
    backgroundColor: "#0B132B",
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newOrderButton: {
    backgroundColor: "#1D3557",
    marginTop: 20,
  },
  actionButtonText: {
    color: "#FFC107",
    fontSize: 15,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  buttonActionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  actionButtonSmall: {
    flex: 1,
    paddingVertical: 8, // Reduced vertical padding for smaller buttons
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonTextSmall: {
    color: "#0B132B", // Dark text on lighter buttons for better contrast
    fontSize: 13,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.4,
  },
});
