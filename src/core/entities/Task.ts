export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface CreateTaskData {
  title: string;
}

export interface UpdateTaskData {
  title?: string;
  completed?: boolean;
}
