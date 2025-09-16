import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../application/store';
import { CreateTaskData, UpdateTaskData, Task } from '../../core/entities/Task';
import { TaskUseCases } from '../../core/usecases/TaskUseCases';
import { TaskApiService } from '../../infrastructure/services/TaskApiService';
import NetInfo from '@react-native-community/netinfo';

export const useTasks = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id || '';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<any>(null);

  const taskUseCases = useMemo(() => {
    const taskRepository = new TaskApiService();
    return new TaskUseCases(taskRepository);
  }, []);

  const loadTasks = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const fetchedTasks = await taskUseCases.fetchTasks(userId, false);
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Load tasks error:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, taskUseCases]);

  const fetchTasks = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) return [];

    try {
      const fetchedTasks = await taskUseCases.fetchTasks(userId, forceRefresh);
      setTasks(fetchedTasks);
      return fetchedTasks;
    } catch (err) {
      console.error('Fetch tasks error:', err);
      setError(err);
      throw err;
    }
  }, [userId, taskUseCases]);


  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = async (data: CreateTaskData) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const newTask = await taskUseCases.createTask(data, userId);
      setTasks(prev => [...prev, newTask]);
    } catch (err) {
      console.error('Create task error:', err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (id: string, data: UpdateTaskData) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const updatedTask = await taskUseCases.updateTask(id, data, userId);
      setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
    } catch (err) {
      console.error('Update task error:', err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      await taskUseCases.deleteTask(id, userId);
      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (err) {
      console.error('Delete task error:', err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskCompletion = async (id: string, currentIsDone: boolean) => {
    await updateTask(id, { isDone: !currentIsDone });
  };

  const syncPendingOperations = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      await taskUseCases.syncPendingOperations(userId);
      await loadTasks();
    } catch (err) {
      console.error('Sync pending operations error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, taskUseCases, loadTasks]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected === true && state.isInternetReachable === true;
      setIsOnline(online);

      if (online && userId) {
        syncPendingOperations();
      }
    });

    return () => unsubscribe();
  }, [userId, syncPendingOperations]);

  const refetch = () => {
    loadTasks();
  };

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    syncPendingOperations,
    refetch,
    fetchTasks,
  };
};