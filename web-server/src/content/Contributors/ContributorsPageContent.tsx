import { PeopleAltRounded } from '@mui/icons-material';
import { Divider, Card } from '@mui/material';
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

import { ContributorPerformanceSection } from '../DoraMetrics/ContributorPerformanceSection';
import { ContributorStatsCards } from './ContributorStatsCards';

export const ContributorsPageContent: FC = () => {
  const dispatch = useDispatch();
  const { orgId, integrationList } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const branchPayloadForPrFilters = useBranchesForPrFilters();
  const isLoading = useSelector(
    (s: RootState) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const isErrored = useSelector(
    (s: RootState) => s.doraMetrics.requests?.metrics_summary === FetchState.FAILURE
  );

  const firstLoadDone = useSelector((s: RootState) => s.doraMetrics.firstLoadDone);

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
      
      {/* Statistics Cards */}
      <Card sx={{ p: 3, borderRadius: 2 }}>
        <FlexBox col gap={3}>
          <FlexBox gap={2} alignCenter>
            <Line white huge bold>
              Contributor Statistics
            </Line>
          </FlexBox>
          <ContributorStatsCards />
        </FlexBox>
      </Card>
      
      <Divider />
      
      {/* Contributors Table */}
      <FlexBox col gap2 mt={2}>
        <ContributorPerformanceSection />
      </FlexBox>
      
      <Divider />
    </FlexBox>
  );
}; 