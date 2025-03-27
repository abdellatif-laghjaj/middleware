import { useState, useCallback } from 'react';
import axios from 'axios';
import { ContributorData } from './useContributorData';

interface ContributorSummaryResponse {
  status: 'success' | 'error';
  summary?: string;
  message?: string;
  fallback_text?: string;
}

interface UseContributorSummaryResult {
  summary: string | null;
  isLoading: boolean;
  error: string | null;
  generateSummary: (contributor: ContributorData) => Promise<void>;
}

export const useContributorSummary = (): UseContributorSummaryResult => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async (contributor: ContributorData) => {
    if (!contributor) {
      setError('No contributor data provided');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await axios.post<ContributorSummaryResponse>(
        '/api/ai/contributor-summary',
        {
          contributor_data: contributor,
          model: 'GEMINI' // Default to Gemini as specified in requirements
        }
      );

      if (response.data.status === 'success' && response.data.summary) {
        setSummary(response.data.summary);
      } else {
        setError(response.data.fallback_text || response.data.message || 'Failed to generate summary');
      }
    } catch (err: any) {
      // Handle axios error or response with error status
      const errorMessage = 
        err.response?.data?.fallback_text || 
        err.response?.data?.message || 
        err.message || 
        'An error occurred while generating the summary';
      
      setError(errorMessage);
      
      // If this is a 400 error due to missing API key, we want to set a specific error
      if (err.response?.status === 400 && err.response?.data?.message?.includes('API key not found')) {
        setError('AI summary not available. Please configure your AI service API key.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    summary,
    isLoading,
    error,
    generateSummary
  };
}; 