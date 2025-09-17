import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { validateEmail } from '../../../shared/utils/validation';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { forgotPassword } = useAuth();

  const validateForm = () => {
    const validation = validateEmail(email);
    setEmailError(validation.error || '');
    return validation.isValid;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await forgotPassword(email);

      if (result.success) {
        Alert.alert(
          'Reset Code Sent',
          'Please check your email for the password reset code.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('ResetPassword', { email }),
            },
          ],
        );
      } else {
        Alert.alert('Error', result.error || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a reset code.
        </Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          error={emailError}
        />

        <Button
          title="Send Reset Code"
          onPress={handleResetPassword}
          loading={isLoading}
          disabled={isLoading}
        />

        <Button
          title="Back to Login"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
});

export default ForgotPasswordScreen;
