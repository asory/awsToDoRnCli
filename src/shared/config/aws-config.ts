import { Amplify } from 'aws-amplify';
import amplifyConfig from '/Users/rosapina/Workspace/interviewTest/aws-cognito-RN/awsToDoRnCli/backend/amplify_outputs.json';


export const configureAmplify = () => {
  try {
    Amplify.configure(amplifyConfig as any);
    console.log('✅ AWS Amplify configurado correctamente');
  } catch (error) {
    console.error('❌ Error configurando AWS Amplify:', error);
  }
};

