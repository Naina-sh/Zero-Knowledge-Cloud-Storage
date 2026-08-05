/**
 * App root — wraps routes with BrowserRouter and toast notifications.
 * @module App
 */

import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(17, 24, 39, 0.9)',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            backdropFilter: 'blur(8px)',
          },
          success: {
            iconTheme: { primary: '#6366f1', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </BrowserRouter>
  );
}
