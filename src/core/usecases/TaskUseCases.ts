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

  async updateTask(
    id: string,
    data: UpdateTaskData,
    ownerId: string,
  ): Promise<Task> {
    return this.taskRepository.updateTask(id, data, ownerId);
  }
}
