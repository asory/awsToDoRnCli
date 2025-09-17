import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTasks } from '../../hooks/useTasks';
import { useScopes } from '../../hooks/useScopes';
import { Task } from '../../../core/entities/Task';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LocalStorage } from '../../../infrastructure/storage/LocalStorage';
import { useSelector } from 'react-redux';
import { RootState } from '../../../application/store';

export const TasksScreen: React.FC = () => {
  const {
    tasks,
    isLoading,
    error,
    refetch,
    toggleTaskCompletion,
    createTask,
    fetchTasks,
  } = useTasks();

  const { hasWriteScope } = useScopes();

  const [inputText, setInputText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id || '';

  useEffect(() => {
    const loadLastUpdate = async () => {
      if (userId) {
        try {
          const lastSyncTimestamp = await LocalStorage.getLastSyncTimestamp(
            userId,
          );
          if (lastSyncTimestamp) {
            setLastUpdate(new Date(lastSyncTimestamp));
          }
        } catch (e) {
          console.error('Error loading last sync timestamp:', e);
        }
      }
    };

    loadLastUpdate();
  }, [userId]);

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskItem}>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, item.isDone && styles.taskCompleted]}>
          {item.content}
        </Text>
        <Text style={styles.taskDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => {
            toggleTaskCompletion(item.id, item.isDone);
          }}
        >
          <View
            style={[
              styles.checkboxInner,
              item.isDone && styles.checkboxChecked,
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading tasks...</Text>
      </View>
    );
  }

  if (error) {
    console.log('TasksScreen: error details', error);
    const is403 =
      (error as any)?.status === 403 ||
      (error as any)?.data?.message?.includes('403');
    if (is403) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>No autorizado</Text>
          <Text style={styles.errorSubtext}>
            No tienes permisos para ver las tareas
          </Text>
          <Button title="Reintentar" onPress={refetch} />
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error loading tasks</Text>
        <Button title="Retry" onPress={refetch} />
      </View>
    );
  }

  const handleAddTask = async () => {
    if (inputText.trim()) {
      try {
        await createTask({ content: inputText.trim() });
        setInputText('');
      } catch (e) {
        Alert.alert('Error', 'Failed to create task');
      }
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;

    setRefreshing(true);
    try {
      await fetchTasks(true);

      const lastSyncTimestamp = await LocalStorage.getLastSyncTimestamp(userId);
      if (lastSyncTimestamp) {
        setLastUpdate(new Date(lastSyncTimestamp));
      }
    } catch (e) {
      console.error('❌ Pull-to-refresh failed:', e);
      Alert.alert('Error', 'Failed to refresh tasks. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Tasks</Text>
        {hasWriteScope() && (
          <View style={styles.inputContainer}>
            <View style={styles.input}>
              <Input
                value={inputText}
                onChangeText={setInputText}
                placeholder="Enter task title"
                maxLength={100}
              />
            </View>
            <View style={styles.addButton}>
              <Button
                title="Add Task"
                onPress={handleAddTask}
                disabled={!inputText.trim()}
              />
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
            title="Refreshing tasks..."
            titleColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>
              {hasWriteScope()
                ? 'Create your first task!'
                : 'Ask your admin to add tasks'}
            </Text>
          </View>
        }
        contentContainerStyle={tasks.length === 0 && styles.emptyContainer}
      />

      {lastUpdate && (
        <View style={styles.lastUpdateContainer}>
          <Text style={styles.lastUpdateText}>
            Last updated: {lastUpdate.toLocaleString()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    marginBottom: 0,
  },
  addButton: {
    marginVertical: 0,
    minHeight: 48,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  taskDate: {
    fontSize: 12,
    color: '#999',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 10,
  },
  errorSubtext: {
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  lastUpdateContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
