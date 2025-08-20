// Centralized API base URL for the frontend
// Priority: VITE_API_BASE_URL env var → localhost for dev → Vercel URL
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://parse-med-backend.vercel.app');


