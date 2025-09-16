import { Task, CreateTaskData, UpdateTaskData } from '../entities/Task';
import { TaskRepository } from '../repositories/TaskRepository';

export class TaskUseCases {
  constructor(private taskRepository: TaskRepository) {}

  async createTask(data: CreateTaskData, ownerId: string): Promise<Task> {
    return this.taskRepository.createTask(data, ownerId);
  }

  async deleteTask(id: string, ownerId: string): Promise<void> {
    return this.taskRepository.deleteTask(id, ownerId);
  }

  async getTasks(ownerId: string): Promise<Task[]> {
    return this.taskRepository.getTasks(ownerId);
  }

  async fetchTasks(ownerId: string, forceRefresh: boolean = false): Promise<Task[]> {
    return this.taskRepository.fetchTasks(ownerId, forceRefresh);
  }

  async updateTask(
    id: string,
    data: UpdateTaskData,
    ownerId: string,
  ): Promise<Task> {
    return this.taskRepository.updateTask(id, data, ownerId);
  }

  async syncPendingOperations(userId: string): Promise<void> {
    return this.taskRepository.syncPendingOperations(userId);
  }

  async clearUserData(userId: string): Promise<void> {
    return this.taskRepository.clearUserData(userId);
  }
}
