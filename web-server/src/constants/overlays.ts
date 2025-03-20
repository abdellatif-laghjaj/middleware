import dynamic from 'next/dynamic';

export const overlaysImportMap = {
  all_incidents: dynamic(
    () => import('@/content/DoraMetrics/Incidents').then((m) => m.Incidents),
    { ssr: false }
  ),
  resolved_incidents: dynamic(
    () =>
      import('@/content/DoraMetrics/ResolvedIncidents').then(
        (m) => m.ResolvedIncidents
      ),
    { ssr: false }
  ),
  deployment_freq: dynamic(
    () =>
      import('@/content/PullRequests/DeploymentFrequencyGraph').then(
        (m) => m.DeploymentFrequencyGraph
      ),
    { ssr: false }
  ),
  team_prs: dynamic(
    () =>
      import('@/content/PullRequests/TeamInsightsBody').then(
        (m) => m.TeamInsightsBody
      ),
    { ssr: false }
  ),
  deployment_insights: dynamic(
    () =>
      import('@/content/PullRequests/DeploymentInsightsOverlay').then(
        (m) => m.DeploymentInsightsOverlay
      ),
    { ssr: false }
  ),
  contributor_details: dynamic(
    () =>
      import('@/content/DoraMetrics/ContributorDetailsOverlay').then(
        (m) => m.ContributorDetailsOverlay
      ),
    { ssr: false }
  )
};
