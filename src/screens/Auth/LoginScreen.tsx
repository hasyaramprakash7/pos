import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Assuming these imports are correct based on your project structure
import { loginUser, clearAuthError } from '../../store/slices/authSlice';
import { RootState, AppDispatchType } from '../../store/store'; 

type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    Dashboard: undefined; 
};
type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    
    const dispatch = useDispatch<AppDispatchType>(); 
    const navigation = useNavigation<LoginScreenNavigationProp>(); 

    const { isAuthenticated, isLoading, error } = useSelector(
        (state: RootState) => state.auth
    );

    useEffect(() => {
        if (isAuthenticated) {
            // Navigate and replace history so the user can't go back to login
            navigation.replace('Dashboard');
        }
    }, [isAuthenticated, navigation]);

    useEffect(() => {
        return () => {
            // Clear error on component unmount
            if (error) {
                dispatch(clearAuthError());
            }
        };
    }, [dispatch, error]);

    const handleChange = (name: 'username' | 'password', value: string) => {
        setFormData({ ...formData, [name]: value });
        if (error) {
            dispatch(clearAuthError());
        }
    };

    const handleSubmit = () => {
        // The 'as any' might be necessary depending on your Thunk action type definitions
        dispatch(loginUser(formData) as any);
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.container}>
                <Text style={styles.header}>User Login</Text>
                
                {/* FIX: Changed from {error && <Text>...</Text>} 
                  to {error ? <Text>...</Text> : null} to prevent the 
                  "Text strings must be rendered within a <Text> component" error.
                */}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                
                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        value={formData.username}
                        onChangeText={(text) => handleChange('username', text)}
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        secureTextEntry
                        value={formData.password}
                        onChangeText={(text) => handleChange('password', text)}
                        autoCapitalize="none"
                    />
                    
                    <TouchableOpacity 
                        style={[styles.button, isLoading && styles.buttonDisabled]} 
                        onPress={handleSubmit} 
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Login</Text>
                        )}
                    </TouchableOpacity>
                </View>
                
                {/* The structure here is correct: 
                  raw text is wrapped in a <Text> component, and 
                  the nested touchable text is in its own <Text> component.
                */}
                <Text style={styles.linkText}>
                    <Text>Don't have an account? </Text>
                    <Text 
                        onPress={() => navigation.navigate('Register')} 
                        style={styles.link}
                    >
                        Register here
                    </Text>
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: { 
        flexGrow: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f4f7f9',
        paddingVertical: 20
    },
    container: { 
        width: '90%',
        maxWidth: 400,
        padding: 20, 
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    header: { 
        fontSize: 28, 
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#333',
        textAlign: 'center',
    },
    form: { 
        gap: 15,
        marginBottom: 20,
    },
    input: { 
        padding: 15, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#ddd', 
        backgroundColor: '#fff',
        fontSize: 16,
    },
    button: { 
        padding: 15, 
        backgroundColor: '#007bff', 
        borderRadius: 8, 
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#9cc3e8',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorText: { 
        color: 'red', 
        textAlign: 'center', 
        marginBottom: 20,
        fontSize: 16,
    },
    linkText: { 
        textAlign: 'center', 
        marginTop: 15, 
        fontSize: 16,
        color: '#666',
    },
    link: { 
        color: '#007bff', 
        textDecorationLine: 'underline',
        fontWeight: '600',
    }
});

export default LoginScreen;