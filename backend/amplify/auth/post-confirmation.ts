import { PostConfirmationTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async event => {
  const { userPoolId, userName } = event;
  const email = event.request.userAttributes?.email;
  const isAdmin = email?.includes('admin');
  const groupName = isAdmin ? 'admins' : 'users';

  try {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: userName,
        GroupName: groupName,
      }),
    );
  } catch (error: any) {
    if (
      error.name === 'InvalidParameterException' &&
      error.message?.includes('already exists in the group')
    ) {
    } else {
      console.error('Error adding user to group:', error);
    }
  }

  return event;
};
