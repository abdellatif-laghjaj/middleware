import { endOfDay, startOfDay } from 'date-fns';
import * as yup from 'yup';

import { getTeamRepos } from '@/api/resources/team_repos';
import { getUnsyncedRepos } from '@/api/resources/teams/[team_id]/unsynced_repos';
import { Endpoint } from '@/api-helpers/global';
import { updatePrFilterParams } from '@/api-helpers/team';
import { mockDoraMetrics } from '@/mocks/dora_metrics';
import {
  ActiveBranchMode,
  TeamDoraMetricsApiResponseType
} from '@/types/resources';
import {
  fetchLeadTimeStats,
  fetchChangeFailureRateStats,
  fetchMeanTimeToRestoreStats,
  fetchDeploymentFrequencyStats
} from '@/utils/cockpitMetricUtils';
import { isoDateString, getAggregateAndTrendsIntervalTime } from '@/utils/date';
import {
  getBranchesAndRepoFilter,
  getWorkFlowFiltersAsPayloadForSingleTeam
} from '@/utils/filterUtils';

import { getTeamLeadTimePRs } from './insights';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required(),
  branches: yup.string().optional().nullable(),
  from_date: yup.date().required(),
  to_date: yup.date().required(),
  branch_mode: yup.string().oneOf(Object.values(ActiveBranchMode)).required()
});

const endpoint = new Endpoint(pathSchema);

// Add this function to fetch contributor performance data
const fetchContributorPerformance = async ({
  teamId,
  currStatsTimeObject,
  prevStatsTimeObject,
  prFilter
}: {
  teamId: ID;
  currStatsTimeObject: TimeObject;
  prevStatsTimeObject: TimeObject;
  prFilter?: PrFilter;
}) => {
  try {
    const result = await handleApi(
      `internal/team/${teamId}/contributor_performance`,
      {
        params: {
          ...currStatsTimeObject,
          ...prevStatsTimeObject,
          pr_filter: prFilter
        }
      }
    );

    const contributors = (result as any[]).map((contributor) => ({
      contributor: {
        id: contributor.id,
        name: contributor.name,
        username: contributor.username,
        avatar_url: contributor.avatar_url,
        activity_level: contributor.activity_level,
        total_contributions: contributor.total_contributions,
        pull_requests: contributor.pull_requests,
        average_lead_time: parseFloat(contributor.average_lead_time || '0'),
        average_review_time: 0, // This would need additional calculation
        change_failure_rate: parseFloat(contributor.change_failure_rate || '0')
      },
      insights: {
        last_updated: new Date(contributor.last_updated * 1000).toISOString(),
        percentile_rank: 0, // Would need additional calculation
        trend: 'stable' as const // Would need additional calculation
      }
    }));

    return { contributors };
  } catch (err) {
    console.error('Error fetching contributor performance:', err);
    return { contributors: [] };
  }
};

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(mockDoraMetrics);
  }

  const {
    org_id,
    team_id: teamId,
    from_date: rawFromDate,
    to_date: rawToDate,
    branches,
    branch_mode
  } = req.payload;

  const from_date = isoDateString(startOfDay(new Date(rawFromDate)));
  const to_date = isoDateString(endOfDay(new Date(rawToDate)));
  const [branchAndRepoFilters, unsyncedRepos] = await Promise.all([
    getBranchesAndRepoFilter({
      orgId: org_id,
      teamId,
      branchMode: branch_mode as ActiveBranchMode,
      branches
    }),
    getUnsyncedRepos(teamId)
  ]);
  const [prFilters, workflowFilters] = await Promise.all([
    updatePrFilterParams(teamId, {}, branchAndRepoFilters).then(
      ({ pr_filter }) => ({
        pr_filter
      })
    ),
    getWorkFlowFiltersAsPayloadForSingleTeam({
      orgId: org_id,
      teamId: teamId
    })
  ]);

  const {
    currTrendsTimeObject,
    prevTrendsTimeObject,
    prevCycleStartDay,
    prevCycleEndDay,
    currentCycleStartDay,
    currentCycleEndDay
  } = getAggregateAndTrendsIntervalTime(from_date, to_date);

  const [
    leadTimeResponse,
    meanTimeToRestoreResponse,
    changeFailureRateResponse,
    deploymentFrequencyResponse,
    contributorResponse,
    leadtimePrs,
    teamRepos
  ] = await Promise.all([
    fetchLeadTimeStats({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prFilter: prFilters
    }),
    fetchMeanTimeToRestoreStats({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prFilter: prFilters
    }),
    fetchChangeFailureRateStats({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      currTrendsTimeObject,
      prevTrendsTimeObject,
      prFilter: prFilters,
      workflowFilter: workflowFilters
    }),
    fetchDeploymentFrequencyStats({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      currTrendsTimeObject,
      prevTrendsTimeObject,
      workflowFilter: workflowFilters,
      prFilter: prFilters
    }),
    fetchContributorPerformance({
      teamId,
      currStatsTimeObject: {
        from_time: isoDateString(currentCycleStartDay),
        to_time: isoDateString(currentCycleEndDay)
      },
      prevStatsTimeObject: {
        from_time: isoDateString(prevCycleStartDay),
        to_time: isoDateString(prevCycleEndDay)
      },
      prFilter: prFilters
    }),
    getTeamLeadTimePRs(teamId, from_date, to_date, prFilters).then(
      (r) => r.data
    ),
    getTeamRepos(teamId)
  ]);

  return res.send({
    lead_time_stats: leadTimeResponse.lead_time_stats,
    lead_time_trends: leadTimeResponse.lead_time_trends,
    mean_time_to_restore_stats:
      meanTimeToRestoreResponse.mean_time_to_restore_stats,
    mean_time_to_restore_trends:
      meanTimeToRestoreResponse.mean_time_to_restore_trends,
    change_failure_rate_stats:
      changeFailureRateResponse.change_failure_rate_stats,
    change_failure_rate_trends:
      changeFailureRateResponse.change_failure_rate_trends,
    deployment_frequency_stats:
      deploymentFrequencyResponse.deployment_frequency_stats,
    deployment_frequency_trends:
      deploymentFrequencyResponse.deployment_frequency_trends,
    lead_time_prs: leadtimePrs,
    assigned_repos: teamRepos,
    unsynced_repos: unsyncedRepos,
    contributors: contributorResponse.contributors // Add contributors data to response
  } as TeamDoraMetricsApiResponseType);
});

export default endpoint.serve();
