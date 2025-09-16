import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
} from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const GROUP_PERMISSIONS = {
  users: ['read'],
  admins: ['create', 'read', 'update', 'delete'],
};

const RESOURCE_METHODS = {
  'GET /tasks': ['read'],
  'POST /tasks': ['create'],
  'GET /tasks/{id}': ['read'],
  'PUT /tasks/{id}': ['update'],
  'DELETE /tasks/{id}': ['delete'],
};

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.CLIENT_ID!,
});

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> => {
  try {
    const token = event.authorizationToken;

    if (!token || !token.startsWith('Bearer ')) {
      return generateDenyPolicy('user', event.methodArn);
    }

    const jwtToken = token.substring(7);

    let payload;
    try {
      payload = await verifier.verify(jwtToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      return generateDenyPolicy('user', event.methodArn);
    }

    const groups: string[] = payload['cognito:groups'] || [];
    const userId = payload.sub as string;

    const customClaims = extractCustomClaims(payload);
    const userPermissions = getUserPermissions(groups);
    const hasPermission = checkPermission(event.methodArn, userPermissions);

    if (!hasPermission) {
      return generateDenyPolicy(userId, event.methodArn);
    }

    return generateAllowPolicy(userId, event.methodArn, {
      groups,
      customClaims,
      userId,
    });
  } catch (error) {
    console.error('Authorizer error:', error);
    return generateDenyPolicy('user', event.methodArn);
  }
};

function extractCustomClaims(payload: any): { [key: string]: any } {
  const customClaims: { [key: string]: any } = {};

  Object.keys(payload).forEach(key => {
    if (key.startsWith('custom:')) {
      customClaims[key] = payload[key];
    }
  });

  return customClaims;
}

function getUserPermissions(groups: string[]): string[] {
  const permissions: string[] = [];

  groups.forEach(group => {
    const groupPerms =
      GROUP_PERMISSIONS[group as keyof typeof GROUP_PERMISSIONS] || [];
    permissions.push(...groupPerms);
  });

  return [...new Set(permissions)]; 
}

function checkPermission(
  methodArn: string,
  userPermissions: string[],
): boolean {

  const arnParts = methodArn.split(':');
  const resourcePart = arnParts[5];
  const resourceParts = resourcePart.split('/');
  const method = resourceParts[2];
  const resource = resourceParts.slice(3).join('/').replace(/\/$/, ''); 

  const resourceKey = `${method} /${resource}`;

  const requiredPermissions =
    RESOURCE_METHODS[resourceKey as keyof typeof RESOURCE_METHODS] || [];
  // Check if user has all required permissions
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}

function generateAllowPolicy(
  principalId: string,
  methodArn: string,
  context?: any,
): APIGatewayAuthorizerResult {
  // Extract account from methodArn
  const arnParts = methodArn.split(':');
  const account = arnParts[4];

  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow' as const,
        Principal: {
          AWS: `arn:aws:iam::${account}:root`,
        },
        Action: 'execute-api:Invoke',
        Resource: methodArn,
      },
    ],
  };

  return {
    principalId,
    policyDocument,
    context,
  };
}

function generateDenyPolicy(
  principalId: string,
  methodArn: string,
): APIGatewayAuthorizerResult {
  
  const arnParts = methodArn.split(':');
  const account = arnParts[4];

  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Deny' as const,
        Principal: {
          AWS: `arn:aws:iam::${account}:root`,
        },
        Action: 'execute-api:Invoke',
        Resource: methodArn,
      },
    ],
  };

  return {
    principalId,
    policyDocument,
  };
}
