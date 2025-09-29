import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import appConfig from '../../../config/appConfig'; 
import { logout } from '../slices/authSlice'; // Assuming correct path to authSlice

// Define the detailed Vendor profile structure (the shop/restaurant entity)
interface VendorProfile {
    _id: string; // Same as vendorId
    shopName: string;
    address: string;
    contactEmail: string;
    gstNumber: string;
    foodLicenseNumber: string;
    // Add other vendor-specific fields as necessary
}

// Define the slice's state
interface VendorAuthState {
    vendor: VendorProfile | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: VendorAuthState = {
    vendor: null,
    status: 'idle',
    error: null,
};

// --- API Base URL Setup ---
const VENDOR_BASE_URL = `${appConfig.apiUrl}/vendors`; 

// Helper to get authorization headers
const getConfig = (token: string) => ({
    headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
    },
});

// --- ASYNC THUNK: Fetch Detailed Vendor Profile ---
/**
 * Thunk to fetch the detailed Vendor profile (shop name, address, licenses, etc.).
 * It uses the token and vendorId attached during login in the auth slice.
 */
export const fetchVendorDetails = createAsyncThunk<
    VendorProfile,
    void, // No argument needed, data comes from state
    { state: { auth: { user: { vendorId: string }, token: string | null } }, rejectValue: string }
>(
    'vendorAuth/fetchDetails',
    async (_, { getState, rejectWithValue }) => {
        const state = getState();
        const vendorId = state.auth.user?.vendorId;
        const token = state.auth.token;

        if (!vendorId || !token) {
            return rejectWithValue('Authentication data missing for vendor profile fetch.');
        }

        try {
            // Assuming an endpoint to fetch vendor details by ID
            const res = await axios.get(`${VENDOR_BASE_URL}/${vendorId}`, getConfig(token));
            return res.data.vendor; // Assuming API returns { success: true, vendor: {...} }
        } catch (err) {
            const error = err as AxiosError;
            const message = (error.response?.data as any)?.msg || 'Failed to fetch vendor details.';
            return rejectWithValue(message);
        }
    }
);

// --- Vendor Auth Slice Definition ---
const vendorAuthSlice = createSlice({
    name: 'vendorAuth',
    initialState,
    reducers: {
        // Reducer to manually update vendor profile (e.g., after an edit screen success)
        setVendorProfile: (state, action: PayloadAction<VendorProfile>) => {
            state.vendor = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // --- Fetch Vendor Details Handlers ---
            .addCase(fetchVendorDetails.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchVendorDetails.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.vendor = action.payload;
            })
            .addCase(fetchVendorDetails.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
                state.vendor = null;
            })
            
            // --- Global Logout Handler ---
            // Listens to the logout action from the main authSlice to clear vendor data
            .addCase(logout, (state) => {
                state.vendor = null;
                state.status = 'idle';
                state.error = null;
            });
    },
});

export const { setVendorProfile } = vendorAuthSlice.actions;

export default vendorAuthSlice.reducer;
