import { createSlice, createAsyncThunk, PayloadAction, isAnyOf } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import axios, { AxiosError } from 'axios';
// 1. Import the configuration file
import appConfig from '../../../config/appConfig'; // Adjust the relative path as necessary

// Define the structure for the user object from the backend
interface User {
    id: string;
    username: string; 
    role: 'Vendor' | 'Server' | 'Kitchen' | 'Billing';
    isApproved: boolean;
    vendorId: string;
}

// Define the structure for the successful response data
interface AuthSuccessPayload {
    token: string;
    user: User;
}

// Define the structure for the slice's state 
interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean; 
    isAppReady: boolean; // Tracks if initial AsyncStorage load is complete 
    error: string | null;
}

// Initial state 
const initialState: AuthState = {
    token: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isAppReady: false, 
    error: null,
};

// --- Storage Utilities (Async) ---

const saveAuthData = async (token: string, user: User) => {
    // Keys 'token' and 'user' must match the load/clear functions
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
};

const clearAuthData = async () => {
    // Fire and forget: don't await in synchronous reducers
    AsyncStorage.removeItem('token');
    AsyncStorage.removeItem('user');
};

// --- ASYNC THUNK: Load Initial State (Revisions here) ---
/**
 * Thunk to load initial authentication state from AsyncStorage on app startup.
 * Enhanced error handling to ensure if the token loads but the user object is corrupted, 
 * the app stays logged in if possible, but still sets isAppReady to true.
 */
export const loadInitialAuth = createAsyncThunk<
    { token: string | null, user: User | null },
    void,
    { rejectValue: string }
>('auth/loadInitialAuth', async (_, { rejectWithValue }) => {
    try {
        // Step 1: Load the token first. This is the primary indicator of authentication.
        const token = await AsyncStorage.getItem('token');
        
        let user: User | null = null;
        
        if (token) {
            // Step 2: If token exists, try to load and parse the user object.
            const userJson = await AsyncStorage.getItem('user');

            if (userJson) {
                try {
                    // Attempt to parse the user data
                    user = JSON.parse(userJson) as User;
                } catch (jsonError) {
                    console.error('Failed to parse stored user data (corrupted user JSON):', jsonError);
                    // If parsing fails, we log the error but proceed with user: null
                    // The token is still valid, so we return it.
                }
            }
        }
        
        // Return whatever was successfully loaded. If token is null, both are null.
        return { token, user };
        
    } catch (storageError) {
        // This catch block handles low-level AsyncStorage errors (rare but possible)
        console.error('Failed to load initial auth data from storage:', storageError);
        return { token: null, user: null };
    }
});


// 2. Use appConfig.apiUrl to define the base URL for authentication routes
// appConfig.apiUrl already holds the base like "https://.../api"
const AUTH_BASE_URL = `${appConfig.apiUrl}/auth`; 

/**
 * Thunk for user registration.
 */
export const registerUser = createAsyncThunk<
    AuthSuccessPayload | { msg: string }, 
    any, 
    { rejectValue: string }
>('auth/registerUser', async (userData, { rejectWithValue }) => {
    try {
        // 3. Use the full, environment-specific URL
        const res = await axios.post(`${AUTH_BASE_URL}/register`, userData);
        
        // Vendor registration success returns token/user and logs in immediately
        if (userData.role === 'Vendor') {
            const payload = res.data as AuthSuccessPayload;
            await saveAuthData(payload.token, payload.user); 
            return payload;
        }
        
        // Staff registration success returns a message (pending approval)
        return res.data;

    } catch (err) {
        const error = err as AxiosError;
        if (error.response && error.response.data && (error.response.data as any).msg) {
            return rejectWithValue((error.response.data as any).msg);
        }
        return rejectWithValue('Registration failed due to a server error.');
    }
});


/**
 * Thunk for user login.
 */
export const loginUser = createAsyncThunk<
    AuthSuccessPayload, 
    any, 
    { rejectValue: string }
>('auth/loginUser', async (loginData, { rejectWithValue }) => {
    try {
        // 4. Use the full, environment-specific URL
        const res = await axios.post(`${AUTH_BASE_URL}/login`, loginData);
        const payload = res.data as AuthSuccessPayload;

        // CRITICAL: Ensure the token is saved here on successful login
        await saveAuthData(payload.token, payload.user); 

        return payload;
    } catch (err) {
        const error = err as AxiosError;
        if (error.response && error.response.data && (error.response.data as any).msg) {
            return rejectWithValue((error.response.data as any).msg);
        }
        return rejectWithValue('Login failed due to a server error.');
    }
});

// --- Auth Slice Definition ---

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        /**
         * Reducer for manual logout. Clears state and asynchronously clears storage.
         */
        logout: (state) => {
            clearAuthData(); // Clears storage asynchronously
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
        },
        /**
         * Reducer to clear a previous error message from the state.
         */
        clearAuthError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        // --- App Initialization Handlers ---
        builder
            .addCase(loadInitialAuth.fulfilled, (state, action) => {
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.isAuthenticated = !!action.payload.token;
                state.isAppReady = true; // Set app ready after loading storage
                state.isLoading = false; // Ensure loading is off
                state.error = null; // Clear previous errors
            })
            .addCase(loadInitialAuth.rejected, (state) => {
                // If the thunk fails to load (e.g. AsyncStorage error), reset state
                state.isAuthenticated = false;
                state.token = null;
                state.user = null;
                state.isAppReady = true; // Still set app ready even if loading failed
                state.isLoading = false;
                state.error = 'Failed to read persistent storage.';
            });
            
        // --- Login Thunk Handlers ---
        builder
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthSuccessPayload>) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.token = action.payload.token;
                state.user = action.payload.user;
            })
            .addCase(loginUser.rejected, (state, action) => {
                clearAuthData(); // Clear storage on failed login attempt
                state.isLoading = false;
                state.isAuthenticated = false;
                state.token = null;
                state.user = null;
                state.error = action.payload as string; // Error message from rejectWithValue
            });

        // --- Register Thunk Handlers ---
        builder
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null; 

                const payload = action.payload as AuthSuccessPayload | { msg: string };
                if ('token' in payload && payload.token) {
                    // Vendor registration/immediate login
                    state.isAuthenticated = true;
                    state.token = payload.token;
                    state.user = (payload as AuthSuccessPayload).user;
                } 
                // If it's a staff registration, the state remains logged out (pending approval message handled in RegisterScreen)
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

/**
 * Export the action creators for manual logout and clearing errors.
 */
export const { logout, clearAuthError } = authSlice.actions;

export default authSlice.reducer;
