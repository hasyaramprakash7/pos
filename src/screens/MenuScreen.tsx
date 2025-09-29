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
import { useNavigation } from "@react-navigation/native";

// ⚠️ IMPORTANT: Adjust paths as necessary for your project structure
import { fetchMenuItems } from "../store/slices/menuItemSlice";
import { RootState, AppDispatch } from "../store/store";
// import { MENU_CATEGORIES } from "./constants"; // Use only if needed

const SCREEN_WIDTH = Dimensions.get("window").width;

// Define the structure for an item added to the temporary cart
interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

// Define the shape of a single item for the list display
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
  const navigation = useNavigation();

  const {
    items: menuItems,
    status,
    error,
  } = useSelector((state: RootState) => state.menuItem);
  const { user } = useSelector((state: RootState) => state.auth);

  // --- Local Cart State ---
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);

  // --- Data Fetching ---
  useEffect(() => {
    if (status === "idle" || status === "failed") {
      dispatch(fetchMenuItems());
    }
  }, [dispatch, status]);

  // Error Handling
  useEffect(() => {
    if (status === "failed" && error) {
      Alert.alert("Menu Load Failed", error);
    }
  }, [status, error]);

  const handleOrderPress = (item: MenuItemDisplay) => {
    setOrderItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (cartItem) => cartItem.menuItemId === item._id
      );

      if (existingItemIndex > -1) {
        // If item exists, increase quantity
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += 1;
        return newItems;
      } else {
        // If item is new, add it
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

    // 📢 Navigate to the Order Creation screen, passing the cart data
    navigation.navigate("CreateOrder", {
      orderItems: orderItems,
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
          <Text style={styles.category}>{item.category}</Text>

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Restaurant Menu</Text>
        <Text style={styles.headerSubtitle}>Role: {user?.role}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {menuItems.length > 0 ? (
          menuItems.map(renderItem)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>The menu is currently empty.</Text>
            <Text style={styles.emptySubtitle}>
              A Vendor must add items to the shop's menu.
            </Text>
            <TouchableOpacity
              style={styles.reloadButton}
              onPress={() => dispatch(fetchMenuItems())}
            >
              <Text style={styles.reloadButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* --- Checkout Button (Floating/Fixed) --- */}
      {totalQuantity > 0 && (
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
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
  scrollContent: { padding: 15, paddingBottom: 100 }, // Increased padding for floating button

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

  // --- Card Styles ---
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

  // --- Checkout Button ---
  checkoutButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#D32F2F", // Red for emphasis
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

  // --- Empty State ---
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
});
