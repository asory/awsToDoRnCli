import { Task, CreateTaskData, UpdateTaskData } from '../../core/entities/Task';
import { TaskRepository } from '../../core/repositories/TaskRepository';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../backend/amplify/data/resource';
import { LocalStorage } from '../storage/LocalStorage';
import { SecureStorage } from '../storage/SecureStorage';
import { isOnline } from '../../shared/utils/deviceUtils';

const client = generateClient<Schema>();

export class TaskApiService implements TaskRepository {
  private transformTaskData = (taskData: any): Task => ({
    id: taskData.id,
    content: taskData.content || '',
    isDone: taskData.isDone ?? false,
    createdAt: taskData.createdAt || new Date().toISOString(),
    updatedAt: taskData.updatedAt || new Date().toISOString(),
    owner: taskData.owner || '',
  });

  private async updateLocalTasks(userId: string, taskId: string, updatedTask: Task): Promise<void> {
    const allTasks = await LocalStorage.getTasks(userId);
    const updatedTasks = allTasks.map(t => t.id === taskId ? updatedTask : t);
    await LocalStorage.saveTasks(userId, updatedTasks);
  }

  private async updateTaskOffline(id: string, data: UpdateTaskData, userId: string): Promise<Task> {
    const allTasks = await LocalStorage.getTasks(userId);
    const taskToUpdate = allTasks.find(t => t.id === id);

    if (!taskToUpdate) {
      throw new Error('Task not found in local storage');
    }
 
    const updatedTask: Task = {
      ...taskToUpdate,
      content: data.content !== undefined ? data.content : taskToUpdate.content,
      isDone: data.isDone !== undefined ? data.isDone : taskToUpdate.isDone,
      updatedAt: new Date().toISOString(),
    };

    await this.updateLocalTasks(userId, id, updatedTask);

    await LocalStorage.addPendingSyncOperation({
      id: `update_${id}_${Date.now()}`,
      type: 'update',
      task: updatedTask,
      timestamp: Date.now(),
      userId,
    });

    return updatedTask;
  }


  fetchTasks = async (userId: string, forceRefresh: boolean = false): Promise<Task[]> => {
    try {
      const online = await isOnline();

      if (online || forceRefresh) {
        const result = await client.models.Task.list();
        const tasks = result.data || [];
        const transformedTasks = tasks.map(this.transformTaskData);
         
        await LocalStorage.saveTasks(userId, transformedTasks);
        await LocalStorage.saveLastSyncTimestamp(userId, Date.now());
        return transformedTasks;
      } else {
        return await LocalStorage.getTasks(userId);
      }
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      return await LocalStorage.getTasks(userId);
    }
  };

  getTasks = async (userId: string): Promise<Task[]> => {
    return this.fetchTasks(userId, false);
  };

  createTask = async (data: CreateTaskData, userId: string): Promise<Task> => {
    let taskToSave: Task;

    try {
      const result = await client.models.Task.create({
        content: data.content,
        isDone: false,
        owner: userId,
      });

      const task = result.data;
      if (!task) {
        throw new Error('Failed to create task - no data returned');
      }

      taskToSave = this.transformTaskData(task);
    } catch (error: any) {
      console.error('Error creating task:', error);

      taskToSave = {
        id: `mock-${Date.now()}`,
        content: data.content,
        isDone: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: userId,
      };
    }

    const allTasks = await LocalStorage.getTasks(userId);
    await LocalStorage.saveTasks(userId, [...allTasks, taskToSave]);
    return taskToSave;
  };

  updateTask = async (id: string, data: UpdateTaskData, userId: string): Promise<Task> => {
    try {
      const online = await isOnline();

      if (online) {
        const updateInput: any = { id };
        if (data.content !== undefined) {
          updateInput.content = data.content;
        }
        if (data.isDone !== undefined) {
          updateInput.isDone = data.isDone;
        }

        const result = await client.models.Task.update(updateInput);
        const task = result.data;
        if (!task) {
          throw new Error('Failed to update task');
        }

        const updatedTask = this.transformTaskData(task);
        await this.updateLocalTasks(userId, id, updatedTask);
        return updatedTask;
      }
    } catch (error: any) {
      console.error('Error updating task:', error);
    }

    try {
      return this.updateTaskOffline(id, data, userId);
    } catch (localError) {
      console.error('Local storage update failed:', localError);
      return {
        id: id,
        content: data.content || 'Updated Task',
        isDone: data.isDone !== undefined ? data.isDone : false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        owner: userId,
      };
    }
  };

