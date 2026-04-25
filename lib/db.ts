import Dexie, { Table } from 'dexie';

export interface Task {
  id?: string;
  title: string;
  description: string;
  completed: boolean;
  sync_status: 'pending' | 'synced' | 'failed';
  created_at: Date;
  updated_at: Date;
  offline_id?: string;
}

export class OfflineDB extends Dexie {
  tasks!: Table<Task>;

  constructor() {
    super('OfflineTaskDB');
    this.version(1).stores({
      tasks: '++id, sync_status, created_at, updated_at'
    });
  }

  async addTask(task: Omit<Task, 'id'>) {
    return await this.tasks.add(task);
  }

  async getPendingTasks() {
    return await this.tasks.where('sync_status').equals('pending').toArray();
  }

  async updateTask(id: number, updates: Partial<Task>) {
    return await this.tasks.update(id, updates);
  }

  async deleteTask(id: number) {
    return await this.tasks.delete(id);
  }

  async getAllTasks() {
    return await this.tasks.toArray();
  }

  async clearSyncedTasks() {
    return await this.tasks.where('sync_status').equals('synced').delete();
  }
}

export const db = new OfflineDB();