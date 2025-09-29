import React, { useEffect } from 'react';
import { 
    View, 
    Text, 
    ActivityIndicator, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity,
    Alert
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

// Assuming these paths are correct in your project structure
import { RootState } from '../../store/store'; 
import { 
    fetchStaff, 
    approveStaff, 
    deleteStaff, 
    clearStaffError 
} from '../../store/slices/vendorStaffSlice'; 

// Define the type for the staff member to use in FlatList
interface StaffMember {
    _id: string;
    username: string;
    role: 'Server' | 'Kitchen' | 'Billing';
    isApproved: boolean;
}

const VendorStaffManagerScreen = () => {
    const dispatch = useDispatch();
    
    // Select state from the vendorStaff slice
    const { staffList, isLoading, error } = useSelector((state: RootState) => state.vendorStaff);

    // Fetch staff when the component mounts
    useEffect(() => {
        // Dispatch must be cast to any if the types for thunks are complex
        dispatch(fetchStaff() as any); 
    }, [dispatch]);

    // Show alerts for API errors
    useEffect(() => {
        if (error) {
            Alert.alert("Staff Error", error, [{ text: "OK", onPress: () => dispatch(clearStaffError()) }]);
        }
    }, [error, dispatch]);


    // --- ACTION HANDLERS ---

    const handleApprove = (staffId: string, username: string) => {
        Alert.alert(
            "Approve Staff",
            `Do you confirm approval for ${username}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Approve", 
                    onPress: () => {
                        dispatch(approveStaff(staffId) as any)
                            .then(() => Alert.alert("Success", `${username} approved!`))
                            .catch(() => { /* Error handled by useEffect/Alert */ });
                    },
                    style: "default"
                },
            ]
        );
    };

    const handleDelete = (staffId: string, username: string) => {
        Alert.alert(
            "Delete Staff",
            `Are you sure you want to delete ${username}? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    onPress: () => {
                        dispatch(deleteStaff(staffId) as any)
                            .then(() => Alert.alert("Success", `${username} deleted!`))
                            .catch(() => { /* Error handled by useEffect/Alert */ });
                    },
                    style: "destructive"
                },
            ]
        );
    };
    
    const handleRefresh = () => {
        dispatch(fetchStaff() as any);
    };


    // --- RENDER FUNCTIONS ---

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Loading staff list...</Text>
            </View>
        );
    }

    const renderStaffItem = ({ item }: { item: StaffMember }) => (
        <View style={styles.staffCard}>
            <View style={styles.staffInfo}>
                <Text style={styles.staffUsername}>{item.username}</Text>
                <Text style={styles.staffRole}>Role: {item.role}</Text>
                <Text 
                    style={[
                        styles.staffStatus, 
                        { color: item.isApproved ? '#155724' : '#856404' }
                    ]}
                >
                    Status: {item.isApproved ? '✅ Approved' : '❌ Pending'}
                </Text>
            </View>

            <View style={styles.actionsContainer}>
                {!item.isApproved && (
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(item._id, item.username)}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>Approve</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item._id, item.username)}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Staff Management</Text>
            
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
                <Text style={styles.refreshButtonText}>Refresh List</Text>
            </TouchableOpacity>

            {staffList.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No staff accounts found.</Text>
                    <Text style={styles.emptyTextSub}>Staff must register and link to your Vendor ID before appearing here.</Text>
                </View>
            ) : (
                <FlatList
                    data={staffList}
                    keyExtractor={(item) => item._id}
                    renderItem={renderStaffItem}
                    contentContainerStyle={styles.listContent}
                    refreshing={isLoading}
                    onRefresh={handleRefresh}
                />
            )}
        </View>
    );
};

// --- STYLES ---

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        backgroundColor: '#f8f8f8',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6c757d',
    },
    header: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#343a40',
        marginBottom: 15,
        textAlign: 'center',
    },
    refreshButton: {
        backgroundColor: '#17a2b8',
        padding: 10,
        borderRadius: 5,
        marginBottom: 15,
        alignItems: 'center',
    },
    refreshButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 20,
    },
    staffCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: '#007bff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1.5,
        elevation: 2,
    },
    staffInfo: {
        flex: 1,
    },
    staffUsername: {
        fontSize: 18,
        fontWeight: '600',
        color: '#343a40',
    },
    staffRole: {
        fontSize: 14,
        color: '#6c757d',
        marginTop: 2,
    },
    staffStatus: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5,
    },
    actionsContainer: {
        flexDirection: 'row',
        marginLeft: 10,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
        marginLeft: 10,
    },
    approveButton: {
        backgroundColor: '#28a745', // Green
    },
    deleteButton: {
        backgroundColor: '#dc3545', // Red
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        color: '#6c757d',
        marginBottom: 5,
    },
    emptyTextSub: {
        fontSize: 14,
        color: '#adb5bd',
        textAlign: 'center'
    }
});

export default VendorStaffManagerScreen;