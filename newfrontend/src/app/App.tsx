import { RouterProvider } from 'react-router';
import { useEffect } from 'react';
import { router } from './routes';
import {
  USER_PREFERENCES_CHANGED_EVENT,
  applyTheme,
  getStoredUserPreferences,
} from '../lib/settings';

function App() {
  useEffect(() => {
    const applyCurrentTheme = () => {
      const prefs = getStoredUserPreferences();
      applyTheme(prefs.theme);
    };

    applyCurrentTheme();
    window.addEventListener(USER_PREFERENCES_CHANGED_EVENT, applyCurrentTheme);

    return () => {
      window.removeEventListener(USER_PREFERENCES_CHANGED_EVENT, applyCurrentTheme);
    };
  }, []);

  return (
    <div>
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
