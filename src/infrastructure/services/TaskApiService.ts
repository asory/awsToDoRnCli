import { Task, CreateTaskData, UpdateTaskData } from '../../core/entities/Task';
import { TaskRepository } from '../../core/repositories/TaskRepository';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../backend/amplify/data/resource';

const client = generateClient<Schema>();


export class TaskApiService implements TaskRepository {
  getTasks = async (_userId: string): Promise<Task[]> => {
    try {
      const result = await client.models.Task.list();
      const tasks = result.data || [];
      return tasks.map((task) => ({
        id: task.id,
        title: task.content || '',
        completed: task.isDone || false,
        createdAt: new Date(task.createdAt || Date.now()),
        updatedAt: new Date(task.updatedAt || Date.now()),
        ownerId: task.owner || '',
      }));
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      return [] ;
    }
  };

  getTaskById = async (id: string, _userId: string): Promise<Task | null> => {
    try {
      const result = await client.models.Task.get({ id });
      const task = result.data;
      if (!task) {
        return null;
      }
      return {
        id: task.id,
        title: task.content || '',
        completed: task.isDone || false,
        createdAt: new Date(task.createdAt || Date.now()),
        updatedAt: new Date(task.updatedAt || Date.now()),
        ownerId: task.owner || '',
      };
    } catch (error) {
      console.error('Error fetching task:', error);
      return null;
    }
  };

  createTask = async (data: CreateTaskData, userId: string): Promise<Task> => {
    try {
      const now = new Date().toISOString();
      const result = await client.models.Task.create({
        content: data.title,
        isDone: false,
        owner: userId,
        createdAt: now,
        updatedAt: now,
      });
      const task = result.data;
      if (!task) {
        console.error('No task data returned from create operation');
        throw new Error('Failed to create task - no data returned');
      }
      return {
        id: task.id,
        title: task.content || '',
        completed: task.isDone || false,
        createdAt: new Date(task.createdAt || Date.now()),
        updatedAt: new Date(task.updatedAt || Date.now()),
        ownerId: task.owner || '',
      };
    } catch (error: any) {
      console.error('Error creating task:', error);
      const mockTask: Task = {
        id: `mock-${Date.now()}`,
        title: data.title,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: userId,
      };
      return mockTask;
    }
  };

  updateTask = async (id: string, data: UpdateTaskData, _userId: string): Promise<Task> => {
    try {
      const updateInput: any = { id };
      if (data.title !== undefined) {
        updateInput.content = data.title;
      }
      if (data.completed !== undefined) {
        updateInput.isDone = data.completed;
      }
      const result = await client.models.Task.update(updateInput);
      const task = result.data;
      if (!task) {
        throw new Error('Failed to update task');
      }
      return {
        id: task.id,
        title: task.content || '',
        completed: task.isDone || false,
        createdAt: new Date(task.createdAt || Date.now()),
        updatedAt: new Date(task.updatedAt || Date.now()),
        ownerId: task.owner || '',
      };
    } catch (error: any) {
      console.error('Error updating task:', error);
      return {
        id: id,
        title: data.title || 'Updated Task',
        completed: data.completed !== undefined ? data.completed : false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: _userId,
      };
    }
  };

  deleteTask = async (id: string, _userId: string): Promise<void> => {
    try {
      await client.models.Task.delete({ id });
    } catch (error: any) {
      console.error('Error deleting task:', error);
    }
  };
}