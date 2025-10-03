import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

// ⚠️ IMPORTANT: Adjust paths as necessary
import { createOrder } from "../store/slices/orderSlice";
// Assuming you have an action to fetch a single order by ID
// import { fetchOrderById } from "../store/slices/orderSlice";
import { RootState, AppDispatch } from "../store/store";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// Define the structure for the cart items passed via route params
interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  status?: string;
}

// Define a structure for an existing active order from the server
interface ActiveOrder {
  _id: string;
  status: string;
  totalAmount: number;
  items: CartItem[];
}

// Define the structure of the route parameters
type CreateOrderRouteParams = {
  orderItems: CartItem[];
  tableNumber: number;
  existingOrderId?: string; // <<-- NEW: Expecting this from TableSelection
};

type RootStackParamList = {
  CreateOrder: CreateOrderRouteParams;
  OrderManagement: undefined;
  KitchenDashboard: undefined;
};

type CreateOrderScreenRouteProp = RouteProp<RootStackParamList, "CreateOrder">;

export default function OrderConfirmationScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const route = useRoute<CreateOrderScreenRouteProp>();

  const {
    orderItems: localCartItems,
    tableNumber,
    existingOrderId, // <<-- Get the existing ID
  } = route.params;

  const { user } = useSelector((state: RootState) => state.auth);
  const userRole = user?.role;

  const { status } = useSelector((state: RootState) => state.order);
  const isLoading = status === "loading";

  // --- STATE for Existing Order ---
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [activeOrderError, setActiveOrderError] = useState<string | null>(null);

  // --- Notes state for NEW items ---
  const [itemSpecificNotes, setItemSpecificNotes] = useState<{
    [itemId: string]: string;
  }>({});

  // --- Active Order Fetch Logic ---
  const fetchOrder = async (orderId: string) => {
    setIsOrderLoading(true);
    setActiveOrderError(null);

    try {
      // 🚨 REAL IMPLEMENTATION: Use your Redux thunk here to fetch the order by ID
      // const response = await dispatch(fetchOrderById(orderId)).unwrap();
      // setActiveOrder(response);

      // --- TEMPORARY MOCK FOR DEMONSTRATION ONLY ---
      // Simulates finding the order data to match the screenshot scenario
      let mockOrder: ActiveOrder | null = null;
      if (orderId === `ORD${tableNumber}001`) {
        mockOrder = {
          _id: orderId,
          status: "Pending",
          totalAmount: 1551.5,
          items: [
            {
              menuItemId: "m002",
              name: "Existing Sandwich",
              price: 450.5,
              quantity: 3,
              notes: "None",
              status: "Completed",
            },
            {
              menuItemId: "m001",
              name: "Existing Coffee",
              price: 100,
              quantity: 2,
              notes: "Less sugar",
              status: "Pending",
            },
          ],
        };
      }
      setActiveOrder(mockOrder);
      // --- END TEMPORARY MOCK ---

      if (mockOrder && mockOrder.status !== "Completed") {
        Alert.alert(
          "Active Order Found",
          `Table ${tableNumber} already has an active order (${mockOrder.status}). The view below shows the existing order items.`
        );
      }
    } catch (err) {
      setActiveOrderError("Failed to fetch active order details.");
      console.error("Fetch Active Order Error:", err);
    } finally {
      setIsOrderLoading(false);
    }
  };

  useEffect(() => {
    if (existingOrderId) {
      fetchOrder(existingOrderId);
    }
  }, [existingOrderId]);

  // --- CORE LOGIC ---
  const isActiveOrderFound = activeOrder && activeOrder.status !== "Completed";

  // If an active order is found, display its items. Otherwise, display the local cart.
  const displayedItems = isActiveOrderFound
    ? activeOrder!.items
    : localCartItems;

  // Determine totals based on the currently displayed list
  const totalAmount = displayedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalItemsCount = displayedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const handleSubmitOrder = async () => {
    // ... (Submission logic remains the same) ...

    // Prevent submission if an active, uncompleted order exists
    if (isActiveOrderFound) {
      Alert.alert(
        "Order Conflict",
        `Table ${tableNumber} already has an active order (${
          activeOrder!.status
        }). Use the main button below to manage it.`
      );
      return;
    }

    if (localCartItems.length === 0) {
      Alert.alert("Cart Empty", "Cannot send an empty order.");
      return;
    }

    const finalItems = localCartItems.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      itemTableNumber: tableNumber,
      notes: itemSpecificNotes[item.menuItemId] || "",
    }));

    const orderPayload = {
      tableNumber: tableNumber,
      items: finalItems,
    };

    try {
      await dispatch(createOrder(orderPayload)).unwrap();
      Alert.alert(
        "Order Sent!",
        `Order for Table ${tableNumber} has been sent to the Kitchen.`,
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate(
                userRole === "Kitchen" ? "KitchenDashboard" : "OrderManagement"
              );
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Submission Failed", error as string);
    }
  };

  const renderItemCard = (item: CartItem, isExisting: boolean) => (
    <View
      key={item.menuItemId + (isExisting ? item._id : item.menuItemId)}
      style={styles.itemCard}
    >
      <View style={styles.itemHeader}>
        <Text style={[styles.itemName, isExisting && { color: "#D32F2F" }]}>
          {item.name} {isExisting && item.status && `(${item.status})`}
        </Text>
        <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
        <Text style={styles.itemTotal}>
          ₹{(item.price * item.quantity).toFixed(2)}
        </Text>
      </View>

      {/* Display existing notes or show input for new item notes */}
      {isExisting ? (
        <Text style={styles.notesDisplay}>Notes: {item.notes || "None"}</Text>
      ) : (
        <TextInput
          placeholder="Specific notes for this item (e.g., extra spicy)"
          style={styles.notesInput}
          onChangeText={(text) =>
            setItemSpecificNotes((prev) => ({
              ...prev,
              [item.menuItemId]: text,
            }))
          }
          value={itemSpecificNotes[item.menuItemId]}
          multiline
        />
      )}
    </View>
  );

  // Determine the primary action button text
  const buttonText = isActiveOrderFound
    ? `View Active Order (${activeOrder!.status})`
    : `Send New Order (${localCartItems.length} items)`;

  // Determine the action for the main button
  const handleMainButtonPress = () => {
    if (isActiveOrderFound) {
      // Action when an existing order is found: Navigate to management screen
      navigation.navigate("OrderManagement", {
        orderIdFilter: activeOrder!._id,
      });
    } else {
      // Action for a new order: Submit the local cart
      handleSubmitOrder();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Confirm Order for Table {tableNumber}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* --- 1. Table Number Display --- */}
        <Text style={styles.sectionTitle}>Main Table</Text>
        <View style={styles.tableDisplay}>
          <Ionicons name="tablet-landscape-outline" size={24} color="#005612" />
          <Text style={styles.tableNumberText}>
            Table <Text style={styles.boldText}>{tableNumber}</Text>
          </Text>
        </View>

        {/* --- Active Order Check / Reload --- */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>
            {isActiveOrderFound ? "ACTIVE ORDER FOUND" : "New Order Items"}
          </Text>
          <TouchableOpacity
            style={styles.reloadButtonSmall}
            // Reload now fetches based on the existingOrderId if present
            onPress={() => existingOrderId && fetchOrder(existingOrderId)}
            disabled={isOrderLoading || !existingOrderId}
          >
            {isOrderLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="reload" size={18} color="#fff" />
            )}
            <Text style={styles.reloadButtonText}>Reload</Text>
          </TouchableOpacity>
        </View>

        {isOrderLoading ? (
          <ActivityIndicator
            size="large"
            color="#005612"
            style={{ marginTop: 20 }}
          />
        ) : activeOrderError ? (
          <Text style={styles.fetchErrorText}>{activeOrderError}</Text>
        ) : (
          <View>
            {/* Display items: Existing if active, or Local Cart if new */}
            {displayedItems.length === 0 ? (
              <Text style={styles.emptyOrderText}>
                {isActiveOrderFound
                  ? `Order #${activeOrder!._id.slice(-4)} has no items yet.`
                  : "Your local cart is empty. Go back to the menu to add items."}
              </Text>
            ) : (
              <View>
                {displayedItems.map((item) =>
                  renderItemCard(item, isActiveOrderFound)
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* --- Footer & Submission --- */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            Grand Total ({totalItemsCount} items):
          </Text>
          <Text style={styles.totalPrice}>₹{totalAmount.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            // Disabled if loading, or if active order is found AND local cart is empty, or if no active order found AND local cart is empty
            isLoading || (!isActiveOrderFound && localCartItems.length === 0)
              ? styles.disabledButton
              : null,
          ]}
          onPress={handleMainButtonPress}
          disabled={
            isLoading || (!isActiveOrderFound && localCartItems.length === 0)
          }
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{buttonText}</Text>
          )}
        </TouchableOpacity>

        {/* Cancel button always navigates back */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>
            {isActiveOrderFound ? "Go Back to Menu" : "Cancel New Order"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  scrollContent: { padding: 20, paddingBottom: 160 },

  header: {
    paddingBottom: 10,
    backgroundColor: "#005612",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    paddingTop: 30,
    paddingBottom: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1C1C1C",
    marginTop: 15,
    marginBottom: 10,
  },

  // --- Table Display Styles ---
  tableDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderColor: "#005612",
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    gap: 10,
  },
  tableNumberText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#005612",
  },
  boldText: {
    fontWeight: "bold",
    color: "#005612",
  },
  statusSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reloadButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#BFA440",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    gap: 5,
  },
  reloadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },

  // --- Item Card ---
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemName: { fontSize: 16, fontWeight: "600", color: "#005612", flex: 3 },
  itemQuantity: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#BFA440",
    flex: 1,
    textAlign: "center",
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D32F2F",
    flex: 2,
    textAlign: "right",
  },
  notesInput: {
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 8,
    marginTop: 5,
    fontSize: 14,
    color: "#6c757d",
    minHeight: 40,
  },
  notesDisplay: {
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 8,
    marginTop: 5,
    fontSize: 14,
    color: "#6c757d",
    fontStyle: "italic",
  },
  emptyOrderText: {
    textAlign: "center",
    color: "#888",
    marginTop: 10,
    padding: 20,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
  },
  fetchErrorText: {
    textAlign: "center",
    color: "#D32F2F",
    marginTop: 10,
    padding: 10,
  },

  // --- Footer ---
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 15,
    borderTopWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  totalLabel: { fontSize: 20, fontWeight: "600", color: "#1C1C1C" },
  totalPrice: { fontSize: 24, fontWeight: "bold", color: "#D32F2F" },

  submitButton: {
    backgroundColor: "#005612",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cancelButton: {
    backgroundColor: "#6c757d",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: { color: "#fff", fontSize: 16 },
  disabledButton: { opacity: 0.6 },
});
