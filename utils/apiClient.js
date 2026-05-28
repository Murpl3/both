import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const DEFAULT_TIMEOUT_MS = 15000;

async function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error('Request timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (id) clearTimeout(id);
  }
}

export async function getPassengerToken() {
  return await AsyncStorage.getItem('token');
}

export async function getConductorToken() {
  return await AsyncStorage.getItem('conductor_token');
}

export async function apiRequest(path, { method = 'GET', body, token, baseUrl } = {}) {
  const urlBase = (baseUrl || API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
  const url = `${urlBase}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await withTimeout(
    fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  );

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail = (data && data.detail) || (typeof data === 'string' ? data : null) || 'Request failed';
    const err = new Error(detail);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

