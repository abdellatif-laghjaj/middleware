import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSelector } from '@/store';
import { PR } from '@/types/resources';
import { useAuth } from '@/hooks/useAuth';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { getDurationString } from '@/utils/date';
import { handleApi } from '@/api-helpers/axios-api-instance';

export interface ContributorData {
  name: string;
  username: string;
  avatarUrl?: string;
  contributions: number;
  prs: number;
  deploymentCount: number;
  successfulDeployments: number;
  failedDeployments: number;
  incidentCount: number;
  leadTime?: number;
  leadTimeFormatted?: string;
  mergeTime?: number;
  mergeTimeFormatted?: string;
  reworkTime?: number;
  reworkTimeFormatted?: string;
  additions: number;
  deletions: number;
  isBot: boolean;
}

// Bot usernames commonly used in GitHub
const BOT_PATTERNS = [
  'bot',
  'jenkins',
  'travis',
  'circleci',
  'github-actions',
  'dependabot',
  'renovate',
  'snyk',
  'github-actions[bot]',
  'dependabot[bot]',
  'renovate[bot]'
];

const isBot = (username: string): boolean => {
  if (!username) return false;
  const lowerUsername = username.toLowerCase();
  return BOT_PATTERNS.some(pattern => lowerUsername.includes(pattern));
};

// Interface for the API response from our backend
interface ContributorResponse {
  contributors: Array<{
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
    type: string;
    contributions: number;
    repositories: Array<{
      name: string;
      contributions: number;
    }>;
  }>;
}

