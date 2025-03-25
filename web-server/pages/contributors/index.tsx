import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { Authenticated } from '@/components/Authenticated';
import { FlexBox } from '@/components/FlexBox';
import Loader from '@/components/Loader';
import { FetchState } from '@/constants/ui-states';
import { useRedirectWithSession } from '@/constants/useRoute';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from '@/store';
import { PageLayout } from '@/types/resources';
import { ContributorsPageContent } from '@/content/Contributors/ContributorsPageContent';
import { RootState } from '@/store/types';

function Page() {
  useRedirectWithSession();
  const isLoading = useSelector(
    (s: RootState) => s.doraMetrics.requests?.metrics_summary === FetchState.REQUEST
  );
  const { integrationList } = useAuth();

  return (
    <PageWrapper
      title={
        <FlexBox gap1 alignCenter>
          Contributors
        </FlexBox>
      }
      pageTitle="Contributors"
      isLoading={isLoading}
      teamDateSelectorMode="single"
    >
      {integrationList.length > 0 ? <ContributorsPageContent /> : <Loader />}
    </PageWrapper>
  );
}

Page.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Page; 