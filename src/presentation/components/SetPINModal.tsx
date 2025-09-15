import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useReAuth } from '../hooks/useReAuth';
import { Button } from './Button';

interface SetPINModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export const SetPINModal: React.FC<SetPINModalProps> = ({
  visible,
  onSuccess,
  onCancel,
  title = 'Set PIN',
  message = 'Enter a 4-digit PIN for authentication.',
}) => {
  const { setPIN, isLoading, error } = useReAuth();
  const [pin, setPin] = useState('');

  const handleSetPIN = async () => {
    if (!pin || pin.length < 4) {
      Alert.alert('Error', 'Please enter a valid PIN (at least 4 digits).');
      return;
    }

    try {
      const result = await setPIN(pin);
      if (result.success) {
        Alert.alert('Success', 'PIN set successfully.');
        onSuccess();
      } else {
        Alert.alert('Error', result.error || 'Failed to set PIN.');
      }
    } catch (error: any) {
      console.error('Set PIN error:', error);
      Alert.alert('Error', 'Failed to set PIN. Please try again.');
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TextInput
              style={styles.pinInput}
              placeholder="Enter PIN"
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              editable={!isLoading}
            />
            <Button
              title="Set PIN"
              onPress={handleSetPIN}
              variant="primary"
              disabled={isLoading}
            />

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Setting PIN...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.cancelText,
                  isLoading && styles.cancelTextDisabled,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  cancelButton: {
    marginTop: 24,
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  cancelTextDisabled: {
    color: '#ccc',
  },
});
