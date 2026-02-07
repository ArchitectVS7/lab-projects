import { useSocketStore } from '../store/socket';

export default function ConnectionStatus() {
  const connected = useSocketStore((s) => s.connected);

  return (
    <div className="flex items-center gap-2 px-1">
      <div
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={connected ? 'Connected' : 'Disconnected'}
      />
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
