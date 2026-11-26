import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin/AdminPanel';

export const metadata: Metadata = { title: 'Admin — ADApolis', robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AdminPanel />
      </div>
    </div>
  );
}
