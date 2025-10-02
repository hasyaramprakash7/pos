import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
// 📢 IMPORT THE CONFIG FILE
import appConfig from '../../../config/appConfig'; // Adjust the path as needed

// --- API Base URL Setup ---
// 📢 USE THE CONFIGURATION URL
const BASE_URL = `${appConfig.apiUrl}/menu`; 

// Helper to get authorization headers (assuming token is stored in localStorage)
const getConfig = (getState) => {
    const token = getState().auth.token || localStorage.getItem('token');
    return {
        headers: {
            'Content-Type': 'application/json', 
            'x-auth-token': token,
        },
    };
};

// Helper for consistent API error extraction
const getErrorMessage = (error) => {
    // Backend sends error in the format: error.response.data.msg
    return error.response?.data?.msg || error.message || 'An unknown error occurred.';
};

// --- Async Thunks (API Calls) ---

// 1. Fetch all menu items for the vendor
export const fetchMenuItems = createAsyncThunk(
    'menuItem/fetchMenuItems',
    async (_, { getState, rejectWithValue }) => {
        try {
            const config = getConfig(getState);
            // This GET request is secured on the backend to return ONLY the vendor's data.
            const response = await axios.get(BASE_URL, config); 
            // The backend returns { success: true, items: [...] }
            return response.data.items; 
        } catch (error) {
            // Use the new helper for consistent error extraction
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 2. Create a new menu item
export const createMenuItem = createAsyncThunk(
    'menuItem/createMenuItem',
    async (itemData, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token || localStorage.getItem('token');
            // 'multipart/form-data' is required for image upload
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data', 
                    'x-auth-token': token,
                },
            };
            // The backend returns { success: true, item: {...} }
            const response = await axios.post(BASE_URL, itemData, config); 
            return response.data.item; 
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 3. Update an existing menu item
export const updateMenuItem = createAsyncThunk(
    'menuItem/updateMenuItem',
    async ({ id, itemData }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token || localStorage.getItem('token');
            // 'multipart/form-data' is required for image update
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data', 
                    'x-auth-token': token,
                },
            };
            // The backend returns { success: true, item: {...} }
            const response = await axios.put(`${BASE_URL}/${id}`, itemData, config);
            return response.data.item;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 4. Delete a menu item
export const deleteMenuItem = createAsyncThunk(
    'menuItem/deleteMenuItem',
    async (id, { getState, rejectWithValue }) => {
        try {
            const config = getConfig(getState);
            // The backend returns { success: true, msg: '...' }
            await axios.delete(`${BASE_URL}/${id}`, config);
            // Return the ID to filter it out of the Redux state
            return id;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// --- Initial State and Reducers (No Change) ---
const initialState = {
    items: [],
    status: 'idle',
    error: null,
};

const menuItemSlice = createSlice({
    name: 'menuItem',
    initialState,
    reducers: {
        // This is useful for clearing state, especially on vendor logout
        resetMenuState: (state) => {
            state.items = [];
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // FETCH
            .addCase(fetchMenuItems.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(fetchMenuItems.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
            .addCase(fetchMenuItems.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to fetch menu items.'; })
            
            // CREATE
            .addCase(createMenuItem.pending, (state) => { state.status = 'loading'; })
            .addCase(createMenuItem.fulfilled, (state, action) => { 
                state.status = 'succeeded'; 
                // Add the new item to the beginning of the array
                state.items.unshift(action.payload); 
            })
            .addCase(createMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to create menu item.'; })
            
            // UPDATE
            .addCase(updateMenuItem.pending, (state) => { state.status = 'loading'; })
            .addCase(updateMenuItem.fulfilled, (state, action) => { 
                state.status = 'succeeded';
                // Find the existing item by _id and replace it with the updated payload
                const index = state.items.findIndex(item => item._id === action.payload._id);
                if (index !== -1) { state.items[index] = action.payload; }
            })
            .addCase(updateMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to update menu item.'; })
            
            // DELETE
            .addCase(deleteMenuItem.pending, (state) => { state.status = 'loading'; })
            .addCase(deleteMenuItem.fulfilled, (state, action) => { 
                state.status = 'succeeded'; 
                // Filter out the deleted item using the returned ID
                state.items = state.items.filter(item => item._id !== action.payload); 
            })
            .addCase(deleteMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to delete menu item.'; });
    },
});

export const { resetMenuState } = menuItemSlice.actions;

export default menuItemSlice.reducer;