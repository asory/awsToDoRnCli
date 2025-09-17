import { useSelector } from 'react-redux';
import { RootState } from '../../application/store';
import { ScopeUtils } from '../../shared/utils/ScopeUtils';

export const useScopes = () => {
  const tokens = useSelector((state: RootState) => state.auth.tokens);

  const hasScope = (scope: string): boolean => {
    if (!tokens?.accessToken) return false;
    const scopes = ScopeUtils.extractScopesFromToken(tokens.accessToken);
    return scopes.includes(scope);
  };

  const hasWriteScope = (): boolean => {
    return hasScope('tasks:write');
  };

  const hasReadScope = (): boolean => {
    return hasScope('tasks:read');
  };

  const hasAdminScope = (): boolean => {
    const groups = getUserGroups();
    return groups.some(group => group.trim() === 'admins');
  };

  const getUserGroups = (): string[] => {
    if (!tokens?.accessToken) return [];
    
    try {
      const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]));
      const groups: string[] = [];
      
      if (payload['cognito:groups']) {
        if (Array.isArray(payload['cognito:groups'])) {
          groups.push(...payload['cognito:groups']);
        } else if (typeof payload['cognito:groups'] === 'string') {
          groups.push(...payload['cognito:groups'].split(','));
        }
      }
      
      return groups.map(group => group.trim());
    } catch (error) {
      return [];
    }
  };

  const getAllScopes = (): string[] => {
    if (!tokens?.accessToken) return [];
    return ScopeUtils.extractScopesFromToken(tokens.accessToken);
  };

  return {
    hasScope,
    hasWriteScope,
    hasReadScope,
    hasAdminScope,
    getAllScopes,
    getUserGroups,
  };
};