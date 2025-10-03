import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

// ⚠️ IMPORTANT: Adjust paths as necessary
import {
  fetchCompletedOrders,
  selectCompletedOrders,
  selectTotalCompletedSales,
  selectOrderStatus,
  Order, // Import the Order interface
} from "../store/slices/orderSlice";
import { RootState, AppDispatch } from "../store/store";

// Helper to format date into 'YYYY-MM-DD' for API query
const formatDateForAPI = (date: Date) => {
  return date.toISOString().split("T")[0];
};

interface DateFilter {
  startDate: Date;
  endDate: Date;
}

// --- Grouping Logic ---

interface DailySaleGroup {
  dateKey: string; // e.g., "2025-10-01"
  dailyTotal: number;
  orders: Order[];
}

const useGroupedSales = (orders: Order[]): DailySaleGroup[] => {
  return useMemo(() => {
    const groupsMap = new Map<string, DailySaleGroup>();

    orders.forEach((order) => {
      // Use the creation date (or ideally, the bill/completion date if available)
      const date = new Date(order.createdAt);
      const dateKey = formatDateForAPI(date);

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, {
          dateKey,
          dailyTotal: 0,
          orders: [],
        });
      }

      const group = groupsMap.get(dateKey)!;
      group.dailyTotal += order.totalAmount;
      group.orders.push(order);
    });

    // Convert map to array and sort by date descending (newest day first)
    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
      // Assumes dateKey is in YYYY-MM-DD format
      return b.dateKey.localeCompare(a.dateKey);
    });

    return sortedGroups;
  }, [orders]);
};

// --- Components ---

// Component for the daily sales header
const DailySalesGroup: React.FC<{ group: DailySaleGroup }> = ({ group }) => {
  const dateDisplay = new Date(group.dateKey).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={reportStyles.dailyGroupHeader}>
      <Text style={reportStyles.dailyDateText}>{dateDisplay}</Text>
      <Text style={reportStyles.dailyTotalText}>
        Daily Total: ₹{group.dailyTotal.toFixed(2)}
      </Text>
    </View>
  );
};

// --- Completed Order Card (Simplified for Report View) ---

const CompletedOrderCard: React.FC<{ order: Order }> = ({ order }) => {
  // Since 'Billed' is the final status now, use its color
  const statusColor = "#343A40"; // STATUS_COLORS.Billed from OrderManagementScreen

  const orderTime = new Date(order.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <View style={reportStyles.card}>
      <View style={[reportStyles.cardHeader, { borderLeftColor: statusColor }]}>
        <Text style={reportStyles.tableText}>Table: {order.tableNumber}</Text>
        <Text
          style={[reportStyles.statusTag, { backgroundColor: statusColor }]}
        >
          {/* Status should always be 'Billed' here */}
          {order.status}
        </Text>
      </View>

      <View style={reportStyles.cardContent}>
        <Text style={reportStyles.orderTimeText}>
          <Ionicons name="time-outline" size={14} color="#6C757D" />
          {/* Updated text */}
          {` Finalized At: ${orderTime}`}
        </Text>
        <Text style={reportStyles.serverText}>
          <Ionicons name="person-outline" size={14} color="#6C757D" />
          {` Server ID: ...${order.server.slice(-4)}`}
        </Text>
        <Text style={reportStyles.itemsCount}>
          {`Items: ${order.items.length}`}
        </Text>
      </View>

      <View style={reportStyles.cardFooter}>
        <Text style={reportStyles.totalAmount}>
          Total: ₹{Number(order.totalAmount).toFixed(2)}
        </Text>
        <Ionicons name="checkmark-circle" size={24} color="#28A745" />
      </View>
    </View>
  );
};

// --- Main Completed Orders Report Screen ---

