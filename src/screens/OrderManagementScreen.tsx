import React, { useEffect, useState, useMemo } from "react";
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
  Billed: "#343A40", // Dark Gray (Final Status Color - Visible for Vendor/Billing reports)
  // 'Completed' removed from lifecycle
};

// Define minimal Order structure for prop type checking
interface Order {
  _id: string;
  tableNumber: number;
  status: string;
  server: string;
  vendorId: string;
  totalAmount: number;
  createdAt: string;
  serverName?: string;
  serverRole?: string;
  notes?: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    itemTableNumber: number;
    addons?: string[];
    notes?: string;
    _id: string;
  }[];
}

// --- Order Card Component ---
const OrderCard: React.FC<{
  order: Order;
  role: string;
  onUpdate: (orderId: string, newStatus: string) => void;
}> = ({ order, role, onUpdate }) => {
  let nextStatus = "";
  let buttonText = "";
  let buttonColor = "#005612";

  const isVendor = role === "Vendor";
  const isBilling = role === "Billing";
  const isServer = role === "Server";

  // Logic for action button: Stops at 'Billed'
  if (isVendor) {
    switch (order.status) {
      case "Pending":
        nextStatus = "Kitchen";
        buttonText = "Send to Kitchen";
        buttonColor = "#007BFF";
        break;
      case "Kitchen":
        nextStatus = "Ready";
        buttonText = "Mark Ready";
        buttonColor = "#28A745";
        break;
      case "Ready":
        nextStatus = "Served";
        buttonText = "Mark Served";
        buttonColor = "#17A2B8";
        break;
      case "Served":
        nextStatus = "Billed";
        buttonText = "Finalize Bill";
        buttonColor = "#BFA440";
        break;
      case "Billed": // FINAL STATUS - No further transition
        nextStatus = "";
        buttonText = "Billed - Final Stage";
        buttonColor = STATUS_COLORS.Billed;
        break;
      default:
        break;
    }
  } else if (
    role === "Kitchen" &&
    (order.status === "Pending" || order.status === "Kitchen")
  ) {
    nextStatus = "Ready";
    buttonText = "Mark Ready";
    buttonColor = "#28A745";
  } else if (
    isBilling &&
    (order.status === "Ready" || order.status === "Served")
  ) {
    nextStatus = "Billed";
    buttonText = "Finalize Bill";
    buttonColor = "#BFA440";
  } else if (isServer && order.status === "Ready") {
    nextStatus = "Served";
    buttonText = "Mark Served";
    buttonColor = "#17A2B8";
  }

  const statusBg = STATUS_COLORS[order.status] || "#ccc";
  const placingStaffName = order.serverName || "Staff";
  const placingStaffRole =
    order.serverRole || (order.server === order.vendorId ? "Vendor" : "Server");
  const shortServerId = order.server ? order.server.slice(-4) : "N/A";

  const orderTime = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

  const orderNotes = order.notes;

  const isFinalized = order.status === "Billed"; // Check against the new final status

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
            </Text>
            {` (${placingStaffName} - ...${shortServerId})`}
          </Text>
        </View>
        <Text style={[styles.statusTag, { backgroundColor: statusBg }]}>
          {order.status}
        </Text>
      </View>

      {/* Time and Order-Level Notes Section */}
      <View style={styles.timeAndNotesContainer}>
        <Text style={styles.orderTimeText}>
          <Ionicons name="time-outline" size={14} color="#6C757D" />
          {` Ordered At: ${orderTime}`}
        </Text>
        {orderNotes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesHeader}>
              <Ionicons
                name="chatbox-ellipses-outline"
                size={14}
                color="#856404"
              />
              {` Order Notes:`}
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

            {/* Display Item Addons */}
            {item.addons && item.addons.length > 0 ? (
              <View style={styles.itemAddonsContainer}>
                <Text style={styles.itemAddonsText}>
                  {`+ Addons: ${item.addons.join(", ")}`}
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
        {nextStatus && !isFinalized ? (
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: buttonColor }]}
            onPress={() => onUpdate(order._id, nextStatus)}
            disabled={isFinalized}
          >
            <Text style={styles.updateButtonText}>{buttonText}</Text>
            <MaterialIcons name="done" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.noActionText}>
            {isFinalized
              ? "Order Billed & Finalized" // Updated text
              : "Awaiting action"}
          </Text>
        )}
      </View>
    </View>
  );
};

// ------------------------------------------------------------------
// --- Main Screen Component (Implementing Vendor Tabs) ---
// ------------------------------------------------------------------

