import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
