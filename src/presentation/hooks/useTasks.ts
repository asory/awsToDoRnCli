import { useSelector } from 'react-redux';
import { useGetTasksQuery, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } from '../../application/slices/tasksApi';
import { RootState } from '../../application/store';
import { CreateTaskData, UpdateTaskData } from '../../core/entities/Task';

export const useTasks = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id || '';

  const {
    data: tasks,
    isLoading,
    error,
    refetch,
  } = useGetTasksQuery(userId, {
    skip: !userId,
  });

  const [createTaskMutation, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTaskMutation, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [deleteTaskMutation, { isLoading: isDeleting }] = useDeleteTaskMutation();

  const createTask = async (data: CreateTaskData) => {
    if (!userId) return;

    try {
      await createTaskMutation({ data, userId }).unwrap();
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Create task error:', error);
      throw error;
    }
  };

  const updateTask = async (id: string, data: UpdateTaskData) => {
    if (!userId) return;

    try {
      await updateTaskMutation({ id, data, userId }).unwrap();
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Update task error:', error);
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    if (!userId) return;

    try {
      await deleteTaskMutation({ id, userId }).unwrap();
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Delete task error:', error);
      throw error;
    }
  };

  const toggleTaskCompletion = async (id: string, currentCompleted: boolean) => {
    await updateTask(id, { completed: !currentCompleted });
  };

  return {
    tasks: tasks || [],
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    refetch,
  };
};