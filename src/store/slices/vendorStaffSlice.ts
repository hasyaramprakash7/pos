import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import appConfig from '../../../config/appConfig'; 
import { RootState } from '../store'; // Import RootState to access other slice state (e.g., auth)

// --- 1. INTERFACES ---

// Define the structure for a staff user (matching your backend response)
interface StaffUser {
    _id: string; // The ID of the user
    username: string; 
    role: 'Server' | 'Kitchen' | 'Billing'; // Excludes 'Vendor'
    isApproved: boolean;
    vendorId: string;
    // other fields like email, name, etc., can be added here
}

// Define the structure for the slice's state
interface VendorStaffState {
    staffList: StaffUser[];
    isLoading: boolean;
    error: string | null;
}

// --- 2. INITIAL STATE ---

const initialState: VendorStaffState = {
    staffList: [],
    isLoading: false,
    error: null,
};

// --- 3. UTILITY FUNCTION (Axios Config) ---

// Base URL for the vendor staff routes: /api/vendor/staff
const VENDOR_STAFF_URL = `${appConfig.apiUrl}/vendor/staff`; 

/**
 * Gets the Axios configuration with the Authorization header.
 * @param token The JWT token from the Auth state.
 * @returns Axios config object.
 */
const getAuthHeaders = (token: string) => ({
    headers: {
        'x-auth-token': token, 
        'Content-Type': 'application/json',
    },
});

// --- 4. ASYNC THUNKS ---

/**
 * Thunk to fetch all staff accounts for the vendor's shop.
 * @route GET /api/vendor/staff
 */
export const fetchStaff = createAsyncThunk<
    StaffUser[], // Return type of fulfilled action
    void, // Argument type of thunk
    { rejectValue: string, state: RootState } // ThunkAPI configuration
>(
    'vendorStaff/fetchStaff', 
    async (_, { getState, rejectWithValue }) => {
        const state = getState();
        const token = state.auth.token;

        if (!token) {
            return rejectWithValue('Authentication token not found.');
        }

        try {
            const res = await axios.get(VENDOR_STAFF_URL, getAuthHeaders(token));
            return res.data as StaffUser[]; // Backend already excludes the Vendor owner
        } catch (err) {
            const error = err as AxiosError;
            const errMsg = (error.response?.data as any)?.msg || 'Failed to fetch staff list.';
            return rejectWithValue(errMsg);
        }
    }
);

/**
 * Thunk to approve a staff account.
 * @route PUT /api/vendor/staff/:id/approve
 */
export const approveStaff = createAsyncThunk<
    { msg: string, user: { id: string, isApproved: boolean } }, // Return type
    string, // Staff ID to approve
    { rejectValue: string, state: RootState } // ThunkAPI configuration
>(
    'vendorStaff/approveStaff',
    async (staffId, { getState, rejectWithValue }) => {
        const state = getState();
        const token = state.auth.token;

        if (!token) {
            return rejectWithValue('Authentication token not found.');
        }

        try {
            const res = await axios.put(`${VENDOR_STAFF_URL}/${staffId}/approve`, {}, getAuthHeaders(token));
            return res.data;
        } catch (err) {
            const error = err as AxiosError;
            const errMsg = (error.response?.data as any)?.msg || 'Failed to approve staff.';
            return rejectWithValue(errMsg);
        }
    }
);

/**
 * Thunk to delete a staff account.
 * @route DELETE /api/vendor/staff/:id
 */
export const deleteStaff = createAsyncThunk<
    { msg: string }, // Return type
    string, // Staff ID to delete
    { rejectValue: string, state: RootState } // ThunkAPI configuration
>(
    'vendorStaff/deleteStaff',
    async (staffId, { getState, rejectWithValue }) => {
        const state = getState();
        const token = state.auth.token;

        if (!token) {
            return rejectWithValue('Authentication token not found.');
        }

        try {
            const res = await axios.delete(`${VENDOR_STAFF_URL}/${staffId}`, getAuthHeaders(token));
            return res.data;
        } catch (err) {
            const error = err as AxiosError;
            const errMsg = (error.response?.data as any)?.msg || 'Failed to delete staff.';
            return rejectWithValue(errMsg);
        }
    }
);


// --- 5. SLICE DEFINITION ---

const vendorStaffSlice = createSlice({
    name: 'vendorStaff',
    initialState,
    reducers: {
        /**
         * Reducer to clear a previous error message from the state.
         */
        clearStaffError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        // --- Fetch Staff Handlers ---
        builder
            .addCase(fetchStaff.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchStaff.fulfilled, (state, action: PayloadAction<StaffUser[]>) => {
                state.isLoading = false;
                state.staffList = action.payload;
            })
            .addCase(fetchStaff.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.staffList = []; // Clear list on error
            })

        // --- Approve Staff Handlers ---
        // Note: The backend only returns id/isApproved, so we update the list locally
            .addCase(approveStaff.fulfilled, (state, action) => {
                const approvedId = action.payload.user.id;
                state.staffList = state.staffList.map(user => 
                    user._id === approvedId ? { ...user, isApproved: true } : user
                );
                // No need to clear loading state as this is a quick action
            })
            .addCase(approveStaff.rejected, (state, action) => {
                state.error = action.payload as string;
            })

        // --- Delete Staff Handlers ---
            .addCase(deleteStaff.fulfilled, (state, action, meta) => {
                // The meta property contains the original argument (staffId) from the thunk
                const deletedId = meta.arg; 
                state.staffList = state.staffList.filter(user => user._id !== deletedId);
            })
            .addCase(deleteStaff.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

/**
 * Export the action creator for clearing errors.
 */
export const { clearStaffError } = vendorStaffSlice.actions;

export default vendorStaffSlice.reducer;