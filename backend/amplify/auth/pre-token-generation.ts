import { PreTokenGenerationTriggerHandler } from 'aws-lambda';

const mapGroupsToScopes = (groups: string[]): string[] => {
  const scopes: string[] = [];
  groups.forEach(group => {
    switch (group) {
      case 'users':
        scopes.push('tasks:read');
        break;
      case 'admins':
        scopes.push('tasks:read', 'tasks:write');
        break;
      default:
        scopes.push('tasks:read');
        break;
    }
  });
  return [...new Set(scopes)];
};

export const handler: PreTokenGenerationTriggerHandler = async event => {
  let groups: string[] = [];

  if (event.request.groupConfiguration?.groupsToOverride) {
    groups = event.request.groupConfiguration.groupsToOverride;
  } else if (event.request.userAttributes && event.request.userAttributes['cognito:groups']) {
    const cognitoGroups = event.request.userAttributes['cognito:groups'];
    groups = Array.isArray(cognitoGroups) ? cognitoGroups : [cognitoGroups];
  } else {
    if ((event.request as any).groups) {
      groups = (event.request as any).groups;
    }
  }

  const scopes = mapGroupsToScopes(groups);

  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        'custom:loginTime': new Date().toISOString(),
        'custom:appVersion': '1.0.0',
        'cognito:groups': groups.join(','),
        'custom:groups': JSON.stringify(groups),
        scope: scopes.join(' '),
      },
      claimsToSuppress: [],
    },
  };

  return event;
};
