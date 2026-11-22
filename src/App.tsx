import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/context/auth/AuthProvider';
import { ToastProvider } from '@/context/toast/ToastProvider';
import { router } from '@/router';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  );
}
