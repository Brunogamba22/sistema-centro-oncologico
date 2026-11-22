import { lazy } from 'react';
import { Navigate, Outlet, ScrollRestoration, createBrowserRouter } from 'react-router-dom';
import { ROLE_CONFIG } from '@/config/roles';
import { useAuth } from '@/context/auth/useAuth';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ChatbotLayout } from '@/layouts/ChatbotLayout';
import NotFoundPage from '@/pages/system/NotFoundPage';
import RouteErrorPage from '@/pages/system/RouteErrorPage';
import { adminRoutes } from './adminRoutes';
import { doctorRoutes } from './doctorRoutes';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ChatbotDemoPage = lazy(() => import('@/pages/chatbot/ChatbotDemoPage'));
const DesignSystemPage = lazy(() => import('@/pages/system/DesignSystemPage'));

function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

/** "/" → panel del rol activo o pantalla de acceso. */
function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? ROLE_CONFIG[user.role].homePath : '/acceso'} replace />;
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomeRedirect /> },
      {
        element: <AuthLayout />,
        children: [{ path: '/acceso', element: <LoginPage /> }],
      },
      adminRoutes,
      doctorRoutes,
      {
        path: '/chatbot',
        element: <ChatbotLayout />,
        children: [{ index: true, element: <ChatbotDemoPage /> }],
      },
      { path: '/sistema-de-diseno', element: <DesignSystemPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
