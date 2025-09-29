
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import appConfig from '../../../config/appConfig';

// --- Type Definitions ---

interface OrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    itemTableNumber: number;
    addons?: string[];
    notes?: string;
    _id: string; // Mongoose ID for the subdocument
}

type OrderStatus = 'Pending' | 'Kitchen' | 'Ready' | 'Served' | 'Billed' | 'Completed';

interface Order {
    _id: string;
    tableNumber: number;
    items: OrderItem[];
    status: OrderStatus;
    server: string; // User ObjectId
    vendorId: string;
    totalAmount: number;
    paymentMethod?: string;
    createdAt: string;
}

interface OrderState {
    kitchenOrders: Order[];
    billingOrders: Order[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Initial state 
const initialState: OrderState = {
    kitchenOrders: [],
    billingOrders: [],
    status: 'idle',
    error: null,
};

// --- API Base URL Setup ---
const BASE_URL = `${appConfig.apiUrl}/orders`; 

// Helper to get authorization headers
const getConfig = (getState: any) => {
    const token = getState().auth.token || localStorage.getItem('token');
    return {
        headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
        },
    };
};

// --- ASYNC THUNKS (API Calls) ---

// 1. Server creates a new order
export const createOrder = createAsyncThunk<Order, any, { state: RootState, rejectValue: string }>(
    'order/createOrder',
    async (orderData, { getState, rejectWithValue }) => {
        try {
            // Note: Order creation usually requires a JSON body.
            const config = getConfig(getState);
            const response = await axios.post(BASE_URL, orderData, config);
            return response.data; // Assuming backend returns the full new order object
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || 'Failed to create order.';
            return rejectWithValue(msg);
        }
    }
);

// 2. Kitchen fetches its list
export const fetchKitchenOrders = createAsyncThunk<Order[], void, { state: RootState, rejectValue: string }>(
    'order/fetchKitchenOrders',
    async (_, { getState, rejectWithValue }) => {
        try {
            const config = getConfig(getState);
            const response = await axios.get(`${BASE_URL}/kitchen`, config);
            return response.data;
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || 'Failed to fetch kitchen orders.';
            return rejectWithValue(msg);
        }
    }
);

// 3. Billing fetches its list
export const fetchBillingOrders = createAsyncThunk<Order[], void, { state: RootState, rejectValue: string }>(
    'order/fetchBillingOrders',
    async (_, { getState, rejectWithValue }) => {
        try {
            const config = getConfig(getState);
            const response = await axios.get(`${BASE_URL}/billing`, config);
            return response.data;
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || 'Failed to fetch billing orders.';
            return rejectWithValue(msg);
        }
    }
);

// 4. Update order status
interface StatusUpdatePayload {
    orderId: string;
    newStatus: OrderStatus;
}
export const updateOrderStatus = createAsyncThunk<
    Order, // Returns the updated order
    StatusUpdatePayload,
    { state: RootState, rejectValue: string }
>(
    'order/updateStatus',
    async ({ orderId, newStatus }, { getState, rejectWithValue }) => {
        try {
            const config = getConfig(getState);
            const response = await axios.put(`${BASE_URL}/${orderId}/status`, { newStatus }, config);
            return response.data.order; // Assuming controller returns { msg: ..., order: updatedOrder }
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || 'Failed to update order status.';
            return rejectWithValue(msg);
        }
    }
);

// --- Order Slice Definition ---
const orderSlice = createSlice({
    name: 'order',
    initialState,
    reducers: {
        resetOrderState: (state) => {
            state.kitchenOrders = [];
            state.billingOrders = [];
            state.status = 'idle';
            state.error = null;
        },
        // Optimistic update helper (for quick UI response)
        updateLocalStatus: (state, action: PayloadAction<StatusUpdatePayload & { listType: 'kitchen' | 'billing' }>) => {
             const list = action.payload.listType === 'kitchen' ? state.kitchenOrders : state.billingOrders;
             const index = list.findIndex(order => order._id === action.payload.orderId);
             if (index !== -1) {
                 list[index].status = action.payload.newStatus;
             }
        }
    },
    extraReducers: (builder) => {
        builder
            // --- Fetch Kitchen Orders ---
            .addCase(fetchKitchenOrders.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(fetchKitchenOrders.fulfilled, (state, action) => { state.status = 'succeeded'; state.kitchenOrders = action.payload; })
            .addCase(fetchKitchenOrders.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })

            // --- Fetch Billing Orders ---
            .addCase(fetchBillingOrders.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(fetchBillingOrders.fulfilled, (state, action) => { state.status = 'succeeded'; state.billingOrders = action.payload; })
            .addCase(fetchBillingOrders.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })
            
            // --- Create Order (Updates Kitchen List immediately) ---
            .addCase(createOrder.fulfilled, (state, action) => { 
                 state.kitchenOrders.unshift(action.payload);
            })

            // --- Update Order Status ---
            .addCase(updateOrderStatus.fulfilled, (state, action: PayloadAction<Order>) => {
                const updatedOrder = action.payload;
                
                // If status is 'Ready', remove from Kitchen list
                if (updatedOrder.status === 'Ready') {
                    state.kitchenOrders = state.kitchenOrders.filter(order => order._id !== updatedOrder._id);
                    // And add to Billing list
                    state.billingOrders.unshift(updatedOrder); 
                } 
                
                // If status is 'Billed' or 'Completed', remove from Billing list
                if (updatedOrder.status === 'Billed' || updatedOrder.status === 'Completed') {
                     state.billingOrders = state.billingOrders.filter(order => order._id !== updatedOrder._id);
                } 
                
                // For other transitions (Kitchen -> Kitchen), update in place
                if (updatedOrder.status === 'Kitchen' || updatedOrder.status === 'Served') {
                    const list = state.billingOrders.length > 0 ? state.billingOrders : state.kitchenOrders;
                    const index = list.findIndex(order => order._id === updatedOrder._id);
                    if (index !== -1) { list[index] = updatedOrder; }
                }

                state.status = 'succeeded';
            })
            .addCase(updateOrderStatus.rejected, (state, action) => {
                state.error = action.payload as string;
                Alert.alert("Status Update Failed", action.payload as string); // Notify user of API error
            });
    },
});

export const { resetOrderState, updateLocalStatus } = orderSlice.actions;

export default orderSlice.reducer;
