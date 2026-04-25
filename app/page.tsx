'use client';

import { useTasks } from '@/hooks/useTasks';
import TaskForm from '@/components/TaskForm';
import TaskList from '@/components/TaskList';
import NetworkStatus from '@/components/NetworkStatus';

export default function Home() {
  const {
    tasks,
    loading,
    isOnline,
    addTask,
    toggleTask,
    deleteTask
  } = useTasks();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NetworkStatus isOnline={isOnline} />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Offline Task Manager
          </h1>
          <p className="text-gray-600">
            Works offline • Auto-syncs when back online
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
          <TaskForm onAddTask={addTask} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Tasks</h2>
            <span className="text-sm text-gray-500">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        </div>

        {!isOnline && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              You are offline. Changes will be saved locally and synced when you're back online.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}