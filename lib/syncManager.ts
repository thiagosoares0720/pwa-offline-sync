import { db, Task } from './db';
import { supabase } from './supabase';

export class SyncManager {
  private isSyncing = false;
  private syncErrors: string[] = [];

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
    this.syncErrors = [];
    
    try {
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to Supabase');
      }

      // Sincronizar tarefas normais pendentes
      const pendingTasks = await db.getPendingTasks();
      
      // Sincronizar tarefas deletadas
      const deletedTasks = await db.getDeletedTasks();
      
      const allPendingTasks = [...pendingTasks, ...deletedTasks];
      
      if (allPendingTasks.length === 0) {
        console.log('No pending tasks to sync');
        return;
      }

      console.log(`Syncing ${allPendingTasks.length} tasks...`, allPendingTasks);

      let syncedCount = 0;
      let failedCount = 0;

      for (const task of allPendingTasks) {
        try {
          console.log(`Syncing task:`, task);
          
          // Se for uma tarefa deletada
          if (task.sync_status === 'deleted') {
            // Deletar do Supabase
            if (task.offline_id) {
              const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.offline_id);

              if (error) throw error;
              
              // Remover completamente do IndexedDB após deletar do servidor
              if (task.id) {
                await db.permanentlyDeleteTask(Number(task.id));
              }
              
              syncedCount++;
              console.log(`Task ${task.id} deleted from server successfully`);
            }
          } 
          // Se for uma tarefa normal (criação/atualização)
          else {
            const taskData = {
              title: task.title,
              description: task.description || '',
              completed: task.completed,
              updated_at: new Date().toISOString(),
            };
            
            let result;
            
            if (task.offline_id) {
              // Atualizar tarefa existente
              const { data, error } = await supabase
                .from('tasks')
                .update(taskData)
                .eq('id', task.offline_id)
                .select();

              if (error && error.code !== 'PGRST116') throw error;
              result = data;
            } else {
              // Inserir nova tarefa
              const { data, error } = await supabase
                .from('tasks')
                .insert([{
                  ...taskData,
                  created_at: task.created_at.toISOString(),
                  sync_status: 'synced'
                }])
                .select();

              if (error) throw error;
              result = data;
              
              // Salvar o ID do servidor no offline_id
              if (result && result[0] && task.id) {
                await db.updateTask(Number(task.id), { 
                  offline_id: result[0].id,
                  sync_status: 'synced'
                });
              }
            }

            if (task.id && task.sync_status !== 'deleted') {
              await db.updateTask(Number(task.id), { 
                sync_status: 'synced',
                updated_at: new Date()
              });
              syncedCount++;
              console.log(`Task ${task.id} synced successfully`);
            }
          }
          
        } catch (error: any) {
          console.error(`Failed to sync task ${task.id}:`, error);
          failedCount++;
          this.syncErrors.push(`Task ${task.title}: ${error.message}`);
          
          if (task.id && task.sync_status !== 'deleted') {
            await db.updateTask(Number(task.id), { 
              sync_status: 'failed',
              updated_at: new Date()
            });
          }
        }
      }

      console.log(`Sync completed: ${syncedCount} synced, ${failedCount} failed`);
      
      if (failedCount > 0) {
        this.showSyncNotification(`Sync completed with ${failedCount} errors. Check console for details.`);
      } else if (syncedCount > 0) {
        this.showSyncNotification(`${syncedCount} tasks synced successfully!`);
      }
      
    } catch (error: any) {
      console.error('Sync failed:', error);
      this.showSyncNotification(`Sync failed: ${error.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .select('count', { count: 'exact', head: true });
      
      if (error && error.message.includes('relation')) {
        console.warn('Table may not exist, but connection works');
        return true;
      }
      
      return !error;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }

  async fetchRemoteTasks() {
    if (!navigator.onLine) {
      console.log('Offline: Cannot fetch remote tasks');
      return [];
    }

    try {
      console.log('Fetching remote tasks from Supabase...');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log(`Fetched ${data.length} remote tasks`);
        
        const localTasks = await db.getAllTasks();
        
        for (const remoteTask of data) {
          const exists = localTasks.some(t => t.offline_id === remoteTask.id);
          
          if (!exists) {
            await db.addTask({
              title: remoteTask.title,
              description: remoteTask.description || '',
              completed: remoteTask.completed,
              sync_status: 'synced',
              created_at: new Date(remoteTask.created_at),
              updated_at: new Date(remoteTask.updated_at),
              offline_id: remoteTask.id
            });
            console.log(`Added remote task: ${remoteTask.title}`);
          }
        }
      } else {
        console.log('No remote tasks found');
      }
      
      return data || [];
    } catch (error: any) {
      console.error('Failed to fetch remote tasks:', error);
      this.showSyncNotification(`Failed to fetch remote tasks: ${error.message}`);
      return [];
    }
  }

  async forceResyncFailedTasks() {
    const failedTasks = await db.tasks.where('sync_status').equals('failed').toArray();
    
    if (failedTasks.length === 0) {
      console.log('No failed tasks to resync');
      return;
    }
    
    console.log(`Resyncing ${failedTasks.length} failed tasks...`);
    
    for (const task of failedTasks) {
      if (task.id) {
        await db.updateTask(Number(task.id), { sync_status: 'pending' });
      }
    }
    
    await this.syncTasks();
  }

  private showSyncNotification(message: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Sync Status', { body: message });
    }
    
    window.dispatchEvent(new CustomEvent('sync-status', { detail: { message } }));
  }

  startAutoSync(intervalMinutes: number = 5) {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    setTimeout(() => {
      this.syncTasks();
      this.fetchRemoteTasks();
    }, 1000);

    const interval = setInterval(() => {
      if (navigator.onLine) {
        console.log('Running periodic sync...');
        this.syncTasks();
        this.fetchRemoteTasks();
      }
    }, intervalMinutes * 60 * 1000);

    window.addEventListener('online', () => {
      console.log('Back online - syncing...');
      this.syncTasks();
      this.fetchRemoteTasks();
    });

    return () => clearInterval(interval);
  }
}

export const syncManager = new SyncManager();