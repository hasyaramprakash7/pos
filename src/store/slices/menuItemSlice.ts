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
            // Setting Content-Type to application/json is usually NOT needed for GET/DELETE
            // but is fine here for consistency, except where FormData is required.
            'Content-Type': 'application/json', 
            'x-auth-token': token,
        },
    };
};

// --- Async Thunks (API Calls) ---

// 1. Fetch all menu items for the vendor
export const fetchMenuItems = createAsyncThunk(
    'menuItem/fetchMenuItems',
    async (_, { getState, rejectWithValue }) => {
        try {
            const config = getConfig(getState);
            // 📢 Use the configured BASE_URL
            const response = await axios.get(BASE_URL, config); 
            return response.data.items; 
        } catch (error) {
            return rejectWithValue(error.response.data.msg || error.message);
        }
    }
);

// 2. Create a new menu item
export const createMenuItem = createAsyncThunk(
    'menuItem/createMenuItem',
    async (itemData, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token || localStorage.getItem('token');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data', 
                    'x-auth-token': token,
                },
            };
            // 📢 Use the configured BASE_URL
            const response = await axios.post(BASE_URL, itemData, config); 
            return response.data.item; 
        } catch (error) {
            return rejectWithValue(error.response.data.msg || error.message);
        }
    }
);

// 3. Update an existing menu item
export const updateMenuItem = createAsyncThunk(
    'menuItem/updateMenuItem',
    async ({ id, itemData }, { getState, rejectWithValue }) => {
        try {
            const token = getState().auth.token || localStorage.getItem('token');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data', 
                    'x-auth-token': token,
                },
            };
            // 📢 Use the configured BASE_URL
            const response = await axios.put(`${BASE_URL}/${id}`, itemData, config);
            return response.data.item;
        } catch (error) {
            return rejectWithValue(error.response.data.msg || error.message);
        }
    }
);

// 4. Delete a menu item
export const deleteMenuItem = createAsyncThunk(
    'menuItem/deleteMenuItem',
    async (id, { getState, rejectWithValue }) => {
        try {
            const config = getConfig(getState);
            // 📢 Use the configured BASE_URL
            await axios.delete(`${BASE_URL}/${id}`, config);
            return id;
        } catch (error) {
            return rejectWithValue(error.response.data.msg || error.message);
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
        resetMenuState: (state) => {
            state.items = [];
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMenuItems.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(fetchMenuItems.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
            .addCase(fetchMenuItems.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to fetch menu items.'; })
            
            .addCase(createMenuItem.pending, (state) => { state.status = 'loading'; })
            .addCase(createMenuItem.fulfilled, (state, action) => { state.status = 'succeeded'; state.items.unshift(action.payload); })
            .addCase(createMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to create menu item.'; })
            
            .addCase(updateMenuItem.pending, (state) => { state.status = 'loading'; })
            .addCase(updateMenuItem.fulfilled, (state, action) => { 
                state.status = 'succeeded';
                const index = state.items.findIndex(item => item._id === action.payload._id);
                if (index !== -1) { state.items[index] = action.payload; }
            })
            .addCase(updateMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to update menu item.'; })
            
            .addCase(deleteMenuItem.pending, (state) => { state.status = 'loading'; })
            .addCase(deleteMenuItem.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = state.items.filter(item => item._id !== action.payload); })
            .addCase(deleteMenuItem.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload || 'Failed to delete menu item.'; });
    },
});

export const { resetMenuState } = menuItemSlice.actions;

export default menuItemSlice.reducer;