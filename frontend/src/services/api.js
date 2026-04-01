import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${API_URL}/api`;

// Helper per gli header (se necessari esternamente, ma meglio gestirli qui o via interceptor)
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Client Management
 */
export const get_client = async (clientId) => {
  const res = await axios.get(`${API}/clients/${clientId}`, { headers: getHeaders() });
  return res.data;
};

export const update_client_configuration = async (clientId, config) => {
  const res = await axios.patch(`${API}/clients/${clientId}/configuration`, config, { headers: getHeaders() });
  return res.data;
};

/**
 * GSC & Data
 */
export const get_gsc_data = async (clientId, days = 30) => {
  const res = await axios.get(`${API}/clients/${clientId}/gsc-data?days=${days}`, { headers: getHeaders() });
  return res.data;
};

/**
 * SEO Autopilot
 */
export const run_autopilot_check = async (clientId) => {
  const res = await axios.post(`${API}/autopilot/check/${clientId}`, {}, { headers: getHeaders() });
  return res.data;
};

/**
 * SEO Chat & Strategist
 */
export const send_chat_message = async (clientId, message) => {
  const res = await axios.post(`${API}/chat/${clientId}`, { message }, { headers: getHeaders() });
  return res.data;
};

/**
 * Content Generation
 */
export const generate_content = async (clientId, data) => {
  const res = await axios.post(`${API}/generate/${clientId}`, data, { headers: getHeaders() });
  return res.data;
};
