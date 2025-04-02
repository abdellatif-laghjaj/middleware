import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { AgentFeature } from '@/content/DoraMetrics/AIAnalysis/AIAnalysis';

interface AiAgentResponse {
  status?: 'success' | 'error';
  response?: string;
  message?: string;
  fallback_text?: string;
}

interface PullRequestDiff {
  pull_id: string;
  diff_content: string;
  repo_name: string;
  title: string;
  author: string;
}

export interface UseAiAgentResult {
  response: string | null;
  isLoading: boolean;
  error: string | null;
  prDiffs: PullRequestDiff[];
  generateResponse: (feature: AgentFeature, query: string, model: string, data: any) => Promise<void>;
}

export const useAiAgent = (): UseAiAgentResult => {
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prDiffs, setPrDiffs] = useState<PullRequestDiff[]>([]);

  // Function to fetch PR diffs from GitHub
  const fetchPullRequestDiffs = useCallback(async (prs: any[]): Promise<PullRequestDiff[]> => {
    if (!prs || prs.length === 0) return [];
    
    try {
      // Limit to 5 PRs max to avoid overwhelming the API and the model
      const prsToFetch = prs.slice(0, 5);
      const diffsPromises = prsToFetch.map(async (pr) => {
        if (!pr.url || !pr.number) return null;
        
        // Extract owner and repo from the URL
        // PR URL format: https://github.com/{owner}/{repo}/pull/{number}
        const urlParts = pr.url.split('/');
        const repoIndex = urlParts.indexOf('github.com');
        if (repoIndex === -1) return null;
        
        const owner = urlParts[repoIndex + 1];
        const repo = urlParts[repoIndex + 2];
        
        try {
          // Fetch the PR diff using GitHub API
          const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}`, {
            headers: {
              Accept: 'application/vnd.github.v3.diff'
            }
          });
          
          console.log("response.data", response.data);
          
          return {
            pull_id: pr.number,
            diff_content: response.data,
            repo_name: `${owner}/${repo}`,
            title: pr.title || `PR #${pr.number}`,
            author: pr.author?.username || 'Unknown'
          };
        } catch (err) {
          console.error(`Failed to fetch diff for PR #${pr.number}:`, err);
          return null;
        }
      });
      
      const results = await Promise.all(diffsPromises);
      return results.filter(Boolean) as PullRequestDiff[];
    } catch (err) {
      console.error('Error fetching PR diffs:', err);
      return [];
    }
  }, []);

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
      // If it's a code quality query, fetch PR diffs
      let codeData = {};
      if (feature === AgentFeature.CODE_QUALITY && data?.lead_time_prs) {
        const diffs = await fetchPullRequestDiffs(data.lead_time_prs);
        setPrDiffs(diffs);
        
        codeData = {
          pull_request_diffs: diffs,
          diff_count: diffs.length
        };
      }

      const response = await axios.post<AiAgentResponse>(
        '/api/ai/dora_agent',
        {
          feature,
          query,
          model,
          data: {
            ...data,
            ...codeData
          }
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
  }, [fetchPullRequestDiffs]);

  return {
    response,
    isLoading,
    error,
    prDiffs,
    generateResponse
  };
}; 