import { Task, CreateTaskData, UpdateTaskData } from '../entities/Task';

export interface TaskRepository {
  getTasks(ownerId: string): Promise<Task[]>;
  getTaskById(id: string, ownerId: string): Promise<Task | null>;
  createTask(data: CreateTaskData, ownerId: string): Promise<Task>;
  updateTask(id: string, data: UpdateTaskData, ownerId: string): Promise<Task>;
  deleteTask(id: string, ownerId: string): Promise<void>;
}
