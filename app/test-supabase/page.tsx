'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function TestSupabase() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    try {
      // Test 1: Check if we can connect
      const { data, error: connError } = await supabase
        .from('tasks')
        .select('count', { count: 'exact', head: true });
      
      if (connError) throw connError;
      
      // Test 2: Try to insert a test task
      const testTask = {
        title: 'Test Task',
        description: 'Testing sync functionality',
        completed: false,
        sync_status: 'pending'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('tasks')
        .insert([testTask])
        .select();
      
      if (insertError) throw insertError;
      
      // Test 3: Clean up - delete test task
      if (insertData && insertData[0]) {
        await supabase
          .from('tasks')
          .delete()
          .eq('id', insertData[0].id);
      }
      
      setResult({
        success: true,
        message: 'Supabase connection successful!',
        data: insertData
      });
    } catch (err: any) {
      setError(err.message);
      console.error('Test failed:', err);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <button
        onClick={testConnection}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Test Connection
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-semibold text-green-800">Success!</h3>
          <p className="text-green-700">{result.message}</p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-semibold text-red-800">Error!</h3>
          <p className="text-red-700">{error}</p>
          <p className="text-sm text-red-600 mt-2">
            Make sure:
            <br />1. Supabase URL and ANON_KEY are correct in .env.local
            <br />2. The 'tasks' table exists in your Supabase database
            <br />3. RLS policies are properly configured
          </p>
        </div>
      )}
    </div>
  );
}