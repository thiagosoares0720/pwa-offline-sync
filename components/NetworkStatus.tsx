import { Wifi, WifiOff } from 'lucide-react';

interface NetworkStatusProps {
  isOnline: boolean;
}

export default function NetworkStatus({ isOnline }: NetworkStatusProps) {
  return (
    <div className={`fixed top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg ${
      isOnline ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline</span>
        </>
      )}
    </div>
  );
}