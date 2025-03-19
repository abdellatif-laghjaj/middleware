import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { handleApi } from '@/api-helpers/axios-api-instance';
import { ContributorData } from '@/components/ContributorPerformanceTable';

// Define the response type from the API
interface ContributorApiResponse {
  name: string;
  avatar_url?: string;
  contributions: number;
}

/**
 * Hook to fetch and process GitHub contributor data
 * @returns Object containing contributor data and loading state
 */
export const useContributorData = () => {
  const [contributors, setContributors] = useState<ContributorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  
  // Get data from the store
  const prs = useSelector((s) => s.doraMetrics.summary_prs || []);
  const deployments = useSelector((s) => s.doraMetrics.all_deployments || []);
  const teamRepos = useSelector((s) => s.team.teamReposMaps[singleTeamId] || []);
  
  useEffect(() => {
    const fetchContributorData = async () => {
      if (!orgId || !singleTeamId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        
        // Create a map to store contributor data
        const contributorsMap = new Map<string, ContributorData>();
        
        // Process repository contributor data
        for (const repo of teamRepos) {
          try {
            // Fetch contributor data from GitHub API via backend endpoint
            const repoContributors = await handleApi<ContributorApiResponse[]>(
              `internal/${orgId}/repo/${repo.id}/contributors`,
              {
                params: {
                  from_date: dates.start,
                  to_date: dates.end
                }
              }
            );
            
            // Process contributor data
            repoContributors.forEach((contributor) => {
              const existingContributor = contributorsMap.get(contributor.name);
              
              if (existingContributor) {
                // Update existing contributor data
                contributorsMap.set(contributor.name, {
                  ...existingContributor,
                  contributions: existingContributor.contributions + contributor.contributions,
                  avatarUrl: contributor.avatar_url || existingContributor.avatarUrl
                });
              } else {
                // Add new contributor
                contributorsMap.set(contributor.name, {
                  name: contributor.name,
                  avatarUrl: contributor.avatar_url,
                  contributions: contributor.contributions,
                  prs: 0,
                  deploymentCount: 0,
                  successfulDeployments: 0,
                  failedDeployments: 0,
                  incidentCount: 0
                });
              }
            });
          } catch (err) {
            console.error(`Error fetching contributors for repo ${repo.name}:`, err);
          }
        }
        
        // Process PR data
        prs.forEach((pr) => {
          const contributor = contributorsMap.get(pr.author);
          if (contributor) {
            contributor.prs = (contributor.prs || 0) + 1;
            
            // Calculate average lead time
            if (pr.lead_time) {
              contributor.leadTime = ((contributor.leadTime || 0) * (contributor.prs - 1) + pr.lead_time) / contributor.prs;
            }
            
            // Calculate average merge time
            if (pr.merge_time) {
              contributor.mergeTime = ((contributor.mergeTime || 0) * (contributor.prs - 1) + pr.merge_time) / contributor.prs;
            }
            
            // Calculate average rework time
            if (pr.rework_time) {
              contributor.reworkTime = ((contributor.reworkTime || 0) * (contributor.prs - 1) + pr.rework_time) / contributor.prs;
            }
            
            contributorsMap.set(pr.author, contributor);
          }
        });
        
        // Process deployment data
        deployments.forEach((deployment) => {
          if (deployment.author) {
            const contributor = contributorsMap.get(deployment.author);
            if (contributor) {
              contributor.deploymentCount = (contributor.deploymentCount || 0) + 1;
              
              if (deployment.status === 'SUCCESS') {
                contributor.successfulDeployments = (contributor.successfulDeployments || 0) + 1;
              } else {
                contributor.failedDeployments = (contributor.failedDeployments || 0) + 1;
              }
              
              // Count incidents
              if (deployment.incidents && deployment.incidents.length > 0) {
                contributor.incidentCount = (contributor.incidentCount || 0) + deployment.incidents.length;
              }
              
              contributorsMap.set(deployment.author, contributor);
            }
          }
        });
        
        // Convert map to array and sort by contributions
        const contributorsArray = Array.from(contributorsMap.values())
          .sort((a, b) => b.contributions - a.contributions);
        
        setContributors(contributorsArray);
      } catch (err) {
        console.error('Error fetching contributor data:', err);
        setError('Failed to fetch contributor data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContributorData();
  }, [orgId, singleTeamId, dates.start, dates.end, prs, deployments]);
  
  return { contributors, isLoading, error };
};