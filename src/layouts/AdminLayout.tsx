import { adminNavigation } from '@/config/navigation';
import { PanelLayout } from './PanelLayout';

export function AdminLayout() {
  return <PanelLayout navigation={adminNavigation} basePath="/admin" panelLabel="Panel Administrativo" unreadNotifications={4} />;
}
