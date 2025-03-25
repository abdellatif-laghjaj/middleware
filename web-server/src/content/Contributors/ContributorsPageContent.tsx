import { PeopleAltRounded } from '@mui/icons-material';
import { Divider } from '@mui/material';
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

import { ContributorPerformanceSection } from '../DoraMetrics/ContributorPerformanceSection';

export const ContributorsPageContent: FC = () => {
  const dispatch = useDispatch();
  const { orgId, integrationList } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const branchPayloadForPrFilters = useBranchesForPrFilters();
  const isLoading = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const isErrored = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary === FetchState.FAILURE
  );

  const firstLoadDone = useSelector((s) => s.doraMetrics.firstLoadDone);

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
    <FlexBox col gap2>
      <FixedContentRefreshLoader show={isLoading} />
      <FlexBox col gap2 mt={2}>
        <FlexBox gap={2} alignCenter>
          <PeopleAltRounded />
          <Line white huge bold>
            Contributor Performance
          </Line>
        </FlexBox>
        <ContributorPerformanceSection />
      </FlexBox>
      <Divider />
    </FlexBox>
  );
}; 