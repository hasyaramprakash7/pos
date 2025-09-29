import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialIcons } from "@expo/vector-icons"; // Added MaterialIcons for luxury look
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// ⚠️ IMPORTANT: These imports must point to your files!
import {
  createMenuItem,
  fetchMenuItems,
  updateMenuItem,
  deleteMenuItem,
  resetMenuState,
} from "../store/slices/menuItemSlice"; // CORRECT SLICE IMPORT
import { RootState, AppDispatch } from "../store/store";
import { MENU_CATEGORIES } from "./constants"; // Assume a constants file for categories

// --- Type Definitions ---
// Define the structure of a menu item for local state
type MenuItemForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  isAvailable: boolean;
};

// Define the root stack param list
type AppStackParamList = {
  VendorDashboard: undefined;
  MenuItemCRUD: undefined;
};
type MenuItemCRUDScreenNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  "MenuItemCRUD"
>;

const initialFormState: MenuItemForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  stock: "0",
  isAvailable: true,
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function MenuItemCRUDScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<MenuItemCRUDScreenNavigationProp>();

  // ⚠️ Updated Redux State Selectors
  const {
    items: products,
    status,
    error,
  } = useSelector((state: RootState) => state.menuItem); // Use 'items' from slice
  const { vendor } = useSelector((state: RootState) => state.vendorAuth);
  const loading = status === "loading";

  const [form, setForm] = useState<MenuItemForm>(initialFormState);
  const [selectedCategory, setSelectedCategory] = useState(""); // Simplified category state
  const [newImageFiles, setNewImageFiles] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [currentProductImageUrls, setCurrentProductImageUrls] = useState<
    string[]
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal State (Simplified for basic category picker)
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Fetch products on load
  useEffect(() => {
    if (vendor?._id) {
      dispatch(fetchMenuItems());
    }
  }, [dispatch, vendor]);

  // Error handling
  useEffect(() => {
    if (error && status === "failed") {
      Alert.alert("Error", error);
      // dispatch(clearError()); // Assuming we don't need clearError if using resetMenuState on logout
    }
  }, [error, status, dispatch]);

  const handleChange = (name: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialFormState);
    setSelectedCategory("");
    setNewImageFiles([]);
    setCurrentProductImageUrls([]);
    setEditingId(null);
  };

  const handlePickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      // Maximum of 5 images allowed by your backend setup
      selectionLimit: 5 - currentProductImageUrls.length,
    });

    if (!result.canceled) {
      setNewImageFiles((prev) => [...prev, ...result.assets]);
    }
  };

  const handleRemoveNewImage = (indexToRemove: number) => {
    setNewImageFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleRemoveCurrentImage = (urlToRemove: string) => {
    setCurrentProductImageUrls((prevUrls) =>
      prevUrls.filter((url) => url !== urlToRemove)
    );
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.category) {
      Alert.alert(
        "Validation Error",
        "Name, Price, and Category are required."
      );
      return;
    }

    const formDataToSend = new FormData();

    // Append all form fields
    Object.keys(form).forEach((key) => {
      const value = form[key as keyof MenuItemForm];
      if (value !== "") {
        formDataToSend.append(
          key,
          typeof value === "boolean" ? value.toString() : value
        );
      }
    });

    // Set the final category string
    formDataToSend.set("category", selectedCategory);

    // Append new image files
    newImageFiles.forEach((file) => {
      const uriParts = file.uri.split(".");
      const fileType = uriParts[uriParts.length - 1];
      formDataToSend.append("images", {
        uri: file.uri,
        name: `photo-${Date.now()}.${fileType}`,
        type: `image/${fileType}`,
      } as any);
    });

    // For update, append the URLs of images to keep
    if (editingId && currentProductImageUrls.length > 0) {
      currentProductImageUrls.forEach((url) => {
        // The backend must be smart enough to distinguish file uploads from URLs
        // sent as part of the "images" array in the FormData
        formDataToSend.append("images", url);
      });
    }

    // Validation check for images
    if (!editingId && newImageFiles.length === 0) {
      Alert.alert(
        "Validation Error",
        "Please select at least one image for a new item."
      );
      return;
    }

    try {
      if (editingId) {
        // ⚠️ Using the correct update thunk
        await dispatch(
          updateMenuItem({ id: editingId, itemData: formDataToSend })
        ).unwrap();
        Alert.alert("Success", "Menu Item updated!");
      } else {
        // ⚠️ Using the correct add thunk
        await dispatch(createMenuItem(formDataToSend)).unwrap();
        Alert.alert("Success", "Menu Item added!");
      }
      resetForm();
    } catch (err: any) {
      // Redux Thunks reject with the payload, which is the error message from the API
      Alert.alert("Operation Failed", err || "An unknown error occurred.");
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item._id);

    // Populate form fields
    setForm({
      name: item.name || "",
      description: item.description || "",
      price: item.price !== undefined ? String(item.price) : "",
      category: item.category || "", // Full category string
      stock: item.stock !== undefined ? String(item.stock) : "0",
      isAvailable: item.isAvailable,
    });

    setSelectedCategory(item.category || "");
    setCurrentProductImageUrls(item.images || []);
    setNewImageFiles([]);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to delete this menu item?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          // ⚠️ Using the correct delete thunk
          onPress: () => dispatch(deleteMenuItem(id)),
        },
      ]
    );
  };

  // --- Category Modal Logic (Simplified) ---
  const handleSelectCategory = (value: string) => {
    setSelectedCategory(value);
    setForm((prev) => ({ ...prev, category: value }));
    setIsModalVisible(false);
  };

  const getCategoryLabel = () => selectedCategory || "-- Select Category --";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#005612" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {editingId ? "Edit Menu Item" : "Create Menu Item"}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Item Details</Text>

        <CustomTextInput
          label="Name"
          value={form.name}
          onChangeText={(v) => handleChange("name", v)}
          isRequired
        />
        <CustomTextInput
          label="Price (₹)"
          value={form.price}
          onChangeText={(v) => handleChange("price", v)}
          keyboardType="numeric"
          isRequired
        />
        <CustomTextInput
          label="Stock"
          value={form.stock}
          onChangeText={(v) => handleChange("stock", v)}
          keyboardType="numeric"
          isRequired
        />
        <CustomTextInput
          label="Description"
          value={form.description}
          onChangeText={(v) => handleChange("description", v)}
          multiline
        />

        {/* Category Selection */}
        <Text style={styles.label}>Category*</Text>
        <TouchableOpacity
          style={styles.categoryInput}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.categoryInputText}>{getCategoryLabel()}</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#005612" />
        </TouchableOpacity>

        {/* Availability Switch */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Available</Text>
          <Switch
            value={form.isAvailable}
            onValueChange={(v) => handleChange("isAvailable", v)}
            trackColor={{ false: "#ccc", true: "#C5E1A5" }}
            thumbColor={form.isAvailable ? "#005612" : "#f4f3f4"}
          />
        </View>

        {/* Image Selection */}
        <TouchableOpacity
          style={styles.imageButton}
          onPress={handlePickImages}
          disabled={currentProductImageUrls.length + newImageFiles.length >= 5}
        >
          <MaterialIcons name="add-a-photo" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            Select Images (
            {currentProductImageUrls.length + newImageFiles.length}/5)
          </Text>
        </TouchableOpacity>

        {/* Image Preview */}
        <View style={styles.imagePreviewContainer}>
          {[...currentProductImageUrls, ...newImageFiles.map((f) => f.uri)].map(
            (uri, index) => {
              const isNew = index >= currentProductImageUrls.length;
              return (
                <View key={uri} style={styles.imageWrapper}>
                  <Image source={{ uri: uri }} style={styles.image} />
                  <TouchableOpacity
                    onPress={() =>
                      isNew
                        ? handleRemoveNewImage(
                            index - currentProductImageUrls.length
                          )
                        : handleRemoveCurrentImage(uri)
                    }
                    style={styles.removeImageButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
              );
            }
          )}
        </View>

        {/* Submit/Cancel */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {editingId ? "Update Item" : "Add Item"}
            </Text>
          )}
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
            <Text style={styles.cancelButtonText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* --- My Menu Items List --- */}
      <Text style={styles.listTitle}>My Menu Items ({products.length})</Text>
      {status === "loading" && products.length === 0 ? (
        <ActivityIndicator
          size="large"
          color="#005612"
          style={{ margin: 20 }}
        />
      ) : (
        products.map((p) => (
          <View key={p._id} style={styles.productCard}>
            <Image
              source={{
                uri:
                  p.images && p.images.length > 0
                    ? p.images[0]
                    : "https://placehold.co/100x100/eee/ccc?text=No+Image",
              }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={styles.productCategory}>{p.category}</Text>
              <Text style={styles.productPrice}>
                ₹{Number(p.price).toFixed(2)}
              </Text>
              <Text style={styles.productStock}>Stock: {p.stock}</Text>
            </View>
            <View style={styles.buttonColumn}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleEdit(p)}
              >
                <MaterialIcons name="edit" size={24} color="#BFA440" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleDelete(p._id)}
              >
                <MaterialIcons name="delete" size={24} color="#D32F2F" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* --- Category Selection Modal --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={styles.modalList}>
              {/* Assuming MENU_CATEGORIES is a simple string array like ['Appetizers', 'Main Course', 'Desserts'] */}
              {MENU_CATEGORIES.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() => handleSelectCategory(option)}
                >
                  <Text style={styles.modalOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.cancelButton, styles.modalCloseButton]}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// --- Custom Components & Styles ---

const CustomTextInput = ({
  label,
  isRequired = false,
  ...props
}: {
  label: string;
  isRequired?: boolean;
  [key: string]: any;
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label}
      {isRequired && <Text style={styles.requiredStar}>*</Text>}
    </Text>
    <TextInput style={styles.input} placeholderTextColor="#999" {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4F8" },
  contentContainer: { padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    position: "relative",
  },
  backButton: { padding: 5, zIndex: 10 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1C",
    textAlign: "center",
    flex: 1,
    marginLeft: -30,
    fontFamily: "serif",
  },
  listTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#005612",
    marginTop: 30,
    marginBottom: 15,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 15,
    fontFamily: "serif",
  },

  form: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#BFA440",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 5,
  },

  inputContainer: { marginBottom: 18 },
  label: { fontSize: 16, color: "#495057", marginBottom: 6, fontWeight: "500" },
  requiredStar: { color: "#D32F2F", fontSize: 14, fontWeight: "bold" },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#F8F9FA",
    color: "#1C1C1C",
  },

  // --- Category & Switch ---
  categoryInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFA440",
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: "#FFFBEB", // Light gold background
    marginBottom: 18,
  },
  categoryInputText: { fontSize: 16, color: "#1C1C1C" },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  // --- Image & Buttons ---
  imageButton: {
    flexDirection: "row",
    backgroundColor: "#BFA440",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: "#005612",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#6c757d",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cancelButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    marginBottom: 20,
  },
  imageWrapper: {
    position: "relative",
    margin: 5,
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#BFA440",
  },
  image: { width: "100%", height: "100%", borderRadius: 8 },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 15,
    zIndex: 5,
  },

  // --- Product Card List ---
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    alignItems: "center",
  },
  productImage: { width: 70, height: 70, borderRadius: 8 },
  productInfo: { flex: 1, marginLeft: 15, justifyContent: "center" },
  productName: { fontSize: 18, fontWeight: "600", color: "#1C1C1C" },
  productCategory: { fontSize: 14, color: "#BFA440", marginTop: 2 },
  productPrice: {
    fontSize: 16,
    color: "#005612",
    fontWeight: "bold",
    marginTop: 4,
  },
  productStock: { fontSize: 14, color: "#6c757d" },
  buttonColumn: { justifyContent: "space-around", marginLeft: 10, height: 70 },
  iconButton: { padding: 5 },

  // --- Modal Styles ---
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: SCREEN_WIDTH * 0.9,
    maxHeight: "70%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1C1C1C",
  },
  modalList: { width: "100%", maxHeight: 300 },
  modalOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  modalOptionText: { fontSize: 16, color: "#495057" },
  modalCloseButton: {
    backgroundColor: "#D32F2F",
    width: "100%",
    marginTop: 15,
  },
});
