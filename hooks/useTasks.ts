import { useEffect, useState } from 'react';
import { db, Task } from '@/lib/db';
import { syncManager } from '@/lib/syncManager';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // Load tasks from IndexedDB
    loadTasks();

    // Set up online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      syncManager.syncTasks();
      loadTasks();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start auto-sync
    const cleanup = syncManager.startAutoSync(2);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanup();
    };
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const allTasks = await db.getAllTasks();
    setTasks(allTasks.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    setLoading(false);
  };

  const addTask = async (title: string, description: string) => {
    const newTask: Omit<Task, 'id'> = {
      title,
      description,
      completed: false,
      sync_status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.addTask(newTask);
    await loadTasks();
    
    // Try to sync immediately if online
    if (isOnline) {
      await syncManager.syncTasks();
      await loadTasks();
    }
  };

  const toggleTask = async (task: Task) => {
    if (!task.id) return;
    
    await db.updateTask(Number(task.id), {
      completed: !task.completed,
      sync_status: 'pending',
      updated_at: new Date()
    });
    
    await loadTasks();
    
    if (isOnline) {
      await syncManager.syncTasks();
      await loadTasks();
    }
  };

  const deleteTask = async (task: Task) => {
    if (!task.id) return;
    
    await db.deleteTask(Number(task.id));
    await loadTasks();
    
    if (isOnline) {
      await syncManager.syncTasks();
    }
  };

  return {
    tasks,
    loading,
    isOnline,
    addTask,
    toggleTask,
    deleteTask,
    refreshTasks: loadTasks
  };
}