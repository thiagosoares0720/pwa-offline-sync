import Dexie, { Table } from 'dexie';

export interface Task {
  id?: string;
  title: string;
  description: string;
  completed: boolean;
  sync_status: 'pending' | 'synced' | 'failed' | 'deleted';
  created_at: Date;
  updated_at: Date;
  offline_id?: string;
  deleted_at?: Date; // Adicionar campo para rastrear exclusão
}

export class OfflineDB extends Dexie {
  tasks!: Table<Task>;

  constructor() {
    super('OfflineTaskDB');
    this.version(2).stores({
      tasks: '++id, sync_status, created_at, updated_at, deleted_at'
    }).upgrade(tx => {
      // Adicionar índice deleted_at durante upgrade
      return tx.table('tasks').toCollection().modify(task => {
        if (!task.deleted_at) {
          task.deleted_at = undefined;
        }
      });
    });
  }

  async addTask(task: Omit<Task, 'id'>) {
    return await this.tasks.add(task);
  }

  async getPendingTasks() {
    return await this.tasks.where('sync_status').equals('pending').toArray();
  }

  async getDeletedTasks() {
    return await this.tasks.where('sync_status').equals('deleted').toArray();
  }

  async updateTask(id: number, updates: Partial<Task>) {
    return await this.tasks.update(id, updates);
  }

  async deleteTask(id: number) {
    // Marcar como deletado em vez de remover completamente
    await this.tasks.update(id, { 
      sync_status: 'deleted',
      deleted_at: new Date()
    });
  }

  async permanentlyDeleteTask(id: number) {
    return await this.tasks.delete(id);
  }

  async getAllTasks() {
    // Não mostrar tarefas marcadas como deletadas
    return await this.tasks.where('sync_status').notEqual('deleted').toArray();
  }

  async clearSyncedTasks() {
    return await this.tasks.where('sync_status').equals('synced').delete();
  }
}

export const db = new OfflineDB();