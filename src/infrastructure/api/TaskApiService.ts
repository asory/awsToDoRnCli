import { Task, CreateTaskData, UpdateTaskData } from '../../core/entities/Task';
import { TaskRepository } from '../../core/repositories/TaskRepository';
import { ApiClient } from './ApiClient';

export class TaskApiService implements TaskRepository {
  constructor(private apiClient: ApiClient = new ApiClient()) {}

  async getTasks(userId: string): Promise<Task[]> {
    try {
      const tasks = await this.apiClient.get<Task[]>(`/tasks?userId=${userId}`);
      return tasks.map(task => ({
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      }));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  async getTaskById(id: string, userId: string): Promise<Task | null> {
    try {
      const task = await this.apiClient.get<Task>(`/tasks/${id}?userId=${userId}`);
      return {
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      };
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  }

  async createTask(data: CreateTaskData, userId: string): Promise<Task> {
    try {
      const task = await this.apiClient.post<Task>('/tasks', { ...data, userId });
      return {
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  async updateTask(id: string, data: UpdateTaskData, userId: string): Promise<Task> {
    try {
      const task = await this.apiClient.put<Task>(`/tasks/${id}`, { ...data, userId });
      return {
        ...task,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      };
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  async deleteTask(id: string, userId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/tasks/${id}?userId=${userId}`);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }
}