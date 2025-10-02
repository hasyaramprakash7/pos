import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import { RootState } from '../store/store'; 
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

export interface Order { 
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

// NEW INTERFACE: For fetching completed orders (Date range payload)
interface DateRangePayload {
    startDate: string; 
    endDate: string; 
}

// NEW INTERFACE: Matches the object returned by the backend's getCompletedOrders
interface CompletedOrdersResponse {
    orders: Order[];
    totalSales: string; 
    count: number;
}

interface OrderState {
    kitchenOrders: Order[];
    billingOrders: Order[];
    // NEW STATE FOR REPORTS:
    completedOrders: Order[]; 
    totalCompletedSales: number;
    // ---
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// Initial state 
const initialState: OrderState = {
    kitchenOrders: [],
    billingOrders: [],
    completedOrders: [], 
    totalCompletedSales: 0, 
    status: 'idle',
    error: null,
};

// --- API Base URL Setup ---
const BASE_URL = `${appConfig.apiUrl}/orders`; 

// Helper to get authorization headers (Uses token from Redux state)
const getConfig = (token: string | null) => {
    if (!token) {
        throw new Error('Authentication token is missing.');
    }
    return {
        headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
        },
    };
};

// Helper to retrieve token from Redux state (used in all thunks)
const getToken = (getState: any): string | null => {
    return getState().auth.token;
};


// --- ASYNC THUNKS (API Calls) ---

// 1. Server creates a new order
export const createOrder = createAsyncThunk<Order, any, { state: RootState, rejectValue: string }>(
    'order/createOrder',
    async (orderData, { getState, rejectWithValue }) => {
        const token = getToken(getState);
        try {
            const config = getConfig(token);
            const response = await axios.post(BASE_URL, orderData, config);
            return response.data; 
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || error.message || 'Failed to create order.';
            return rejectWithValue(msg);
        }
    }
);

// 2. Kitchen fetches its list
export const fetchKitchenOrders = createAsyncThunk<Order[], void, { state: RootState, rejectValue: string }>(
    'order/fetchKitchenOrders',
    async (_, { getState, rejectWithValue }) => {
        const token = getToken(getState);
        try {
            const config = getConfig(token);
            const response = await axios.get(`${BASE_URL}/kitchen`, config);
            return response.data;
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || error.message || 'Failed to fetch kitchen orders.';
            return rejectWithValue(msg);
        }
    }
);

// 3. Billing fetches its list
export const fetchBillingOrders = createAsyncThunk<Order[], void, { state: RootState, rejectValue: string }>(
    'order/fetchBillingOrders',
    async (_, { getState, rejectWithValue }) => {
        const token = getToken(getState);
        try {
            const config = getConfig(token);
            const response = await axios.get(`${BASE_URL}/billing`, config);
            return response.data;
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || error.message || 'Failed to fetch billing orders.';
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
        const token = getToken(getState);
        try {
            const config = getConfig(token);
            const response = await axios.put(`${BASE_URL}/${orderId}/status`, { newStatus }, config);
            return response.data.order; // Assuming controller returns { msg: ..., order: updatedOrder }
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || error.message || 'Failed to update order status.';
            return rejectWithValue(msg);
        }
    }
);


// 5. Add items to an existing order (KOTS/Add-ons)
interface AddItemsPayload {
    orderId: string;
    newItems: OrderItem[]; // The new items being added (menuItemId, quantity, itemTableNumber, etc.)
}
export const addItemsToOrder = createAsyncThunk<
    Order, // Returns the updated order
    AddItemsPayload,
    { state: RootState, rejectValue: string }
>(
    'order/addItemsToOrder',
    async ({ orderId, newItems }, { getState, rejectWithValue }) => {
        const token = getToken(getState);
        try {
            const config = getConfig(token);
            // PUT /api/orders/:id/items
            const response = await axios.put(`${BASE_URL}/${orderId}/items`, { newItems }, config);
            return response.data.order; // Assuming backend returns { msg: ..., order: updatedOrder }
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || error.message || 'Failed to add items to order.';
            return rejectWithValue(msg);
        }
    }
);

// 📢 NEW THUNK: Fetch completed/billed orders for reporting
export const fetchCompletedOrders = createAsyncThunk<
    CompletedOrdersResponse, // Expected return structure from the backend
    DateRangePayload,
    { state: RootState, rejectValue: string }
>(
    'order/fetchCompletedOrders',
    async ({ startDate, endDate }, { getState, rejectWithValue }) => {
        const token = getToken(getState);
        try {
            const config = getConfig(token);
            // Calls the backend endpoint with date query parameters
            const response = await axios.get(
                `${BASE_URL}/completed?startDate=${startDate}&endDate=${endDate}`, 
                config
            );
            // The backend returns { count, totalSales, orders }
            return response.data;
        } catch (err) {
            const error = err as AxiosError;
            const msg = (error.response?.data as any)?.msg || error.message || 'Failed to fetch sales report.';
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
            state.completedOrders = []; // Reset completed as well
            state.totalCompletedSales = 0; // Reset sales total
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
            .addCase(fetchKitchenOrders.fulfilled, (state, action) => { 
                state.status = 'succeeded'; 
                state.kitchenOrders = action.payload; 
                // 💡 LOG: Kitchen Orders Fetch Success
                console.log('--- fetchKitchenOrders.fulfilled ---');
                console.log('Fetched Kitchen Orders:', action.payload);
            })
            .addCase(fetchKitchenOrders.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })

            // --- Fetch Billing Orders ---
            .addCase(fetchBillingOrders.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(fetchBillingOrders.fulfilled, (state, action) => { 
                state.status = 'succeeded'; 
                state.billingOrders = action.payload; 
                // 💡 LOG: Billing Orders Fetch Success
                console.log('--- fetchBillingOrders.fulfilled ---');
                console.log('Fetched Billing Orders:', action.payload);
            })
            .addCase(fetchBillingOrders.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload as string; })
            
            // --- Create Order (Updates Kitchen List immediately) ---
            .addCase(createOrder.fulfilled, (state, action) => { 
                 state.kitchenOrders.unshift(action.payload);
                 // 💡 LOG: Order Creation Success
                 console.log('--- createOrder.fulfilled ---');
                 console.log('New Order Created:', action.payload);
            })

            // --- Update Order Status ---
            .addCase(updateOrderStatus.fulfilled, (state, action: PayloadAction<Order>) => {
                 const updatedOrder = action.payload;
                 // 💡 LOG: Order Status Update Success
                 console.log('--- updateOrderStatus.fulfilled ---');
                 console.log(`Order ${updatedOrder._id} updated to status: ${updatedOrder.status}`, updatedOrder);
                
                 // Find and update the order in active lists (Kitchen/Billing)
                 const updateList = (list: Order[], order: Order): Order[] => {
                    const index = list.findIndex(o => o._id === order._id);
                    if (index !== -1) {
                         list[index] = order;
                    }
                    return list; // Return mutated list
                 };

                 state.kitchenOrders = updateList(state.kitchenOrders, updatedOrder);
                 state.billingOrders = updateList(state.billingOrders, updatedOrder);


                 // Special handling for list transition:
                 if (updatedOrder.status === 'Ready') {
                     // If status is Ready, remove from Kitchen and ensure it's in Billing
                     state.kitchenOrders = state.kitchenOrders.filter(o => o._id !== updatedOrder._id);
                     if (!state.billingOrders.find(o => o._id === updatedOrder._id)) {
                         state.billingOrders.unshift(updatedOrder);
                     }
                 }
                 
                 if (updatedOrder.status === 'Billed' || updatedOrder.status === 'Completed') {
                     // 🚨 CRITICAL FIX: Remove completed orders from ALL active lists immediately.
                     state.kitchenOrders = state.kitchenOrders.filter(o => o._id !== updatedOrder._id);
                     state.billingOrders = state.billingOrders.filter(o => o._id !== updatedOrder._id);
                 } 
                 
                 state.status = 'succeeded';
            })
            .addCase(updateOrderStatus.rejected, (state, action) => {
                 state.error = action.payload as string;
            })
            
            // --- Handle Add Items to Order Success ---
            .addCase(addItemsToOrder.fulfilled, (state, action: PayloadAction<Order>) => {
                 const updatedOrder = action.payload;
                 // 💡 LOG: Add Items Success
                 console.log('--- addItemsToOrder.fulfilled ---');
                 console.log('Items Added. Updated Order:', updatedOrder);

                 // Helper to replace an order in a list
                 const replaceOrder = (list: Order[], order: Order): Order[] => {
                     const index = list.findIndex(o => o._id === order._id);
                     if (index !== -1) {
                         list[index] = order; 
                     }
                     return list;
                 };

                 state.kitchenOrders = replaceOrder(state.kitchenOrders, updatedOrder);
                 state.billingOrders = replaceOrder(state.billingOrders, updatedOrder);
            })
            .addCase(addItemsToOrder.rejected, (state, action) => {
                 state.error = action.payload as string;
            })
            
            // 📢 NEW: Handle Fetch Completed Orders Lifecycle
            .addCase(fetchCompletedOrders.pending, (state) => {
                 state.status = 'loading'; 
                 state.error = null;
            })
            .addCase(fetchCompletedOrders.fulfilled, (state, action: PayloadAction<CompletedOrdersResponse>) => {
                 state.status = 'succeeded';
                 state.completedOrders = action.payload.orders; 
                 // Convert the string totalSales from the backend to a number
                 state.totalCompletedSales = Number(action.payload.totalSales);
                 // 💡 LOG: Completed Orders Report Success
                 console.log('--- fetchCompletedOrders.fulfilled (Report) ---');
                 console.log('Total Sales:', action.payload.totalSales);
                 console.log('Completed Orders Count:', action.payload.count);
                 console.log('Completed Orders Data (first 5):', action.payload.orders.slice(0, 5));
            })
            .addCase(fetchCompletedOrders.rejected, (state, action) => {
                 state.status = 'failed';
                 state.completedOrders = [];
                 state.totalCompletedSales = 0;
                 state.error = action.payload as string;
            });
    },
});

export const { resetOrderState, updateLocalStatus } = orderSlice.actions;

// --- SELECTORS ---
export const selectCompletedOrders = (state: RootState) => state.order.completedOrders;
export const selectTotalCompletedSales = (state: RootState) => state.order.totalCompletedSales;
export const selectOrderStatus = (state: RootState) => state.order.status; 

// 🚨 UPDATED SELECTOR: STRICTLY filters for orders that are truly active (not Billed/Completed)
export const selectActiveOrders = (state: RootState) => 
    state.order.billingOrders.filter(
        order => order.status !== 'Billed' && order.status !== 'Completed'
    );

export default orderSlice.reducer;