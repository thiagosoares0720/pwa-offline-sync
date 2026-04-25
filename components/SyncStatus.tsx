import { useState, useEffect } from 'react';
import { syncManager } from '@/lib/syncManager';

export default function SyncStatus() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string>('');
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    checkPendingTasks();
    
    // Listen for sync status updates
    const handleSyncStatus = (e: any) => {
      setLastSyncMessage(e.detail.message);
      setTimeout(() => setLastSyncMessage(''), 5000);
      checkPendingTasks();
    };
    
    window.addEventListener('sync-status', handleSyncStatus);
    
    // Check pending tasks periodically
    const interval = setInterval(checkPendingTasks, 5000);
    
    return () => {
      window.removeEventListener('sync-status', handleSyncStatus);
      clearInterval(interval);
    };
  }, []);

  const checkPendingTasks = async () => {
    const { db } = await import('@/lib/db');
    const pending = await db.getPendingTasks();
    const failed = await db.tasks.where('sync_status').equals('failed').toArray();
    setPendingCount(pending.length);
    setFailedCount(failed.length);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncManager.syncTasks();
    await syncManager.fetchRemoteTasks();
    setIsSyncing(false);
    await checkPendingTasks();
  };

  const handleResyncFailed = async () => {
    setIsSyncing(true);
    await syncManager.forceResyncFailedTasks();
    setIsSyncing(false);
    await checkPendingTasks();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 min-w-[250px] border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Sync Status</h3>
          {isSyncing && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          )}
        </div>
        
        {lastSyncMessage && (
          <div className="mb-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
            {lastSyncMessage}
          </div>
        )}
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Pending sync:</span>
            <span className="font-semibold text-yellow-600">{pendingCount}</span>
          </div>
          {failedCount > 0 && (
            <div className="flex justify-between">
              <span>Failed:</span>
              <span className="font-semibold text-red-600">{failedCount}</span>
            </div>
          )}
        </div>
        
        <div className="mt-3 space-y-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full bg-blue-500 text-white text-xs py-1.5 rounded hover:bg-blue-600 transition disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          
          {failedCount > 0 && (
            <button
              onClick={handleResyncFailed}
              disabled={isSyncing}
              className="w-full bg-red-500 text-white text-xs py-1.5 rounded hover:bg-red-600 transition"
            >
              Retry Failed ({failedCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}