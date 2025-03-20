import { useEffect, useMemo, useState } from 'react';
import { useSelector } from '@/store';
import { PR } from '@/types/resources';
import { useAuth } from '@/hooks/useAuth';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { getDurationString } from '@/utils/date';

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

export const useContributorData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Get all PRs from the store - similar to how TeamInsightsBody does it
  const prs = useSelector(state => state.doraMetrics.summary_prs || []);
  const deployments = useSelector(state => state.doraMetrics.all_deployments || []);
  const incidents = useSelector(state => state.doraMetrics.all_incidents || []);
  const { singleTeamId } = useSingleTeamConfig();
  const { hasGithub } = useAuth();

  // Create a cache key based on the data that would cause a refresh
  const cacheKey = useMemo(() => {
    return `contributors-${singleTeamId}-${prs.length}-${deployments.length}-${incidents.length}`;
  }, [singleTeamId, prs.length, deployments.length, incidents.length]);
  
  // Create a mapping of deployment IDs to success/failure status
  const deploymentsMap = useMemo(() => {
    const map = new Map();
    deployments.forEach(deployment => {
      map.set(deployment.id, { 
        success: deployment.status === 'success',
        actor: deployment.event_actor?.username
      });
    });
    return map;
  }, [deployments]);

  // Calculate contributor data from PRs and other sources - without state changes
  const contributors = useMemo(() => {
    if (!prs.length) return [];
    
    // Create a map to store contributor data with username as key
    const contributorsMap = new Map<string, ContributorData>();
    
    // Process PRs to collect contributor data
    prs.forEach((pr: PR) => {
      const author = pr.author;
      if (!author || !author.username) return;
      
      // Skip bot accounts
      if (isBot(author.username)) return;
      
      const username = author.username;
      const name = author.name || username;
      
      // Get or initialize contributor data
      if (!contributorsMap.has(username)) {
        contributorsMap.set(username, {
          name,
          username,
          avatarUrl: author.avatar_url,
          contributions: 0,
          prs: 0,
          deploymentCount: 0,
          successfulDeployments: 0,
          failedDeployments: 0,
          incidentCount: 0,
          additions: 0,
          deletions: 0,
          leadTime: 0,
          mergeTime: 0,
          reworkTime: 0,
          isBot: false
        });
      }
      
      const contributor = contributorsMap.get(username)!;
      
      // Increment PR count
      contributor.prs += 1;
      
      // Add contributions (which is commits in this context)
      contributor.contributions += pr.commits || 0;
      
      // Add code changes
      contributor.additions += pr.additions || 0;
      contributor.deletions += pr.deletions || 0;
      
      // Track lead time, merge time, and rework time
      if (pr.lead_time) {
        if (!contributor.leadTime) contributor.leadTime = 0;
        contributor.leadTime = ((contributor.leadTime * (contributor.prs - 1)) + pr.lead_time) / contributor.prs;
        contributor.leadTimeFormatted = getDurationString(contributor.leadTime);
      }
      
      if (pr.merge_time) {
        if (!contributor.mergeTime) contributor.mergeTime = 0;
        contributor.mergeTime = ((contributor.mergeTime * (contributor.prs - 1)) + pr.merge_time) / contributor.prs;
        contributor.mergeTimeFormatted = getDurationString(contributor.mergeTime);
      }
      
      if (pr.rework_time) {
        if (!contributor.reworkTime) contributor.reworkTime = 0;
        contributor.reworkTime = ((contributor.reworkTime * (contributor.prs - 1)) + pr.rework_time) / contributor.prs;
        contributor.reworkTimeFormatted = getDurationString(contributor.reworkTime);
      }
    });
    
    // Process deployments to track deployment metrics
    deployments.forEach(deployment => {
      const actor = deployment.event_actor?.username;
      if (!actor || isBot(actor) || !contributorsMap.has(actor)) return;
      
      const contributor = contributorsMap.get(actor)!;
      contributor.deploymentCount += 1;
      if (deployment.status === 'success') {
        contributor.successfulDeployments += 1;
      } else {
        contributor.failedDeployments += 1;
      }
    });
    
    // Process incidents to track incident metrics
    incidents.forEach(incident => {
      const assignee = incident.assigned_to?.username;
      if (!assignee || isBot(assignee) || !contributorsMap.has(assignee)) return;
      
      const contributor = contributorsMap.get(assignee)!;
      contributor.incidentCount += 1;
    });
    
    // Convert map to array and sort by contributions (descending)
    return Array.from(contributorsMap.values())
      .sort((a, b) => b.contributions - a.contributions);
  }, [prs, deployments, incidents]);

  // Handle loading state and updates separately in useEffect
  useEffect(() => {
    if (prs.length === 0) {
      if (singleTeamId) {
        setIsLoading(true);
      }
    } else {
      setIsLoading(false);
      setLastUpdated(new Date());
    }
  }, [prs.length, singleTeamId, cacheKey]);

  return {
    contributors,
    isLoading,
    error,
    lastUpdated,
    hasGithub
  };
};