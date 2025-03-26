import { PeopleAltRounded } from '@mui/icons-material';
import { Divider, Card, Grid, Box } from '@mui/material';
import { FC, useEffect } from 'react';

import { FixedContentRefreshLoader } from '@/components/FixedContentRefreshLoader/FixedContentRefreshLoader';
import { FlexBox } from '@/components/FlexBox';
import { MiniLoader } from '@/components/MiniLoader';
import { SomethingWentWrong } from '@/components/SomethingWentWrong/SomethingWentWrong';
import { Line } from '@/components/Text';
import { FetchState } from '@/constants/ui-states';
import { useAuth } from '@/hooks/useAuth';
import {
  useBranchesForPrFilters,
  useSingleTeamConfig
} from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { getRandomLoadMsg } from '@/utils/loading-messages';
import { RootState } from '@/store/types';
import { useContributorData } from '@/hooks/useContributorData';

import { ContributorPerformanceSection } from '../DoraMetrics/ContributorPerformanceSection';
import { ContributorStatsCards } from './ContributorStatsCards';
import { TopContributorsPodium } from './TopContributorsPodium';

export const ContributorsPageContent: FC = () => {
  const dispatch = useDispatch();
  const { orgId, integrationList } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const branchPayloadForPrFilters = useBranchesForPrFilters();
  const { contributors, isLoading: contributorsLoading } = useContributorData();
  
  const isLoading = useSelector(
    (state: RootState) => state.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const isErrored = useSelector(
    (state: RootState) => state.doraMetrics.requests?.metrics_summary === FetchState.FAILURE
  );

  const firstLoadDone = useSelector((state: RootState) => state.doraMetrics.firstLoadDone);

  useEffect(() => {
    dispatch(
      fetchTeamDoraMetrics({
        orgId,
        teamId: singleTeamId,
        fromDate: dates.start,
        toDate: dates.end,
        ...branchPayloadForPrFilters
      })
    );
  }, [
    dates.end,
    dates.start,
    dispatch,
    orgId,
    singleTeamId,
    branchPayloadForPrFilters
  ]);

  if (isErrored)
    return (
      <SomethingWentWrong
        error="Contributor data could not be loaded"
        desc="Sorry about that! We encountered an issue while loading the contributors' data."
      />
    );
  if (!firstLoadDone) return <MiniLoader label={getRandomLoadMsg()} />;

  return (
    <FlexBox col gap3>
      <FixedContentRefreshLoader show={isLoading} />
      
      {/* Top section with Contributors Podium and Statistics Cards side by side */}
      <Grid container spacing={3}>
        {/* Top Contributors Podium */}
        <Grid item xs={12} md={5}>
          {contributors && contributors.length > 0 && (
            <TopContributorsPodium contributors={contributors} />
          )}
        </Grid>
        
        {/* Statistics Cards */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <FlexBox col gap={3}>
              <FlexBox gap={2} alignCenter>
                <Line white huge bold>
                  Contributor Statistics
                </Line>
              </FlexBox>
              <ContributorStatsCards />
            </FlexBox>
          </Card>
        </Grid>
      </Grid>
      
      <Divider />
      
      {/* Contributors Table */}
      <FlexBox col gap2 mt={2}>
        <ContributorPerformanceSection />
      </FlexBox>
      
      <Divider />
    </FlexBox>
  );
}; 