import { Amplify } from 'aws-amplify';
import amplifyConfig from '../../../backend/amplify_outputs.json';


export const configureAmplify = () => {
  try {
    Amplify.configure(amplifyConfig as any);
  } catch (error) {
    console.error('Error configuring AWS Amplify:', error);
  }
};

