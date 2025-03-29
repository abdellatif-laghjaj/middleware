import { useState, useCallback } from 'react';
import axios from 'axios';
import { AgentFeature } from '@/content/DoraMetrics/AIAnalysis/AIAnalysis';

interface AiAgentResponse {
  status?: 'success' | 'error';
  response?: string;
  message?: string;
  fallback_text?: string;
}

export interface UseAiAgentResult {
  response: string | null;
  isLoading: boolean;
  error: string | null;
  generateResponse: (feature: AgentFeature, query: string, model: string, data: any) => Promise<void>;
}

export const useAiAgent = (): UseAiAgentResult => {
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (
    feature: AgentFeature, 
    query: string, 
    model: string, 
    data: any
  ) => {
    if (!query) {
      setError('No query provided');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const response = await axios.post<AiAgentResponse>(
        '/api/ai/dora_agent',
        {
          feature,
          query,
          model,
          data
        }
      );

      if (response.data.response) {
        setResponse(response.data.response);
      } else {
        setError(
          response.data.fallback_text || 
          response.data.message || 
          'Failed to generate response'
        );
      }
    } catch (err: any) {
      // Handle axios error or response with error status
      const errorMessage = 
        err.response?.data?.fallback_text || 
        err.response?.data?.message || 
        err.message || 
        'An error occurred while generating the response';
      
      setError(errorMessage);
      
      // If this is a 400 error due to missing API key, we want to set a specific error
      if (err.response?.status === 400 && err.response?.data?.message?.includes('API key not found')) {
        setError('AI agent not available. Please configure your AI service API key.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    response,
    isLoading,
    error,
    generateResponse
  };
}; 