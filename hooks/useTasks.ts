import { useEffect, useState } from 'react';
import { db, Task } from '@/lib/db';
import { syncManager } from '@/lib/syncManager';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    loadTasks();

    const handleOnline = () => {
      setIsOnline(true);
      syncManager.syncTasks();
      loadTasks();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

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
    
    // Marcar como deletado em vez de remover imediatamente
    await db.deleteTask(Number(task.id));
    await loadTasks();
    
    // Se estiver online, tenta sincronizar a exclusão imediatamente
    if (isOnline) {
      await syncManager.syncTasks();
      await loadTasks();
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