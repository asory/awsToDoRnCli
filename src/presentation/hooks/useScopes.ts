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

  const getAllScopes = (): string[] => {
    if (!tokens?.accessToken) return [];
    return ScopeUtils.extractScopesFromToken(tokens.accessToken);
  };

  return {
    hasScope,
    hasWriteScope,
    hasReadScope,
    getAllScopes,
  };
};