import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { supabase } from "./lib/supabase";

const initAuthFromHash = async () => {
  const hash = window.location.hash;
  if (hash) {
    // Parse query string from hash (remove # first)
    const queryString = hash.substring(1);
    const params = new URLSearchParams(queryString);
    
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      try {
        console.log('Restoring session from URL fragment...');
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (!error) {
          console.log('Session restored successfully');
          // Clear hash without reload
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          console.error('Session restore error:', error);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      }
    }
  }
};

initAuthFromHash().then(() => {
  // Remove initial loader after React is ready
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s ease';
    setTimeout(() => loader.remove(), 300);
  }

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
