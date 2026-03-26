const IS_PROD = process.env.NODE_ENV === 'production';

// In production, the backend might be on a different domain (Railway)
// In development, it defaults to localhost:8000
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

export const API_URL = `${BACKEND_URL}/api`;

export default {
    API_URL,
    IS_PROD
};
