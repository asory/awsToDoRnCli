import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTasks } from '../../hooks/useTasks';
import { useScopes } from '../../hooks/useScopes';
import { Task } from '../../../core/entities/Task';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';

export const TasksScreen: React.FC = () => {
  const { tasks, isLoading, error, refetch, toggleTaskCompletion, createTask } =
    useTasks();
  const { hasWriteScope } = useScopes();
  const [inputText, setInputText] = useState('');
  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskItem}>
      <View style={styles.taskContent}>
        <Text
          style={[styles.taskTitle, item.completed && styles.taskCompleted]}
        >
          {item.title}
        </Text>
        <Text style={styles.taskDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => {
            toggleTaskCompletion(item.id, item.completed);
          }}
        >
          <View
            style={[
              styles.checkboxInner,
              item.completed && styles.checkboxChecked,
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
        await createTask({ title: inputText.trim() });
        setInputText('');
      } catch (e) {
        Alert.alert('Error', 'Failed to create task');
      }
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
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
    marginVertical: 5,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
});
