import { useState, useEffect } from 'react';
import api from '../api';
import { AxiosRequestConfig } from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T = any>(url: string, config?: AxiosRequestConfig): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(url, config);
      setData(response.data);
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Erro ao carregar dados';
      setError(message);
      console.error('API error:', message, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}

interface UseApiMutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (body?: any) => Promise<T | null>;
  reset: () => void;
}

export function useApiMutation<T = any>(
  method: 'post' | 'put' | 'delete',
  baseUrl: string
): UseApiMutationState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (body?: any): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api[method](baseUrl, body);
      setData(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Erro na operação';
      setError(message);
      console.error('API mutation error:', message, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, execute, reset };
}
