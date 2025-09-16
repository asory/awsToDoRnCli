import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.CLIENT_ID!,
});

interface Task {
  id: string;
  ownerId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const authHeader =
      event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const token = authHeader.substring(7);
    let payload;

    try {
      payload = await verifier.verify(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    const userId = payload.sub as string;
    const scopes = extractScopes(payload);

    const { httpMethod, path, pathParameters, body } = event;
    const tableName = process.env.TASKS_TABLE!;

    switch (`${httpMethod} ${path.replace(/\/$/, '')}`) {
      case 'GET /tasks':
        return await handleGetTasks(userId, scopes, tableName);

      case 'POST /tasks':
        return await handleCreateTask(
          userId,
          scopes,
          tableName,
          body || undefined,
        );

      case 'GET /tasks/{id}':
        return await handleGetTask(
          userId,
          scopes,
          tableName,
          pathParameters?.id || undefined,
        );

      case 'PUT /tasks/{id}':
        return await handleUpdateTask(
          userId,
          scopes,
          tableName,
          pathParameters?.id || undefined,
          body || undefined,
        );

      case 'DELETE /tasks/{id}':
        return await handleDeleteTask(
          userId,
          scopes,
          tableName,
          pathParameters?.id,
        );

      default:
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Not found' }),
        };
    }
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

const extractScopes = (payload: any): string[] => {
  const scopes: string[] = [];

  if (payload.scope) {
    scopes.push(...payload.scope.split(' '));
  }

  if (payload['cognito:groups']) {
    payload['cognito:groups'].forEach((group: string) => {
      const groupScopes = mapGroupToScopes(group);
      scopes.push(...groupScopes);
    });
  }

  if (payload['custom:scopes']) {
    scopes.push(...payload['custom:scopes'].split(' '));
  }

  return [...new Set(scopes)];
}

const mapGroupToScopes = (group: string): string[] => {
  const groupScopeMapping: { [key: string]: string[] } = {
    users: ['tasks:read'],
    admins: ['tasks:read', 'tasks:write'],
  };

  return groupScopeMapping[group] || [];
}

 const handleGetTasks = async (
  userId: string,
  scopes: string[],
  tableName: string,
): Promise<APIGatewayProxyResult> => {
  if (!scopes.includes('tasks:read')) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Insufficient permissions to read tasks' }),
    };
  }

  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: 'ownerId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  });

  const result = await docClient.send(command);

  return {
    statusCode: 200,
    body: JSON.stringify(result.Items || []),
  };
}

const handleCreateTask = async (
  userId: string,
  scopes: string[],
  tableName: string,
  body?: string,
): Promise<APIGatewayProxyResult> => {
  if (!scopes.includes('tasks:write')) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: 'Insufficient permissions to create tasks',
      }),
    };
  }

  if (!body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing request body' }),
    };
  }

  const { title } = JSON.parse(body);
  if (!title) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Title is required' }),
    };
  }

  const task: Task = {
    id: uuidv4(),
    ownerId: userId,
    title,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: task,
  });

  await docClient.send(command);

  return {
    statusCode: 201,
    body: JSON.stringify(task),
  };
}

const handleGetTask = async (
  userId: string,
  scopes: string[],
  tableName: string,
  taskId?: string,
): Promise<APIGatewayProxyResult> => {
  if (!scopes.includes('tasks:read')) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Insufficient permissions to read tasks' }),
    };
  }

  if (!taskId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Task ID is required' }),
    };
  }

  const command = new GetCommand({
    TableName: tableName,
    Key: {
      id: taskId,
      ownerId: userId,
    },
  });

  const result = await docClient.send(command);

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Task not found' }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
}

const handleUpdateTask = async (
  userId: string,
  scopes: string[],
  tableName: string,
  taskId?: string,
  body?: string,
): Promise<APIGatewayProxyResult> => {
  if (!scopes.includes('tasks:write')) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: 'Insufficient permissions to update tasks',
      }),
    };
  }

  if (!taskId || !body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Task ID and request body are required' }),
    };
  }

  const { title, completed } = JSON.parse(body);

  const command = new UpdateCommand({
    TableName: tableName,
    Key: {
      id: taskId,
      ownerId: userId,
    },
    UpdateExpression:
      'SET title = :title, completed = :completed, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':title': title,
      ':completed': completed,
      ':updatedAt': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  });

  const result = await docClient.send(command);

  return {
    statusCode: 200,
    body: JSON.stringify(result.Attributes),
  };
}

const handleDeleteTask = async (
  userId: string,
  scopes: string[],
  tableName: string,
  taskId?: string,
): Promise<APIGatewayProxyResult> => {
  if (!scopes.includes('tasks:write')) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: 'Insufficient permissions to delete tasks',
      }),
    };
  }

  if (!taskId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Task ID is required' }),
    };
  }

  const command = new DeleteCommand({
    TableName: tableName,
    Key: {
      id: taskId,
      ownerId: userId,
    },
  });

  await docClient.send(command);

  return {
    statusCode: 204,
    body: '',
  };
}
