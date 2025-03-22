import { FC, useCallback } from 'react';
import { Box, Card, IconButton, Tooltip, useTheme } from '@mui/material';
import { Refresh, Info } from '@mui/icons-material';

import { ContributorPerformanceTable } from '@/components/ContributorPerformanceTable';
import { useContributorData } from '@/hooks/useContributorData';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';

export const ContributorPerformanceSection: FC = () => {
  const { contributors, isLoading, error, lastUpdated, hasGithub, refreshData } = useContributorData();
  const theme = useTheme();
  
  const handleRefresh = useCallback(() => {
    refreshData();
  }, [refreshData]);

  return (
    <Box id="contributor-performance-section">
      <Card sx={{ p: 2, borderRadius: 1, mb: 2 }}>
        <FlexBox justifyBetween alignCenter mb={2}>
          <FlexBox alignCenter gap={1}>
            <Line big bold white>
              Contributor Insights
            </Line>
            <Tooltip title="Shows contribution metrics from all team members, aggregating work across all branches. Bot accounts are excluded.">
              <Info fontSize="small" color="info" />
            </Tooltip>
          </FlexBox>
          
          <Tooltip title="Refresh contributor data">
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </FlexBox>
        
        <ContributorPerformanceTable 
          contributors={contributors} 
          isLoading={isLoading} 
          lastUpdated={lastUpdated}
          hasGithub={hasGithub}
        />
      </Card>
    </Box>
  );
};