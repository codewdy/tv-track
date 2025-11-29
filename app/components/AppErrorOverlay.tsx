import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAppError } from '../context/AppErrorContext';

export default function AppErrorOverlay() {
    const { error, clearError } = useAppError();

    if (!error) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.message}>{error}</Text>
                <TouchableOpacity onPress={clearError} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999, // Ensure it's on top of everything
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        backgroundColor: '#ffdddd', // Light red background for error
        borderColor: '#ff0000',
        borderWidth: 1,
        borderRadius: 8,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '90%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    message: {
        color: '#d8000c', // Dark red text
        fontSize: 14,
        flex: 1,
        marginRight: 10,
    },
    closeButton: {
        padding: 5,
    },
    closeButtonText: {
        fontSize: 18,
        color: '#d8000c',
        fontWeight: 'bold',
    },
});