  deleteTask = async (id: string, userId: string): Promise<void> => {
    const allTasks = await LocalStorage.getTasks(userId);
    let serverDeleteSuccess = false;

    try {
      const online = await isOnline();

      if (online) {
        await client.models.Task.delete({ id });
        serverDeleteSuccess = true;
      } else {
        const taskToDelete = allTasks.find(t => t.id === id);

        if (taskToDelete) {
          await LocalStorage.addPendingSyncOperation({
            id: `delete_${id}_${Date.now()}`,
            type: 'delete',
            task: taskToDelete,
            timestamp: Date.now(),
            userId,
          });
          serverDeleteSuccess = true; // For offline, consider it success for local removal
        }
      }
    } catch (error: any) {
      console.error('Error deleting task on server:', error);
      console.error('Error details:', error.message, error.errors);
      serverDeleteSuccess = false;
    }

    if (serverDeleteSuccess) {
      try {
        const filteredTasks = allTasks.filter(t => t.id !== id);
        await LocalStorage.saveTasks(userId, filteredTasks);
      } catch (localError) {
        console.error('Local storage delete failed:', localError);
      }
    } else {
      // If server delete failed, don't remove locally to avoid data loss
      console.warn('Server delete failed, keeping task locally');
    }
  };

  private async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStorage.getToken('access');
      if (!token) return false;

      return await SecureStorage.validateToken(token);
    } catch (error) {
      console.error('Authentication check failed:', error);
      return false;
    }
  }

  syncPendingOperations = async (userId: string): Promise<void> => {
    try {
      const online = await isOnline();
      if (!online) {
        return;
      }

      const authenticated = await this.isAuthenticated();
      if (!authenticated) {
        return;
      }

      const pendingOperations = await LocalStorage.getPendingSyncOperations(userId);
      if (pendingOperations.length === 0) {
        return;
      }


      const sortedOperations = pendingOperations.sort((a, b) => a.timestamp - b.timestamp);

      for (const operation of sortedOperations) {
        try {
          switch (operation.type) {
            case 'create':
              const existingTask = await client.models.Task.get({ id: operation.task.id }).catch(() => null);
              if (existingTask?.data) {
                console.log(`Task ${operation.task.id} already exists, skipping create`);
              } else {
                await client.models.Task.create({
                  content: operation.task.content,
                  isDone: operation.task.isDone,
                  owner: operation.userId,
                });
                console.log(`Created task: ${operation.task.id}`);
              }
              break;

            case 'update':
              try {
                const updateInput: any = { id: operation.task.id };
                if (operation.task.content !== undefined) {
                  updateInput.content = operation.task.content;
                }
                updateInput.isDone = operation.task.isDone;
                await client.models.Task.update(updateInput);
                console.log(`Updated task: ${operation.task.id}`);
              } catch (updateError: any) {
                if (updateError.message?.includes('not found')) {
                  console.log(`Task ${operation.task.id} not found, skipping update`);
                } else {
                  throw updateError;
                }
              }
              break;

            case 'delete':
              try {
                await client.models.Task.delete({ id: operation.task.id });
              } catch (deleteError: any) {
                if (deleteError.message?.includes('not found')) {
                } else {
                  throw deleteError;
                }
              }
              break;
          }

          await LocalStorage.removePendingSyncOperation(userId, operation.id);
        } catch (syncError: any) {
          console.error(`Failed to sync operation ${operation.id}:`, syncError);

          if (syncError.message?.includes('Unauthorized') ||
              syncError.message?.includes('Forbidden')) {
            console.error('Authentication error during sync, stopping sync process');
            break;
          }
        }
      }

      await LocalStorage.saveLastSyncTimestamp(userId, Date.now());
    } catch (error: any) {
      console.error('Error during sync:', error);
    }
  };

  clearUserData = async (userId: string): Promise<void> => {
    try {
      await LocalStorage.clearUserData(userId);
      console.log(`Cleared local data for user: ${userId}`);
    } catch (error: any) {
      console.error('Error clearing user data:', error);
    }
  };

  getTasksFromBackend = async (_userId: string): Promise<Task[]> => {
    try {
      const result = await client.models.Task.list();
      return (result.data || []).map(this.transformTaskData);
    } catch (error: any) {
      console.error('Error fetching tasks from backend:', error);
      throw new Error('Failed to fetch tasks from backend');
    }
  };
}