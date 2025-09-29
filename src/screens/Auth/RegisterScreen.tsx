import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

import { registerUser, clearAuthError } from "../../store/slices/authSlice";
import { RootState, AppDispatchType } from "../../store/store";

type Role = "Vendor" | "Server" | "Kitchen" | "Billing";

const RegisterScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    phoneNumber: "",
    role: "Vendor" as Role,
    shopName: "",
    gstNumber: "",
    foodLicenseNumber: "",
    vendorId: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState(""); // For client-side validation

  const dispatch = useDispatch<AppDispatchType>();
  const navigation = useNavigation();

  const { isAuthenticated, isLoading, error, user } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    // Only redirect Vendors immediately after successful registration/login
    if (isAuthenticated && user?.role === "Vendor") {
      navigation.replace("Dashboard" as never);
    }
  }, [isAuthenticated, user, navigation]);

  useEffect(() => {
    // Clear success message, form error, and auth error on component mount or role change
    setSuccessMessage("");
    setFormError("");
    if (error) {
      dispatch(clearAuthError());
    }
    return () => {
      if (error) {
        dispatch(clearAuthError());
      }
    };
  }, [dispatch, error, formData.role]);

  const handleChange = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccessMessage("");
    setFormError("");
    if (error) {
      dispatch(clearAuthError());
    }
  };

  const handleSubmit = async () => {
    setSuccessMessage("");
    setFormError("");
    if (error) {
      dispatch(clearAuthError());
    }

    const isVendor = formData.role === "Vendor";

    // --- Client-Side Validation ---
    if (!isVendor && !formData.vendorId.trim()) {
      setFormError("Staff roles must provide a valid Vendor ID.");
      return;
    }

    if (isVendor && (!formData.shopName || !formData.gstNumber || !formData.foodLicenseNumber)) {
        setFormError("Vendor registration requires Shop Name, GST, and Food License Number.");
        return;
    }
    // ----------------------------

    // Only send required data based on role
    const dataToSend =
      isVendor
        ? {
            username: formData.username,
            password: formData.password,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            role: formData.role,
            shopName: formData.shopName,
            gstNumber: formData.gstNumber,
            foodLicenseNumber: formData.foodLicenseNumber,
          }
        : {
            username: formData.username,
            password: formData.password,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            role: formData.role,
            vendorId: formData.vendorId, // <--- Staff Vendor ID sent here
          };

    const result = await dispatch(registerUser(dataToSend) as any);

    if (registerUser.fulfilled.match(result)) {
      const payload = result.payload as any;

      if (payload.msg) {
        // Successful staff registration (awaiting approval)
        setSuccessMessage(payload.msg);
        // Clear sensitive fields, keep role and vendorId (if staff)
        setFormData((prev) => ({
          ...prev,
          username: "",
          password: "",
          email: "",
          phoneNumber: "",
          shopName: "",
          gstNumber: "",
          foodLicenseNumber: "",
          vendorId: prev.role !== "Vendor" ? prev.vendorId : "",
        }));
      }
    }
  };

  const isVendor = formData.role === "Vendor";

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.header}>Register New Account</Text>

        {successMessage && (
          <Text style={styles.successText}>{successMessage}</Text>
        )}
        {(error || formError) && <Text style={styles.errorText}>{error || formError}</Text>}

        <View style={styles.form}>
          {/* Role Selection (using Picker) */}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.role}
              onValueChange={(itemValue) =>
                handleChange("role", itemValue as Role)
              }
              style={styles.picker}
            >
              <Picker.Item label="Vendor (Owner)" value="Vendor" />
              <Picker.Item label="Staff - Server" value="Server" />
              <Picker.Item label="Staff - Kitchen" value="Kitchen" />
              <Picker.Item label="Staff - Billing" value="Billing" />
            </Picker>
          </View>

          {/* Common Fields */}
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={formData.username}
            onChangeText={(text) => handleChange("username", text)}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={formData.password}
            onChangeText={(text) => handleChange("password", text)}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={(text) => handleChange("email", text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number (10 digits)"
            value={formData.phoneNumber}
            onChangeText={(text) => handleChange("phoneNumber", text)}
            keyboardType="phone-pad"
            maxLength={10}
          />

          {/* Vendor Specific Fields (Required for Vendor) */}
          {isVendor && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Shop/Restaurant Name"
                value={formData.shopName}
                onChangeText={(text) => handleChange("shopName", text)}
              />
              <TextInput
                style={styles.input}
                placeholder="GST Number"
                value={formData.gstNumber}
                onChangeText={(text) => handleChange("gstNumber", text)}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.input}
                placeholder="Food License Number"
                value={formData.foodLicenseNumber}
                onChangeText={(text) => handleChange("foodLicenseNumber", text)}
              />
            </>
          )}

          {/* Staff Specific Field (Required for Staff) */}
          {!isVendor && (
            <TextInput
              style={[styles.input, formError.includes("Vendor ID") && styles.inputError]}
              placeholder="Vendor ID (REQUIRED for staff)"
              value={formData.vendorId}
              onChangeText={(text) => handleChange("vendorId", text)}
              autoCapitalize="none"
            />
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.button, isLoading && styles.buttonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.linkText}>
          <Text>Already have an account? </Text>
          <Text
            onPress={() => navigation.navigate("Login" as never)}
            style={styles.link}
          >
            Login here
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#f4f7f9",
  },
  container: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  form: {
    gap: 15,
  },
  input: {
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    fontSize: 16,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 2,
  },
  pickerContainer: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },
  button: {
    padding: 12,
    backgroundColor: "#28a745",
    borderRadius: 4,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#77c78e",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 16,
  },
  successText: {
    color: "green",
    textAlign: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "green",
    padding: 10,
    borderRadius: 4,
    fontSize: 16,
    backgroundColor: "#e6ffe6",
  },
  linkText: {
    textAlign: "center",
    marginTop: 15,
    fontSize: 14,
    color: "#666",
  },
  link: {
    color: "#007bff",
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});

export default RegisterScreen;
