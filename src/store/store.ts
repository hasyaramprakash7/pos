import { configureStore } from '@reduxjs/toolkit';

// Import your reducers
import authReducer from './slices/authSlice';
import vendorStaffReducer from './slices/vendorStaffSlice';
import menuItemReducer from './slices/menuItemSlice'; 
import vendorAuthReducer from './slices/vendorAuthSlice';
// 📢 IMPORT THE NEW ORDER REDUCER
import orderReducer from './slices/orderSlice'; 

export const store = configureStore({
	reducer: {
		// 1. Core Authentication
		auth: authReducer, 
		
		// 2. Vendor Business/Profile Data (used by MenuItemCRUD)
		vendorAuth: vendorAuthReducer, 
		
		// 3. Menu/Product Management
		menuItem: menuItemReducer, 

		// 4. Staff Management
		vendorStaff: vendorStaffReducer, 
		
		// 📢 5. NEW: Order and KOT Management (Used by OrderManagementScreen)
		order: orderReducer, 
	},
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
