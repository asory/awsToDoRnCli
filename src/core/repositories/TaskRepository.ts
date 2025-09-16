import { Task, CreateTaskData, UpdateTaskData } from '../entities/Task';

export interface TaskRepository {
  getTasks(ownerId: string): Promise<Task[]>;
  fetchTasks(ownerId: string, forceRefresh?: boolean): Promise<Task[]>;
  createTask(data: CreateTaskData, ownerId: string): Promise<Task>;
  updateTask(id: string, data: UpdateTaskData, ownerId: string): Promise<Task>;
  deleteTask(id: string, ownerId: string): Promise<void>;
  syncPendingOperations(userId: string): Promise<void>;
  clearUserData(userId: string): Promise<void>;
}
