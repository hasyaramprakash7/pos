import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

// ⚠️ IMPORTANT: Adjust paths as necessary
import { fetchMenuItems } from "../store/slices/menuItemSlice";
import { RootState, AppDispatch } from "../store/store";

const SCREEN_WIDTH = Dimensions.get("window").width;

// --- ROUTE PARAMETER TYPES ---
type MenuRouteParams = {
  tableNumber: number;
};
type RootStackParamList = {
  Menu: MenuRouteParams;
  CreateOrder: any;
  TableSelection: any;
};
type MenuScreenRouteProp = RouteProp<RootStackParamList, "Menu">;
// -----------------------------

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface MenuItemDisplay {
  _id: string;
  name: string;
  price: number;
  category: string;
  images: string[];
  isAvailable: boolean;
  stock: number;
}

export default function MenuScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const route = useRoute<MenuScreenRouteProp>();

  // 🚨 CRITICAL FIX 2/3: Use defensive destructuring with fallback (tableNumber = null)
  const { tableNumber = null } = route.params || {};

  const {
    items: menuItems,
    status,
    error,
  } = useSelector((state: RootState) => state.menuItem);

  const { user } = useSelector((state: RootState) => state.auth);
  const isAuthenticated = !!user;

  const [orderItems, setOrderItems] = useState<CartItem[]>([]);

  // --- Data Fetching: GUARANTEED RELOAD ON SCREEN ENTRY ---
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMenuItems());
    }
  }, [dispatch, isAuthenticated]);

  // --- Reset Cart and Handle Errors ---
  useEffect(() => {
    if (status === "succeeded") {
      setOrderItems([]); // Reset cart on successful menu load
    }
    if (status === "failed" && error) {
      Alert.alert("Menu Load Failed", error);
    }
  }, [status, error]);

  const handleOrderPress = (item: MenuItemDisplay) => {
    if (!item.isAvailable || item.stock <= 0) {
      Alert.alert("Out of Stock", `${item.name} is currently unavailable.`);
      return;
    }

    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (cartItem) => cartItem.menuItemId === item._id
      );

      if (existingItemIndex > -1) {
        const newItems = [...prevItems];
        if (newItems[existingItemIndex].quantity < item.stock) {
          newItems[existingItemIndex].quantity += 1;
          return newItems;
        } else {
          Alert.alert(
            "Stock Limit",
            `Cannot add more than ${item.stock} of ${item.name}.`
          );
          return prevItems;
        }
      } else {
        return [
          ...prevItems,
          {
            menuItemId: item._id,
            name: item.name,
            price: item.price,
            quantity: 1,
          },
        ];
      }
    });
  };

  const handleCheckout = () => {
    if (orderItems.length === 0) {
      Alert.alert(
        "Empty Order",
        "Please select at least one item before checking out."
      );
      return;
    }

    // Safety check for table number
    if (tableNumber === null) {
      Alert.alert(
        "Error",
        "Table selection failed. Please select a table first."
      );
      navigation.navigate("TableSelection");
      return;
    }

    // 🚨 CRITICAL FIX 3/3: Ensure 'tableNumber' is passed here
    navigation.navigate("CreateOrder", {
      orderItems: orderItems,
      tableNumber: tableNumber,
    });
  };

  const totalQuantity = orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const renderItem = (item: MenuItemDisplay) => {
    const primaryImageUrl =
      item.images?.[0] ||
      "https://placehold.co/100x100/e0e0e0/555555?text=Dish";

    const isOutOfStock = !item.isAvailable || item.stock <= 0;

    const currentCartQty =
      orderItems.find((cartItem) => cartItem.menuItemId === item._id)
        ?.quantity || 0;

    return (
      <View key={item._id} style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: primaryImageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          {isOutOfStock && (
            <View style={styles.statusOverlay}>
              <Text style={styles.statusText}>Sold Out</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.category}>{item.category || "General"}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{Number(item.price).toFixed(2)}</Text>

            <TouchableOpacity
              style={[styles.addButton, isOutOfStock && styles.disabledButton]}
              onPress={() => handleOrderPress(item)}
              disabled={isOutOfStock}
            >
              {currentCartQty > 0 && (
                <Text style={styles.cartQtyText}>{currentCartQty}</Text>
              )}
              <Text style={styles.addButtonText}>Add</Text>
              <Ionicons name="cart-outline" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (status === "loading" && menuItems.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#005612" />
        <Text style={styles.loadingText}>Loading Menu...</Text>
      </View>
    );
  }

  // --- Unauthorized/Unauthenticated State ---
  if (!isAuthenticated) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#D32F2F" />
        <Text style={styles.emptyText}>Access Denied</Text>
        <Text style={styles.emptySubtitle}>
          Please log in as a Vendor or Staff member to view this menu.
        </Text>
      </View>
    );
  }

  // --- Missing Parameter/Navigation Error State ---
  if (tableNumber === null) {
    return (
      <View style={styles.unauthorizedContainer}>
        <Ionicons name="tablet-landscape-outline" size={60} color="#D32F2F" />
        <Text style={styles.emptyText}>Table Not Selected</Text>
        <Text style={styles.emptySubtitle}>
          Please go back and select a table to begin ordering.
        </Text>
        <TouchableOpacity
          style={styles.reloadButton}
          onPress={() => navigation.navigate("TableSelection")}
        >
          <Text style={styles.reloadButtonText}>Go to Table Select</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order for Table {tableNumber}</Text>
        <Text style={styles.headerSubtitle}>
          Logged in as: **{user?.role || "Staff"}**
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {menuItems.length > 0 ? (
          menuItems.map(renderItem)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>The menu is currently empty.</Text>
            <TouchableOpacity
              style={styles.reloadButton}
              onPress={() => dispatch(fetchMenuItems())}
              disabled={status === "loading"}
            >
              <Text style={styles.reloadButtonText}>Refresh Menu</Text>
            </TouchableOpacity>
          </View>
        )}
        {status === "failed" && (
          <Text style={styles.fetchErrorText}>
            Failed to load menu: {error}
          </Text>
        )}
      </ScrollView>

      {/* --- Checkout Button (Floating/Fixed) --- */}
      {totalQuantity > 0 && (
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={24} color="#fff" />
          <Text style={styles.checkoutButtonText}>
            Checkout ({totalQuantity} items)
          </Text>
          <Text style={styles.checkoutPrice}>
            ₹
            {orderItems
              .reduce((sum, item) => sum + item.price * item.quantity, 0)
              .toFixed(2)}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  scrollContent: { padding: 15, paddingBottom: 100 },

  header: {
    padding: 20,
    backgroundColor: "#005612",
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    marginBottom: 10,
    paddingTop: Platform.OS === "android" ? 40 : 50,
    alignItems: "center",
  },
  headerTitle: { fontSize: 26, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#C5E1A5", marginTop: 4 },
  loadingText: { marginTop: 10, fontSize: 16, color: "#005612" },

  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    height: 120,
  },
  imageContainer: { width: 120, height: "100%", position: "relative" },
  image: { width: "100%", height: "100%" },
  statusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(211, 47, 47, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    transform: [{ rotate: "-15deg" }],
  },
  infoContainer: { flex: 1, padding: 15, justifyContent: "space-between" },
  name: { fontSize: 18, fontWeight: "600", color: "#1C1C1C", marginBottom: 4 },
  category: { fontSize: 13, color: "#BFA440", fontStyle: "italic" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: { fontSize: 20, fontWeight: "bold", color: "#005612" },

  addButton: {
    flexDirection: "row",
    backgroundColor: "#005612",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: "center",
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  disabledButton: { backgroundColor: "#ccc", opacity: 0.8 },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  cartQtyText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    backgroundColor: "#BFA440",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  checkoutButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#D32F2F",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  checkoutPrice: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  emptyState: {
    padding: 40,
    alignItems: "center",
    marginTop: 50,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
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
  reloadButton: {
    marginTop: 20,
    backgroundColor: "#BFA440",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  reloadButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  fetchErrorText: {
    textAlign: "center",
    color: "#D32F2F",
    marginTop: 20,
    fontSize: 14,
    fontWeight: "500",
  },
});
