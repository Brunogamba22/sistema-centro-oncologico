import { useEffect, useState } from 'react';
import { doctorNavigation } from '@/config/navigation';
import { useAuth } from '@/context/auth/useAuth';
import { doctorPortalService } from '@/services';
import { PanelLayout } from './PanelLayout';

export function DoctorLayout() {
  const { user } = useAuth();
  const doctorId = user?.doctorId;
  const [unread, setUnread] = useState(() => doctorPortalService.getUnreadCountSync(doctorId));

  useEffect(() => {
    setUnread(doctorPortalService.getUnreadCountSync(doctorId));
    return doctorPortalService.subscribeNotifications(() => {
      setUnread(doctorPortalService.getUnreadCountSync(doctorId));
    });
  }, [doctorId]);

  return (
    <PanelLayout
      navigation={doctorNavigation}
      basePath="/medico"
      panelLabel="Panel Médico"
      unreadNotifications={unread}
    />
  );
}
