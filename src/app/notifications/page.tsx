import type { Metadata } from 'next';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

export const metadata: Metadata = { title: 'Notifications — ADApolis', robots: { index: false } };

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-brand-navy px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <NotificationSettings />
      </div>
    </div>
  );
}
