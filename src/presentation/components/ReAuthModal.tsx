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
  Platform,
} from 'react-native';
import { useReAuth } from '../hooks/useReAuth';
import { Button } from './Button';

interface ReAuthModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export const ReAuthModal: React.FC<ReAuthModalProps> = ({
  visible,
  onSuccess,
  onCancel,
  title = 'Re-authentication Required',
  message = 'Please confirm your identity to access sensitive information.',
}) => {
  const {
    isLoading,
    error,
    biometryType,
    biometricAvailable,
    authenticateWithBiometrics,
    authenticateWithPIN,
  } = useReAuth();
  const [pin, setPin] = useState('');

  const isAndroidWithoutBiometrics =
    Platform.OS === 'android' && !biometricAvailable;

  const handleAuth = async () => {
    try {
      let result;
      if (isAndroidWithoutBiometrics) {
        if (!pin || pin.length < 4) {
          Alert.alert('Error', 'Please enter a valid PIN (at least 4 digits).');
          return;
        }
        result = await authenticateWithPIN(pin);
      } else {
        result = await authenticateWithBiometrics();
      }

      if (result.success) {
        onSuccess();
      } else {
        Alert.alert(
          'Authentication Failed',
          result.error || 'Authentication failed.',
        );
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Authentication failed. Please try again.');
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  const getAuthButtonText = () => {
    if (isAndroidWithoutBiometrics) return 'Authenticate with PIN';

    if (!biometryType) return 'Use Biometric';

    switch (biometryType.toLowerCase()) {
      case 'touchid':
        return 'Use Touch ID';
      case 'faceid':
        return 'Use Face ID';
      case 'fingerprint':
        return 'Use Fingerprint';
      case 'face':
        return 'Use Face Recognition';
      default:
        return 'Use Biometric';
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

            {/* Authentication options */}
            <View style={styles.authOptions}>
              {isAndroidWithoutBiometrics && (
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
              )}
              <Button
                title={getAuthButtonText()}
                onPress={handleAuth}
                variant="primary"
                disabled={isLoading}
              />
            </View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Authenticating...</Text>
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
  authOptions: {
    gap: 12,
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
  authButton: {
    marginBottom: 0,
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
