import { MMKV } from 'react-native-mmkv';
import { Task } from '../../core/entities/Task';

interface PendingSyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  task: Task;
  timestamp: number;
  userId: string;
}

export class LocalStorage {
  private static storage = new MMKV({
    id: 'awsToDoRN_local',
    encryptionKey: 'awsToDoRN_encryption_key_v1',
  });

  private static getStorageKey(userId: string, type: string): string {
    return `awsToDoRN_${type}_${userId}`;
  }

  static async saveTasks(userId: string, tasks: Task[]): Promise<void> {
    try {
      const key = LocalStorage.getStorageKey(userId, 'tasks');
      LocalStorage.storage.set(key, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to local storage:', error);
      throw error;
    }
  }

  static async getTasks(userId: string): Promise<Task[]> {
    try {
      const key = LocalStorage.getStorageKey(userId, 'tasks');
      const data = LocalStorage.storage.getString(key);

      if (!data) return [];

      const tasks = JSON.parse(data);
      return tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      }));
    } catch (error) {
      console.error('Error getting tasks from local storage:', error);
      return [];
    }
  }

  static async addPendingSyncOperation(operation: PendingSyncOperation): Promise<void> {
    try {
      const key = LocalStorage.getStorageKey(operation.userId, 'pending_sync');
      const existing = LocalStorage.storage.getString(key);
      const operations: PendingSyncOperation[] = existing ? JSON.parse(existing) : [];

      operations.push(operation);
      LocalStorage.storage.set(key, JSON.stringify(operations));
    } catch (error) {
      console.error('Error adding pending sync operation:', error);
      throw error;
    }
  }

  static async getPendingSyncOperations(userId: string): Promise<PendingSyncOperation[]> {
    try {
      const key = LocalStorage.getStorageKey(userId, 'pending_sync');
      const data = LocalStorage.storage.getString(key);

      if (!data) return [];

      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting pending sync operations:', error);
      return [];
    }
  }

  static async removePendingSyncOperation(userId: string, operationId: string): Promise<void> {
    try {
      const key = LocalStorage.getStorageKey(userId, 'pending_sync');
      const existing = LocalStorage.storage.getString(key);

      if (!existing) return;

      const operations: PendingSyncOperation[] = JSON.parse(existing);
      const filtered = operations.filter(op => op.id !== operationId);

      LocalStorage.storage.set(key, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing pending sync operation:', error);
      throw error;
    }
  }

  static async clearPendingSyncOperations(userId: string): Promise<void> {
    try {
      const key = LocalStorage.getStorageKey(userId, 'pending_sync');
      LocalStorage.storage.delete(key);
    } catch (error) {
      console.error('Error clearing pending sync operations:', error);
      throw error;
    }
  }

  static async saveLastSyncTimestamp(userId: string, timestamp: number): Promise<void> {
    try {
      const key = LocalStorage.getStorageKey(userId, 'last_sync');
      LocalStorage.storage.set(key, timestamp.toString());
    } catch (error) {
      console.error('Error saving last sync timestamp:', error);
      throw error;
    }
  }

  static async getLastSyncTimestamp(userId: string): Promise<number | null> {
    try {
      const key = LocalStorage.getStorageKey(userId, 'last_sync');
      const data = LocalStorage.storage.getString(key);

      return data ? parseInt(data, 10) : null;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  static async clearUserData(userId: string): Promise<void> {
    try {
      const keys = [
        LocalStorage.getStorageKey(userId, 'tasks'),
        LocalStorage.getStorageKey(userId, 'pending_sync'),
        LocalStorage.getStorageKey(userId, 'last_sync'),
      ];

      keys.forEach(key => LocalStorage.storage.delete(key));
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  }

  static async getStorageStats(): Promise<{ size: number; keys: string[] }> {
    try {
      const keys = LocalStorage.storage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = LocalStorage.storage.getString(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return { size: totalSize, keys: [...keys] };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { size: 0, keys: [] };
    }
  }
}