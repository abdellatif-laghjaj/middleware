import { FC } from 'react';

import { ContributorPerformanceTable } from '@/components/ContributorPerformanceTable';
import { useContributorData } from '@/hooks/useContributorData';

export const ContributorPerformanceSection: FC = () => {
  const { contributors, isLoading, error } = useContributorData();

  return (
    <div id="contributor-performance-section">
      <ContributorPerformanceTable contributors={contributors} isLoading={isLoading} />
    </div>
  );
};