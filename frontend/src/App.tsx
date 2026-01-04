import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSessionStore } from './store/sessionStore';
import { AppLayout } from './components/Layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { PostSolutionPage } from './pages/PostSolutionPage';
import { StartThreadPage } from './pages/StartThreadPage';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';

const theme = createTheme({
  primaryColor: 'blue',
  primaryShade: 6,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  colors: {
    brand: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});

function App() {
  const { hasValidSession } = useSessionStore();

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" zIndex={1000} />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route
              path="/"
              element={
                hasValidSession() ? (
                  <HomePage />
                ) : (
                  <Navigate to="/settings" replace />
                )
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/post"
              element={
                <ProtectedRoute>
                  <PostSolutionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/start-thread"
              element={
                <ProtectedRoute>
                  <StartThreadPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
