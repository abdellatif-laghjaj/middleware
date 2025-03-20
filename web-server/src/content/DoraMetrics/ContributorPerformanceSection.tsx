import { FC } from 'react';
import { Box, Card, IconButton, Tooltip, useTheme } from '@mui/material';
import { Refresh, Info } from '@mui/icons-material';

import { ContributorPerformanceTable } from '@/components/ContributorPerformanceTable';
import { useContributorData } from '@/hooks/useContributorData';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';

export const ContributorPerformanceSection: FC = () => {
  const { contributors, isLoading, error, lastUpdated, hasGithub } = useContributorData();
  const theme = useTheme();

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
          
          {!isLoading && (
            <Tooltip title="Refresh contributor data">
              <IconButton 
                size="small" 
                onClick={() => {
                  // Force a refresh by setting window.location.reload(false)
                  // This is a simple approach - in a real implementation, 
                  // you'd want to refetch just the contributor data
                  window.location.reload();
                }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
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