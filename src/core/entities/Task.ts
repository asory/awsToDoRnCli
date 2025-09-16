export interface Task {
  id: string;
  content: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
  owner: string;
}

export interface CreateTaskData {
  content: string;
}

export interface UpdateTaskData {
  content?: string;
  isDone?: boolean;
}
