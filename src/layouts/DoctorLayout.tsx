import { doctorNavigation } from '@/config/navigation';
import { PanelLayout } from './PanelLayout';

export function DoctorLayout() {
  return <PanelLayout navigation={doctorNavigation} basePath="/medico" panelLabel="Panel Médico" unreadNotifications={2} />;
}