export default function CompletedOrdersReportScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const { user } = useSelector((state: RootState) => state.auth);
  // These selectors now implicitly return Billed orders
  const completedOrders = useSelector(selectCompletedOrders);
  const totalCompletedSales = useSelector(selectTotalCompletedSales);
  const status = useSelector(selectOrderStatus);

  // Use the grouping hook
  const groupedSales = useGroupedSales(completedOrders);

  // Check for Vendor or Billing role
  const isVendorOrBilling = user?.role === "Vendor" || user?.role === "Billing";

  // State for date filtering
  const today = new Date();
  const [dates, setDates] = useState<DateFilter>({
    // Default to the first day of the current month
    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
    endDate: today,
  });
  const [showDatePicker, setShowDatePicker] = useState<{
    start?: boolean;
    end?: boolean;
  }>({});

  const isLoading = status === "loading";

  // ⭐️ FIX APPLIED HERE ⭐️
  const loadCompletedOrders = (startDate: Date, endDate: Date) => {
    if (isVendorOrBilling) {
      // 1. Calculate the day *after* the selected endDate.
      // This ensures the API query includes all orders up to 23:59:59 of the selected endDate.
      const exclusiveEndDate = new Date(endDate);
      exclusiveEndDate.setDate(endDate.getDate() + 1);

      dispatch(
        fetchCompletedOrders({
          startDate: formatDateForAPI(startDate),
          // Pass the next day's date to the API for the exclusive upper limit
          endDate: formatDateForAPI(exclusiveEndDate),
        })
      );
    }
  };

  useEffect(() => {
    // Re-fetch data whenever the component mounts or user role changes
    loadCompletedOrders(dates.startDate, dates.endDate);
  }, [user?.role]);

  useEffect(() => {
    if (status === "failed") {
      Alert.alert("Data Error", "Failed to fetch sales report.");
    }
  }, [status]);

  // Use a refetch dependency on the date state itself
  useEffect(() => {
    loadCompletedOrders(dates.startDate, dates.endDate);
  }, [dates.startDate.toISOString(), dates.endDate.toISOString()]);

  const onRefresh = () => {
    loadCompletedOrders(dates.startDate, dates.endDate);
  };

  // Handlers for DatePicker
  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    type: "start" | "end"
  ) => {
    // Only dismiss the picker if the event is 'set' or 'dismissed' (for Android)
    if (Platform.OS === "android" || event.type === "set") {
      setShowDatePicker({});
    }

    if (selectedDate) {
      const newDates = { ...dates };

      // For startDate, keep the time at 00:00:00 (default from picker)
      if (type === "start") {
        newDates.startDate = selectedDate;
      }
      // For endDate, ensure the selected date is used (time will be 00:00:00)
      else {
        newDates.endDate = selectedDate;
      }

      // Update state. The useEffect hook with the date dependency will handle the re-fetch.
      setDates(newDates);
    }
  };

  if (!isVendorOrBilling) {
    return (
      <View style={reportStyles.centeredView}>
        <Text style={reportStyles.emptyText}>Access Denied 🔒</Text>
        <Text style={reportStyles.emptySubtitle}>
          You must be a Vendor or Biller to view this report.
        </Text>
      </View>
    );
  }

  return (
    <View style={reportStyles.container}>
      <View style={reportStyles.header}>
        <Text style={reportStyles.headerTitle}>Sales Report & History</Text>
        <Text style={reportStyles.headerSubtitle}>
          {/* Updated text */}
          {`Orders Billed/Finalized (${completedOrders.length})`}
        </Text>
      </View>

      {/* --- Total Sales Summary --- */}
      <View style={reportStyles.summaryContainer}>
        <Text style={reportStyles.summaryText}>
          Total Sales in Period ({dates.startDate.toLocaleDateString()} -{" "}
          {dates.endDate.toLocaleDateString()}):
        </Text>
        <Text style={reportStyles.salesAmount}>
          ₹
          {isLoading && completedOrders.length === 0
            ? "..."
            : Number(totalCompletedSales).toFixed(2)}
        </Text>
      </View>

      {/* --- Date Filter Section --- */}
      <View style={reportStyles.filterContainer}>
        <View style={reportStyles.dateButtonsContainer}>
          <TouchableOpacity
            style={reportStyles.dateButton}
            onPress={() => setShowDatePicker({ start: true })}
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={reportStyles.dateButtonText}>
              Start: {dates.startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={reportStyles.dateButton}
            onPress={() => setShowDatePicker({ end: true })}
          >
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={reportStyles.dateButtonText}>
              End: {dates.endDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Pickers */}
        {showDatePicker.start && (
          <DateTimePicker
            value={dates.startDate}
            mode="date"
            display="default"
            onChange={(e, date) => handleDateChange(e, date, "start")}
            // Ensure startDate cannot be after endDate
            maximumDate={dates.endDate}
          />
        )}
        {showDatePicker.end && (
          <DateTimePicker
            value={dates.endDate}
            mode="date"
            display="default"
            onChange={(e, date) => handleDateChange(e, date, "end")}
            // Ensure endDate cannot be before startDate
            minimumDate={dates.startDate}
            // Ensure endDate cannot be after today
            maximumDate={today}
          />
        )}
      </View>

      <ScrollView
        style={reportStyles.scrollView}
        contentContainerStyle={reportStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={["#28A745"]}
          />
        }
      >
        {isLoading && completedOrders.length === 0 ? (
          <View style={reportStyles.centeredView}>
            <ActivityIndicator size="large" color="#005612" />
            <Text style={reportStyles.loadingText}>Fetching Sales Data...</Text>
          </View>
        ) : groupedSales.length === 0 ? (
          <View style={reportStyles.emptyState}>
            <MaterialIcons name="local-dining" size={80} color="#ccc" />
            <Text style={reportStyles.emptyText}>No Finalized Sales</Text>
            <Text style={reportStyles.emptySubtitle}>
              Try adjusting the date range or ensure orders have been billed.
            </Text>
          </View>
        ) : (
          groupedSales.map((group) => (
            <View key={group.dateKey} style={reportStyles.dailyGroupContainer}>
              <DailySalesGroup group={group} />
              {group.orders.map((order) => (
                <CompletedOrderCard key={order._id} order={order} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// --- New Styles for Report Screen ---
const reportStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F5F0" },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F5F0",
  },
  loadingText: { marginTop: 10, fontSize: 16, color: "#005612" },

  header: {
    backgroundColor: "#343A40", // Darker header for reports
    padding: 20,
    paddingTop: Platform.OS === "android" ? 40 : 55,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 16, color: "#aaa", marginTop: 4 },

  summaryContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 5,
    borderLeftColor: "#28A745", // Green for sales
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryText: {
    fontSize: 16,
    color: "#6C757D",
    fontWeight: "600",
    textAlign: "center",
  },
  salesAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#28A745",
    marginTop: 5,
  },

  filterContainer: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  dateButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    justifyContent: "center",
  },
  dateButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  scrollView: { flex: 1, marginTop: 10 },
  scrollContent: { padding: 15, alignItems: "center", paddingTop: 0 },

  // --- Daily Grouping Styles (New) ---
  dailyGroupContainer: {
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 5, // Allows the cards inside to be centered
  },
  dailyGroupHeader: {
    width: "100%",
    backgroundColor: "#E0E0E0",
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dailyDateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#343A40",
  },
  dailyTotalText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#28A745",
  },
  // --- Card Styles ---
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    borderLeftWidth: 6,
    borderLeftColor: "#343A40",
    alignItems: "center",
  },
  tableText: { fontSize: 16, fontWeight: "bold", color: "#1C1C1C" },
  statusTag: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 15,
  },
  cardContent: {
    padding: 12,
  },
  orderTimeText: { fontSize: 12, color: "#6C757D", marginBottom: 5 },
  serverText: { fontSize: 12, color: "#6C757D", marginBottom: 5 },
  itemsCount: { fontSize: 14, color: "#343A40", fontWeight: "500" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#FAFAFA",
  },
  totalAmount: { fontSize: 18, fontWeight: "bold", color: "#1C1C1C" },

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
