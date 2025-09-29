import React, { useState } from "react";
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
import { Picker } from "@react-native-picker/picker";

// ⚠️ IMPORTANT: Adjust paths as necessary
import { createOrder } from "../store/slices/orderSlice";
import { RootState, AppDispatch } from "../store/store"; // Corrected path to store

const SCREEN_HEIGHT = Dimensions.get("window").height;

// Define the structure for the cart items passed via route params
interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

// Define the structure of the route parameters
type CreateOrderRouteParams = {
  orderItems: CartItem[];
};

type RootStackParamList = {
  CreateOrder: CreateOrderRouteParams;
  // Add new destinations for role-based navigation
  Menu: undefined;
  OrderManagement: undefined;
  KitchenDashboard: undefined; // New Kitchen target
  // Add other screens here for safety
};

type CreateOrderScreenRouteProp = RouteProp<RootStackParamList, "CreateOrder">;

export default function CreateOrderScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const route = useRoute<CreateOrderScreenRouteProp>();

  const { orderItems } = route.params;

  // 📢 NEW: Get user role from Redux to determine navigation path
  const { user } = useSelector((state: RootState) => state.auth);
  const userRole = user?.role;

  const tableOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  const { status } = useSelector((state: RootState) => state.order);
  const isLoading = status === "loading";

  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [itemSpecificNotes, setItemSpecificNotes] = useState<{
    [itemId: string]: string;
  }>({});

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleSubmitOrder = async () => {
    if (!tableNumber) {
      Alert.alert(
        "Missing Detail",
        "Please select the main table number for the order."
      );
      return;
    }

    // 1. Prepare items for backend submission
    const finalItems = orderItems.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      itemTableNumber: tableNumber!,
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
              // 📢 UPDATED LOGIC for Kitchen vs. All Others
              if (userRole === "Kitchen") {
                // Kitchen staff goes to their dedicated KOT dashboard
                navigation.navigate("KitchenDashboard");
              } else {
                // Server, Billing, and Vendor staff go to the general status board
                navigation.navigate("OrderManagement");
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert("Submission Failed", error as string);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Order Confirmation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* --- 1. Select Table Number --- */}
        <Text style={styles.sectionTitle}>Main Table Number*</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={tableNumber}
            onValueChange={(itemValue) => setTableNumber(itemValue)}
            style={styles.picker}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item
              label="Select Table"
              value={null}
              enabled={!tableNumber}
            />
            {tableOptions.map((num) => (
              <Picker.Item key={num} label={`Table ${num}`} value={num} />
            ))}
          </Picker>
        </View>

        {/* --- 2. Order Summary --- */}
        <Text style={styles.sectionTitle}>
          Order Summary ({orderItems.length} Unique Items)
        </Text>

        {orderItems.map((item, index) => (
          <View key={item.menuItemId} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              <Text style={styles.itemTotal}>
                ₹{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>

            {/* Notes Input */}
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
          </View>
        ))}
      </ScrollView>

      {/* --- Footer & Submission --- */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Grand Total:</Text>
          <Text style={styles.totalPrice}>₹{totalAmount.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!tableNumber || isLoading) && styles.disabledButton,
          ]}
          onPress={handleSubmitOrder}
          disabled={!tableNumber || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Send Order to Kitchen</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  scrollContent: { padding: 20, paddingBottom: 120 },

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

  // --- Table Picker ---
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#BFA440",
    borderRadius: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 20,
  },
  picker: { height: 50 },
  pickerItem: { height: 50, color: "#1C1C1C" },

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