export const useContributorData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [contributors, setContributors] = useState<ContributorData[]>([]);
  const hasFetchedRef = useRef(false);
  
  // Get deployments and incidents from the store for additional metrics
  const deployments = useSelector(state => state.doraMetrics.all_deployments || []);
  const incidents = useSelector(state => state.doraMetrics.all_incidents || []);
  const prs = useSelector(state => state.doraMetrics.summary_prs || []);
  const { singleTeamId } = useSingleTeamConfig();
  const { hasGithub } = useAuth();
  
  // Get date range from the store
  const from_date = new Date(0).toISOString().split('T')[0]; // Default to epoch start
  const to_date = new Date().toISOString().split('T')[0]; // Default to today
  const dates = {
    start: from_date,
    end: to_date
  }

  // Create a cache key based on the data that would cause a refresh
  const cacheKey = useMemo(() => {
    return `contributors-${singleTeamId}-${dates?.start}-${dates?.end}`;
  }, [singleTeamId, dates?.start, dates?.end]);

  // Create a mapping of PR data by author username
  const prDataByAuthor = useMemo(() => {
    const map = new Map<string, {
      prs: number;
      additions: number;
      deletions: number;
      commits: number; // Track total commits from PRs
      leadTime: number;
      mergeTime: number;
      reworkTime: number;
    }>();
    
    prs.forEach((pr: PR) => {
      const author = pr.author;
      if (!author || !author.username || isBot(author.username)) return;
      
      const username = author.username;
      
      if (!map.has(username)) {
        map.set(username, {
          prs: 0,
          additions: 0,
          deletions: 0,
          commits: 0,
          leadTime: 0,
          mergeTime: 0,
          reworkTime: 0
        });
      }
      
      const data = map.get(username)!;
      data.prs += 1;
      data.additions += pr.additions || 0;
      data.deletions += pr.deletions || 0;
      data.commits += pr.commits || 0; // Add commits from each PR
      
      // Track lead time, merge time, and rework time
      if (pr.lead_time) {
        data.leadTime = ((data.leadTime * (data.prs - 1)) + pr.lead_time) / data.prs;
      }
      
      if (pr.merge_time) {
        data.mergeTime = ((data.mergeTime * (data.prs - 1)) + pr.merge_time) / data.prs;
      }
      
      if (pr.rework_time) {
        data.reworkTime = ((data.reworkTime * (data.prs - 1)) + pr.rework_time) / data.prs;
      }
    });
    
    return map;
  }, [prs]);

  // Create a mapping of deployment metrics by username
  const deploymentsByActor = useMemo(() => {
    const map = new Map<string, {
      deploymentCount: number;
      successfulDeployments: number;
      failedDeployments: number;
    }>();
    
    deployments.forEach(deployment => {
      const actor = deployment.event_actor?.username;
      if (!actor || isBot(actor)) return;
      
      if (!map.has(actor)) {
        map.set(actor, {
          deploymentCount: 0,
          successfulDeployments: 0,
          failedDeployments: 0
        });
      }
      
      const data = map.get(actor)!;
      data.deploymentCount += 1;
      if (deployment.status === 'success') {
        data.successfulDeployments += 1;
      } else {
        data.failedDeployments += 1;
      }
    });
    
    return map;
  }, [deployments]);

  // Create a mapping of incident counts by assignee
  const incidentsByAssignee = useMemo(() => {
    const map = new Map<string, number>();
    
    incidents.forEach(incident => {
      const assignee = incident.assigned_to?.username;
      if (!assignee || isBot(assignee)) return;
      
      map.set(assignee, (map.get(assignee) || 0) + 1);
    });
    
    return map;
  }, [incidents]);

  // Function to fetch contributors data from the API
  const fetchContributorData = useCallback(() => {
    if (!singleTeamId || !dates?.start || !dates?.end) {
      return Promise.reject(new Error('Missing required parameters'));
    }
    
    setIsLoading(true);
    setError(null);
    
    // Call our API endpoint to get contributors
    return handleApi<ContributorResponse>(`/internal/team/${singleTeamId}/contributors`, {
      params: {
        from_date: dates.start,
        to_date: dates.end
      }
    })
      .then(response => {
        // Track usernames to ensure uniqueness
        const processedUsernames = new Set<string>();
        
        // Map the API response to our ContributorData format
        const mappedContributors = response.contributors.map(contributor => {
          const username = contributor.login;
          processedUsernames.add(username);
          
          const prData = prDataByAuthor.get(username);
          const deploymentData = deploymentsByActor.get(username);
          const incidentCount = incidentsByAssignee.get(username) || 0;
          
          const contributorData: ContributorData = {
            name: username, // Use login as name if no PR author data
            username,
            avatarUrl: contributor.avatar_url,
            contributions: contributor.contributions, // GitHub API contributions count
            prs: prData?.prs || 0,
            deploymentCount: deploymentData?.deploymentCount || 0,
            successfulDeployments: deploymentData?.successfulDeployments || 0,
            failedDeployments: deploymentData?.failedDeployments || 0,
            incidentCount,
            additions: prData?.additions || 0,
            deletions: prData?.deletions || 0,
            isBot: isBot(username)
          };
          
          // Add formatted time metrics if available
          if (prData?.leadTime) {
            contributorData.leadTime = prData.leadTime;
            contributorData.leadTimeFormatted = getDurationString(prData.leadTime);
          }
          
          if (prData?.mergeTime) {
            contributorData.mergeTime = prData.mergeTime;
            contributorData.mergeTimeFormatted = getDurationString(prData.mergeTime);
          }
          
          if (prData?.reworkTime) {
            contributorData.reworkTime = prData.reworkTime;
            contributorData.reworkTimeFormatted = getDurationString(prData.reworkTime);
          }
          
          return contributorData;
        });
        
        // Add PR authors who aren't already in the contributor list
        const prAuthors: ContributorData[] = [];
        
        prDataByAuthor.forEach((prData, username) => {
          // Skip if already processed or is a bot
          if (processedUsernames.has(username) || isBot(username)) return;
          
          // Add this PR author as a contributor
          processedUsernames.add(username);
          
          const deploymentData = deploymentsByActor.get(username);
          const incidentCount = incidentsByAssignee.get(username) || 0;
          
          const contributorData: ContributorData = {
            name: username, // Use username as name
            username,
            avatarUrl: undefined, // No avatar URL available for PR-only authors
            contributions: prData.commits || 0, // Use commit count from PRs for PR-only authors
            prs: prData.prs,
            deploymentCount: deploymentData?.deploymentCount || 0,
            successfulDeployments: deploymentData?.successfulDeployments || 0,
            failedDeployments: deploymentData?.failedDeployments || 0,
            incidentCount,
            additions: prData.additions,
            deletions: prData.deletions,
            isBot: false // Already filtered in prDataByAuthor
          };
          
          // Add formatted time metrics if available
          if (prData.leadTime) {
            contributorData.leadTime = prData.leadTime;
            contributorData.leadTimeFormatted = getDurationString(prData.leadTime);
          }
          
          if (prData.mergeTime) {
            contributorData.mergeTime = prData.mergeTime;
            contributorData.mergeTimeFormatted = getDurationString(prData.mergeTime);
          }
          
          if (prData.reworkTime) {
            contributorData.reworkTime = prData.reworkTime;
            contributorData.reworkTimeFormatted = getDurationString(prData.reworkTime);
          }
          
          prAuthors.push(contributorData);
        });
        
        // Combine GitHub contributors with PR authors
        const allContributors = [...mappedContributors, ...prAuthors];
        
        // Filter out bot accounts
        const filteredContributors = allContributors.filter(c => !c.isBot);
        
        // Sort by contributions (descending), then by PRs if contributions are equal
        const sortedContributors = filteredContributors.sort((a, b) => {
          if (b.contributions !== a.contributions) {
            return b.contributions - a.contributions;
          }
          return b.prs - a.prs;
        });
        
        setContributors(sortedContributors);
        setLastUpdated(new Date());
        setIsLoading(false);
        return sortedContributors;
      })
      .catch(err => {
        console.error('Error fetching contributors:', err);
        setError(new Error(err.message || 'Failed to fetch contributors'));
        setIsLoading(false);
        throw err;
      });
  }, [singleTeamId, dates?.start, dates?.end, prDataByAuthor, deploymentsByActor, incidentsByAssignee]);
  
  // Public function to refresh data
  const refreshData = useCallback(() => {
    return fetchContributorData();
  }, [fetchContributorData]);

  // Fetch contributors from the API on initial load and when dependencies change
  useEffect(() => {
    // Only fetch if we haven't fetched before and we're not currently loading
    if (!hasFetchedRef.current && !isLoading) {
      hasFetchedRef.current = true;
      fetchContributorData();
    }
  }, [cacheKey, isLoading]);
  
  // Reset the fetch flag when cache key changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [cacheKey]);

  return {
    contributors,
    isLoading,
    error,
    lastUpdated,
    hasGithub,
    refreshData
  };
};