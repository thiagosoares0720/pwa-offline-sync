import { db, Task } from './db';
import { supabase } from './supabase';

export class SyncManager {
  private isSyncing = false;

  async syncTasks() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Offline: Skipping sync');
      return;
    }

    this.isSyncing = true;
    
    try {
      // Get pending tasks from IndexedDB
      const pendingTasks = await db.getPendingTasks();
      
      if (pendingTasks.length === 0) {
        console.log('No pending tasks to sync');
        return;
      }

      console.log(`Syncing ${pendingTasks.length} tasks...`);

      // Sync each pending task
      for (const task of pendingTasks) {
        try {
          // Prepare data for Supabase
          const taskData = {
            title: task.title,
            description: task.description,
            completed: task.completed,
            created_at: task.created_at,
            updated_at: new Date(),
            sync_status: 'synced'
          };

          // Insert or update in Supabase
          if (task.id) {
            const { error } = await supabase
              .from('tasks')
              .update(taskData)
              .eq('id', task.id);

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('tasks')
              .insert([taskData]);

            if (error) throw error;
          }

          // Update local task as synced
          if (task.id) {
            await db.updateTask(Number(task.id), { 
              sync_status: 'synced',
              updated_at: new Date()
            });
          }
          
        } catch (error) {
          console.error(`Failed to sync task ${task.id}:`, error);
          if (task.id) {
            await db.updateTask(Number(task.id), { sync_status: 'failed' });
          }
        }
      }

      // Clean up synced tasks (optional)
      await db.clearSyncedTasks();
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async fetchRemoteTasks() {
    if (!navigator.onLine) return [];

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Store remote tasks in IndexedDB
        for (const task of data) {
          await db.addTask({
            title: task.title,
            description: task.description || '',
            completed: task.completed,
            sync_status: 'synced',
            created_at: new Date(task.created_at),
            updated_at: new Date(task.updated_at),
            offline_id: task.id
          });
        }
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch remote tasks:', error);
      return [];
    }
  }

  startAutoSync(intervalMinutes: number = 5) {
    // Sync immediately
    this.syncTasks();
    this.fetchRemoteTasks();

    // Set up periodic sync
    const interval = setInterval(() => {
      if (navigator.onLine) {
        this.syncTasks();
        this.fetchRemoteTasks();
      }
    }, intervalMinutes * 60 * 1000);

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Back online - syncing...');
      this.syncTasks();
      this.fetchRemoteTasks();
    });

    return () => clearInterval(interval);
  }
}

export const syncManager = new SyncManager();