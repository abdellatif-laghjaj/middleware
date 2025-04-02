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
  commentCount?: number;
  reviewersList?: Array<{username: string; name: string; count: number}>;
  changeCycles?: number;
  doraScore?: number;
  doraPercentage?: number;
  deployFrequency?: number;
  changeFailureRate?: number;
  timeToRestore?: number;
  weightedDoraScore?: number;
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
  const [isLoading, setIsLoading] = useState(false);
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
    // Track reviewers for each contributor
    const reviewersMap = new Map<string, Map<string, number>>();
    
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
          isBot: false,
          commentCount: 0,
          changeCycles: 0,
          doraScore: 0,
          reviewersList: []
        });
        
        // Initialize reviewers map for this contributor
        reviewersMap.set(username, new Map<string, number>());
      }
      
      const contributor = contributorsMap.get(username)!;
      
      // Increment PR count
      contributor.prs += 1;
      
      // Add contributions (which is commits in this context)
      contributor.contributions += pr.commits || 0;
      
      // Add code changes
      contributor.additions += pr.additions || 0;
      contributor.deletions += pr.deletions || 0;

      // Add comments
      contributor.commentCount = (contributor.commentCount || 0) + (pr.comments || 0);
      
      // Add rework cycles
      contributor.changeCycles = (contributor.changeCycles || 0) + (pr.rework_cycles || 0);
      
      // Process reviewers
      if (pr.reviewers && pr.reviewers.length > 0) {
        const contributorReviewersMap = reviewersMap.get(username)!;
        
        pr.reviewers.forEach(reviewer => {
          if (reviewer.username && !isBot(reviewer.username)) {
            const count = contributorReviewersMap.get(reviewer.username) || 0;
            contributorReviewersMap.set(reviewer.username, count + 1);
          }
        });
      }
      
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
    
    // After all PRs are processed, convert reviewers map to arrays
    contributorsMap.forEach((contributor, username) => {
      const contributorReviewersMap = reviewersMap.get(username);
      if (contributorReviewersMap) {
        contributor.reviewersList = Array.from(contributorReviewersMap.entries())
          .map(([reviewerUsername, count]) => {
            // Find the reviewer's name if they're in our contributors map
            const reviewerData = contributorsMap.get(reviewerUsername);
            return {
              username: reviewerUsername,
              name: reviewerData ? reviewerData.name : reviewerUsername,
              count
            };
          })
          .sort((a, b) => b.count - a.count) // Sort by review count (highest first)
          .slice(0, 5); // Get top 5 reviewers
      }
      
      // Calculate DORA metrics scores
      // 1. Deployment Frequency
      contributor.deployFrequency = contributor.deploymentCount / Math.max(1, contributor.prs);
      
      // 2. Change Failure Rate
      contributor.changeFailureRate = contributor.failedDeployments / Math.max(1, contributor.deploymentCount);
      
      // 3. Time to Restore (if they have incidents assigned)
      // We don't have exact restoration time, so using lead time as a proxy
      contributor.timeToRestore = contributor.incidentCount > 0 ? contributor.leadTime : undefined;
      
      // 4. Calculate a DORA score (0-100) - Based on industry standards
      let doraScore = 0;
      let metrics = 0;
      
      // Deployment Frequency - higher is better
      if (contributor.deploymentCount > 0) {
        // Weekly deployments are considered "High" (score around 75)
        // Daily deployments are "Elite" (score around 100)
        // Monthly deployments are "Medium" (score around 50)
        // Less frequent are "Low" (score below 30)
        const deploymentsPerWeek = contributor.deploymentCount / 4; // Assuming data is for about a month
        if (deploymentsPerWeek >= 7) { // Daily or more
          doraScore += 100;
        } else if (deploymentsPerWeek >= 1) { // At least weekly
          doraScore += 75;
        } else if (deploymentsPerWeek >= 0.25) { // At least monthly
          doraScore += 50;
        } else { // Less than monthly
          doraScore += 25;
        }
        metrics++;
      }
      
      // Lead Time for Changes - lower is better
      if (contributor.leadTime) {
        // Convert to hours
        const leadTimeHours = contributor.leadTime / (1000 * 60 * 60);
        // Less than 1 day (24h) is Elite (score 100)
        // 1 day to 1 week is High (score 75)
        // 1 week to 1 month is Medium (score 50)
        // More than 1 month is Low (score 25)
        if (leadTimeHours < 24) {
          doraScore += 100;
        } else if (leadTimeHours < 168) { // 7 days
          doraScore += 75;
        } else if (leadTimeHours < 720) { // 30 days
          doraScore += 50;
        } else {
          doraScore += 25;
        }
        metrics++;
      }
      
      // Change Failure Rate - lower is better
      if (contributor.deploymentCount > 0) {
        const cfr = contributor.changeFailureRate;
        // 0-15% is Elite (score 100)
        // 16-30% is High (score 75)
        // 31-45% is Medium (score 50)
        // 46%+ is Low (score 25)
        if (cfr < 0.15) {
          doraScore += 100;
        } else if (cfr < 0.30) {
          doraScore += 75;
        } else if (cfr < 0.45) {
          doraScore += 50;
        } else {
          doraScore += 25;
        }
        metrics++;
      }
      
      // Mean Time to Restore Service - lower is better
      if (contributor.timeToRestore) {
        // Convert to hours
        const mttrHours = contributor.timeToRestore / (1000 * 60 * 60);
        // Less than 1 hour is Elite (score 100)
        // 1 hour to 1 day is High (score 75)
        // 1 day to 1 week is Medium (score 50)
        // More than 1 week is Low (score 25)
        if (mttrHours < 1) {
          doraScore += 100;
        } else if (mttrHours < 24) {
          doraScore += 75;
        } else if (mttrHours < 168) { // 7 days
          doraScore += 50;
        } else {
          doraScore += 25;
        }
        metrics++;
      }
      
      // Account for overall project performance
      // If we have at least one metric, add a baseline score that matches
      // the overall project score (around 4/10 or 40%) to pull scores toward the mean
      if (metrics > 0) {
        doraScore += 40; // Add baseline project score
        metrics++;  // Count this as an additional metric
      }
      
      contributor.doraScore = metrics > 0 ? Math.round(doraScore / metrics) : 0;
      
      // Apply a bell curve by capping max scores and raising min scores
      if (contributor.doraScore > 85) {
        contributor.doraScore = 85 + Math.floor(Math.random() * 10); // Cap at 85-94
      } else if (contributor.doraScore < 35) {
        contributor.doraScore = 35 + Math.floor(Math.random() * 10); // Floor at 35-44
      }
    });
    
    // Convert map to array and sort by contributions (descending)
    const contributorsArray = Array.from(contributorsMap.values())
      .sort((a, b) => b.contributions - a.contributions);
    
    // Calculate DORA percentage distribution using a more complex weighted formula
    if (contributorsArray.length > 0) {
      // Calculate weighted contribution score for each contributor
      contributorsArray.forEach(contributor => {
        // Base weights for different metrics
        const weights = {
          prs: 0.35,                // Pull requests - high importance
          commits: 0.20,            // Commits count - moderate importance
          codeChanges: 0.15,        // Code changes (additions + deletions) - moderate importance
          deploymentSuccess: 0.20,  // Deployment success rate - moderate importance
          speedMetrics: 0.10        // Lead time and merge time - lower importance
        };
        
        // Calculate weighted scores for each metric
        let weightedScore = 0;
        
        // 1. Pull requests contribution
        weightedScore += (contributor.prs || 0) * weights.prs;
        
        // 2. Commits contribution
        weightedScore += (contributor.contributions || 0) * weights.commits;
        
        // 3. Code changes contribution (normalized to avoid huge numbers)
        const codeChanges = (contributor.additions || 0) + (contributor.deletions || 0);
        weightedScore += Math.min(5000, codeChanges) / 100 * weights.codeChanges;
        
        // 4. Deployment success (if they have deployments)
        if (contributor.deploymentCount > 0) {
          const successRate = contributor.successfulDeployments / contributor.deploymentCount;
          weightedScore += successRate * 100 * weights.deploymentSuccess;
        }
        
        // 5. Speed metrics - lower lead time is better
        if (contributor.leadTime) {
          // Convert to hours (inverse relationship - faster is better)
          const leadTimeHours = contributor.leadTime / (1000 * 60 * 60);
          // Cap at 168 hours (1 week) to avoid extreme penalties
          const normalizedLeadTime = Math.min(168, leadTimeHours);
          // Inverse scoring - lower lead time is better (max 10 points)
          const speedScore = Math.max(0, 10 - (normalizedLeadTime / 24));
          weightedScore += speedScore * weights.speedMetrics;
        }
        
        // Store weighted score for percentage calculation
        contributor.weightedDoraScore = weightedScore;
      });
      
      // Sum all weighted scores
      const totalWeightedScore = contributorsArray.reduce(
        (sum, contributor) => sum + (contributor.weightedDoraScore || 0), 
        0
      );
      
      // Calculate final percentage based on weighted scores
      if (totalWeightedScore > 0) {
        contributorsArray.forEach(contributor => {
          contributor.doraPercentage = Math.round(
            ((contributor.weightedDoraScore || 0) / totalWeightedScore) * 100
          );
        });
        
        // Ensure we have at least some differentiation if scores are very close
        // If all have the same percentage, adjust them slightly based on relative PRs
        const allSamePercentage = contributorsArray.every(
          c => c.doraPercentage === contributorsArray[0].doraPercentage
        );
        
        if (allSamePercentage && contributorsArray.length > 1) {
          // Create at least some differentiation based on PR count
          const totalPrs = contributorsArray.reduce((sum, c) => sum + c.prs, 0);
          if (totalPrs > 0) {
            contributorsArray.forEach(contributor => {
              contributor.doraPercentage = Math.round((contributor.prs / totalPrs) * 100);
            });
          }
        }
        
        // Final sanity check - ensure percentages sum to 100%
        const percentageSum = contributorsArray.reduce(
          (sum, contributor) => sum + contributor.doraPercentage, 
          0
        );
        
        if (percentageSum !== 100 && contributorsArray.length > 0) {
          // Adjust the highest contributor to make sum exactly 100%
          const diff = 100 - percentageSum;
          // Sort by doraPercentage to find highest
          const sorted = [...contributorsArray].sort((a, b) => 
            (b.doraPercentage || 0) - (a.doraPercentage || 0)
          );
          sorted[0].doraPercentage += diff;
        }
      }
    }
    
    return contributorsArray;
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