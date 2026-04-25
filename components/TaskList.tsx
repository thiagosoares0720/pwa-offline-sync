import { Task } from '@/lib/db';

interface TaskListProps {
  tasks: Task[];
  onToggle: (task: Task) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}

export default function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No tasks yet. Add your first task above!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggle(task)}
              className="mt-1 w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <h3 className={`font-medium ${task.completed ? 'line-through text-gray-400' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                  {task.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  task.sync_status === 'synced' 
                    ? 'bg-green-100 text-green-700'
                    : task.sync_status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {task.sync_status === 'synced' ? '☁️ Synced' : 
                   task.sync_status === 'failed' ? '⚠️ Sync failed' : 
                   '🔄 Pending sync'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => onDelete(task)}
              className="text-red-500 hover:text-red-700 transition"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}