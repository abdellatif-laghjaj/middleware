import React, { useEffect } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { Authenticated } from '@/components/Authenticated';
import { FlexBox } from '@/components/FlexBox';
import Loader from '@/components/Loader';
import { FetchState } from '@/constants/ui-states';
import { useRedirectWithSession } from '@/constants/useRoute';
import { ContributorsBody } from '@/content/Contributors';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useSelector, useDispatch } from '@/store';
import { PageLayout } from '@/types/resources';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';

function Page() {
  useRedirectWithSession();
  const metricsRequestState = useSelector(
    (s) => s.doraMetrics.requests?.metrics_summary
  );
  const isLoading = metricsRequestState === FetchState.REQUEST;
  const { integrationList, orgId } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const dispatch = useDispatch();
  
  // Initial data load and handle team changes  
  useEffect(() => {
    if (singleTeamId && integrationList.length > 0) {
      dispatch(
        fetchTeamDoraMetrics({
          orgId,
          teamId: singleTeamId,
          fromDate: dates.start,
          toDate: dates.end,
          force: true // Always force refresh when team changes
        })
      );
    }
  }, [singleTeamId, integrationList.length, dispatch, orgId, dates]);

  return (
    <PageWrapper
      title={
        <FlexBox gap1 alignCenter>
          Contributors
        </FlexBox>
      }
      pageTitle="Contributors"
      isLoading={false} // Don't use the page-level loading indicator for team switching
      teamDateSelectorMode="single"
    >
      {integrationList.length > 0 ? <ContributorsBody /> : <Loader />}
    </PageWrapper>
  );
}

Page.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Page; 