export default function OrderManagementScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const { user } = useSelector((state: RootState) => state.auth);
  const { kitchenOrders, billingOrders, status, error } = useSelector(
    (state: RootState) => state.order
  );

  const userRole = user?.role;
  const isKitchen = userRole === "Kitchen";
  const isBilling = userRole === "Billing";
  const isServer = userRole === "Server";
  const isVendor = userRole === "Vendor";

  const REPORT_TAB_NAME = "Sales Report";
  const FINALIZED_TAB_NAME = "Finalized Bills";

  // --- Initial Tab Logic Refinement ---
  const getInitialTab = (bOrders: Order[]) => {
    if (isVendor) return "Pending";
    if (isKitchen) return "Active KOTs";

    // For Billing role, if there are any Billed orders, default to Finalized Bills tab
    if (isBilling && bOrders.some((o) => o.status === "Billed")) {
      return FINALIZED_TAB_NAME;
    }
    return "Active Bills"; // Default for Billing/Server
  };

  // Initialize with an educated guess, will be refined in useEffect after fetch
  const [activeStatusTab, setActiveStatusTab] = useState<string>(
    getInitialTab(billingOrders as Order[])
  );

  const fetchData = () => {
    if (isKitchen) {
      dispatch(fetchKitchenOrders());
    } else if (isVendor) {
      // Vendor fetches all active lists
      dispatch(fetchKitchenOrders());
      dispatch(fetchBillingOrders());
    } else {
      // Billing and Server use the Billing endpoint for Ready/Served/Billed orders
      dispatch(fetchBillingOrders());
    }
  };

  // Memoize processed and filtered orders
  const processedOrders = useMemo(() => {
    let orders: Order[] = [];
    let title = "Order Status Board";
    let subtitle = "";
    let currentTabStatusName = "";
    let totalBilledAmount = 0;

    if (isKitchen) {
      orders = kitchenOrders as Order[];
      title = "Kitchen KOT View";
      subtitle = "Orders to be Prepared (Pending & Kitchen)";
      currentTabStatusName = "Kitchen";
    } else if (isVendor) {
      // Vendor combines and filters by activeStatusTab
      const allOrders = [...kitchenOrders, ...billingOrders] as Order[];
      const uniqueOrdersMap = new Map();
      allOrders.forEach((order) => {
        uniqueOrdersMap.set(order._id, order);
      });
      orders = Array.from(uniqueOrdersMap.values());

      title = "Vendor Supervisory Board";

      // --- VENDOR FILTERING LOGIC ---
      if (activeStatusTab === REPORT_TAB_NAME || activeStatusTab === "Billed") {
        // Sales Report/Billed tab shows all Billed orders
        orders = orders.filter((o) => o.status === "Billed");
        totalBilledAmount = orders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        );
        subtitle = `Billed Orders Total: ₹${totalBilledAmount.toFixed(2)}`;
        currentTabStatusName = "Billed";
      } else {
        orders = orders.filter((o) => o.status === activeStatusTab);
        subtitle = `Viewing: ${activeStatusTab} - Total: ${orders.length}`;
        currentTabStatusName = activeStatusTab;
      }

      // Sort the filtered orders by time (newest first)
      orders.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (isBilling || isServer) {
      // Billing and Server logic
      orders = billingOrders as Order[];
      const roleName = isBilling ? "Billing" : "Server";

      // --- BILLING/SERVER FILTERING LOGIC ---
      if (activeStatusTab.includes(FINALIZED_TAB_NAME)) {
        // Show Billed orders
        orders = orders.filter((o) => o.status === "Billed");

        totalBilledAmount = orders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        );

        title = `${roleName} Finalized Bills`;
        currentTabStatusName = "Billed";
        subtitle = `Billed Orders (${
          orders.length
        }) | Total: ₹${totalBilledAmount.toFixed(2)}`;
      } else {
        // Active Tab (Ready/Served)
        const activeStatuses = isServer
          ? ["Ready"] // Server focuses on Ready for pickup
          : ["Ready", "Served"]; // Billing sees everything up to Served

        orders = orders.filter((o) => activeStatuses.includes(o.status));
        title = isBilling
          ? "Billing and Finalization"
          : "Server Pickup & Service";

        currentTabStatusName = activeStatusTab;
        subtitle = `Active Bills: ${orders.length}`;
      }

      // Sort for non-vendor roles
      orders.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return {
      listToDisplay: orders,
      screenTitle: title,
      screenSubtitle: subtitle,
      currentTabStatusName: currentTabStatusName,
    };
  }, [userRole, kitchenOrders, billingOrders, activeStatusTab, navigation]);

  const { listToDisplay, screenTitle, screenSubtitle, currentTabStatusName } =
    processedOrders;

  // Determine all available statuses for the vendor tabs
  const availableStatuses = useMemo(() => {
    if (!isVendor) return { statuses: [], counts: {} };

    const allOrders = [...kitchenOrders, ...billingOrders] as Order[];
    const uniqueOrdersMap = new Map();
    allOrders.forEach((order) => uniqueOrdersMap.set(order._id, order));

    const statusCounts: { [key: string]: number } = {
      Pending: 0,
      Kitchen: 0,
      Ready: 0,
      Served: 0,
      Billed: 0,
      [REPORT_TAB_NAME]: 0,
    };

    Array.from(uniqueOrdersMap.values()).forEach((order: Order) => {
      if (statusCounts.hasOwnProperty(order.status)) {
        statusCounts[order.status]++;
      }
    });

    const statusOrder = ["Pending", "Kitchen", "Ready", "Served", "Billed"];

    let filteredStatuses = statusOrder.filter(
      (status) => statusCounts[status] > 0
    );

    // Add the special 'Sales Report' tab if there are any Billed orders
    if (statusCounts["Billed"] > 0) {
      filteredStatuses.push(REPORT_TAB_NAME);
    }

    // The Sales Report tab count should mirror the Billed count
    statusCounts[REPORT_TAB_NAME] = statusCounts["Billed"];

    return {
      statuses: filteredStatuses,
      counts: statusCounts,
    };
  }, [kitchenOrders, billingOrders, isVendor]);

  // Set initial active tab for Vendor/Billing after data loads
  useEffect(() => {
    if (isVendor && availableStatuses.statuses.length > 0) {
      // Ensure the active tab is one of the available status tabs
      if (!availableStatuses.statuses.includes(activeStatusTab)) {
        setActiveStatusTab(availableStatuses.statuses[0]);
      }
    } else if (isBilling && billingOrders.length > 0) {
      // Ensure Billing starts on the most relevant tab after fetch
      if (
        billingOrders.some((o) => o.status === "Billed") &&
        activeStatusTab !== FINALIZED_TAB_NAME
      ) {
        setActiveStatusTab(FINALIZED_TAB_NAME);
      } else if (
        !isServer &&
        !billingOrders.some((o) => ["Ready", "Served"].includes(o.status)) &&
        activeStatusTab !== FINALIZED_TAB_NAME
      ) {
        // If no active bills, but there are finalized bills, switch to finalized.
        if (billingOrders.some((o) => o.status === "Billed")) {
          setActiveStatusTab(FINALIZED_TAB_NAME);
        }
      }
    }
  }, [
    isVendor,
    isBilling,
    availableStatuses.statuses,
    activeStatusTab,
    billingOrders,
  ]);

  useEffect(() => {
    fetchData();
  }, [userRole]);

  useEffect(() => {
    if (status === "failed" && error) {
      Alert.alert("Data Error", error);
    }
  }, [status, error]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    Alert.alert(
      "Confirm Status Change",
      `Set order ${orderId.slice(-4)} status to ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            dispatch(
              updateOrderStatus({ orderId, newStatus: newStatus as any })
            );
          },
        },
      ]
    );
  };

  if (
    status === "loading" &&
    listToDisplay.length === 0 &&
    !isVendor &&
    !refreshing
  ) {
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color="#005612" />
        <Text style={styles.loadingText}>Loading Orders...</Text>
      </View>
    );
  }

  // --- Vendor Tab Bar Component ---
  const VendorStatusTabs = () => {
    return (
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableStatuses.statuses.map((statusName) => {
            const count = availableStatuses.counts[statusName];

            const handlePress = () => {
              setActiveStatusTab(statusName);
              // Navigation can be added here if needed, but the filtering is local
            };

            return (
              <TouchableOpacity
                key={statusName}
                style={[
                  styles.tabButton,
                  activeStatusTab === statusName && styles.activeTabButton,
                ]}
                onPress={handlePress}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeStatusTab === statusName && styles.activeTabText,
                  ]}
                >
                  {`${statusName} (${count})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // --- Billing/Server Tab Bar Component ---
  const OtherRolesTabs = () => {
    if (!isBilling && !isServer) return null;

    const tabs = isServer
      ? ["Ready for Service"]
      : ["Active Bills", FINALIZED_TAB_NAME];

    // Orders that need immediate attention (Ready/Served)
    const activeCount = billingOrders.filter((o) =>
      isServer ? o.status === "Ready" : ["Ready", "Served"].includes(o.status)
    ).length;

    // Orders that are billed (new final state for reporting)
    const billedCount = billingOrders.filter(
      (o) => o.status === "Billed"
    ).length;

    const getCount = (tabName: string) => {
      if (tabName.includes("Active") || tabName.includes("Ready"))
        return activeCount;
      if (tabName.includes("Finalized")) return billedCount;
      return 0;
    };

    return (
      <View style={styles.tabContainer}>
        {tabs.map((tabName) => {
          const handlePress = () => {
            setActiveStatusTab(tabName);
          };

          return (
            <TouchableOpacity
              key={tabName}
              style={[
                styles.tabButton,
                activeStatusTab === tabName && styles.activeTabButton,
                {
                  flex: isServer ? 1 : 0,
                  width: isServer ? "auto" : "45%",
                  marginHorizontal: isServer ? 5 : "2.5%",
                },
              ]}
              onPress={handlePress}
            >
              <Text
                style={[
                  styles.tabText,
                  activeStatusTab === tabName && styles.activeTabText,
                  { textAlign: "center" },
                ]}
              >
                {`${tabName} (${getCount(tabName)})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // --- Determine Header Background Color ---
  const getHeaderBackgroundColor = (statusName: string) => {
    if (isKitchen) return STATUS_COLORS.Kitchen;

    // Vendor and Billing/Server Finalized Tab
    if (
      statusName === "Billed" ||
      statusName === REPORT_TAB_NAME ||
      statusName === FINALIZED_TAB_NAME
    ) {
      return STATUS_COLORS.Billed;
    }

    // Default to Active/Ready colors
    if (
      statusName === "Ready" ||
      statusName === "Served" ||
      statusName.includes("Active") ||
      statusName.includes("Ready for Service")
    ) {
      return STATUS_COLORS.Ready;
    }

    // Vendor Pending/Kitchen
    if (STATUS_COLORS[statusName]) return STATUS_COLORS[statusName];

    return "#6c757d"; // Fallback
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{screenTitle}</Text>
        <Text style={styles.headerSubtitle}>{screenSubtitle}</Text>
      </View>

      {/* Display Tabs for Vendor */}
      {isVendor && <VendorStatusTabs />}

      {/* Display Tabs for Billing/Server */}
      {(isBilling || isServer) && <OtherRolesTabs />}

      {/* --- Dynamic Status Header for ALL roles --- */}
      {userRole && !isKitchen && (
        <Text
          style={[
            styles.vendorStatusHeader,
            { backgroundColor: getHeaderBackgroundColor(currentTabStatusName) },
          ]}
        >
          {currentTabStatusName === "Billed"
            ? `Finalized Bills (${listToDisplay.length})`
            : `${activeStatusTab} (${listToDisplay.length})`}
        </Text>
      )}

      {/* --- Kitchen Specific Header --- */}
      {isKitchen && (
        <Text
          style={[
            styles.vendorStatusHeader,
            { backgroundColor: getHeaderBackgroundColor("Kitchen") },
          ]}
        >
          {`Active KOTs (${listToDisplay.length})`}
        </Text>
      )}

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
        {listToDisplay.length === 0 &&
        status !== "loading" &&
        !activeStatusTab.includes("Report") ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="local-dining" size={80} color="#ccc" />
            <Text style={styles.emptyText}>
              No Orders in {isKitchen ? "Kitchen Queue" : activeStatusTab}
            </Text>
            <Text style={styles.emptySubtitle}>
              The queue is clear! Refresh to check again.
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

// ------------------------------------------------------------------
// --- Styles (Unchanged) ---
// ------------------------------------------------------------------

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

  // --- Vendor Tab Styles ---
  tabContainer: {
    height: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 5,
    paddingLeft: 10,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  tabButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    height: 40,
    justifyContent: "center",
  },
  activeTabButton: {
    backgroundColor: "#005612",
  },
  tabText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 14,
  },
  activeTabText: {
    color: "#fff",
  },
  vendorStatusHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    textAlign: "center",
    marginBottom: 10,
    marginHorizontal: 15,
    borderRadius: 8,
  },
  // ---------------------------------

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
  serverText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
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
    flexDirection: "row",
    alignItems: "center",
  },
  notesBox: {
    marginTop: 5,
    padding: 8,
    backgroundColor: "#FFF3CD",
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
    backgroundColor: "#D4EDDA",
    borderRadius: 4,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  itemAddonsText: {
    fontSize: 12,
    color: "#155724",
    fontStyle: "italic",
    fontWeight: "500",
  },

  // UPDATED Style for item-specific NOTES (Bolder background/text)
  itemNotesContainer: {
    marginLeft: 30,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F8D7DA",
    borderRadius: 4,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  itemNotesText: {
    fontSize: 13,
    color: "#721C24",
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
