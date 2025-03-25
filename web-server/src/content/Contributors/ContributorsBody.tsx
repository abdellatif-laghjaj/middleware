import React, { FC, useEffect, useState, useRef } from 'react';
import { Box, Card, IconButton, Tooltip, Typography, useTheme, Divider, Chip, Skeleton, Alert, CircularProgress } from '@mui/material';
import { PeopleAltRounded, Refresh, Info, Groups } from '@mui/icons-material';

import { ContributorPerformanceTable } from '@/components/ContributorPerformanceTable';
import { useContributorData } from '@/hooks/useContributorData';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { FixedContentRefreshLoader } from '@/components/FixedContentRefreshLoader/FixedContentRefreshLoader';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { useDispatch, useSelector } from '@/store';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useAuth } from '@/hooks/useAuth';
import { FetchState } from '@/constants/ui-states';

export const ContributorsBody: FC = () => {
  const { contributors, isLoading, error, lastUpdated, hasGithub, refresh } = useContributorData();
  const theme = useTheme();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const teams = useSelector(s => s.team.teams || []);
  const currentTeam = teams.find(team => team.id === singleTeamId);
  const [dataVersion, setDataVersion] = useState(0);
  const [teamSwitching, setTeamSwitching] = useState(false);
  const previousTeamId = useRef<string | null>(null);
  
  // Get the metrics request state to properly detect loading
  const metricsRequestState = useSelector(s => s.doraMetrics.requests?.metrics_summary);
  const isMetricsLoading = metricsRequestState === FetchState.REQUEST;
  
  // Listen for team changes and refresh data when team changes
  useEffect(() => {
    if (singleTeamId && previousTeamId.current !== singleTeamId) {
      setTeamSwitching(true);
      previousTeamId.current = singleTeamId;
      
      // Refetch data for the new team
      dispatch(
        fetchTeamDoraMetrics({
          orgId,
          teamId: singleTeamId,
          fromDate: dates.start,
          toDate: dates.end,
          force: true // Add force flag to ensure fresh data
        })
      );
      
      // Set data version to ensure table refreshes
      setDataVersion(prev => prev + 1);
    }
  }, [singleTeamId, dates, dispatch, orgId]);
  
  // Track when metrics loading is complete
  useEffect(() => {
    if (teamSwitching) {
      // Use a more robust method to determine when loading is complete
      if (!isMetricsLoading) {
        const timer = setTimeout(() => {
          setTeamSwitching(false);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isMetricsLoading, teamSwitching]);

  // Handler for manual refresh
  const handleRefresh = () => {
    setTeamSwitching(true);
    dispatch(
      fetchTeamDoraMetrics({
        orgId,
        teamId: singleTeamId,
        fromDate: dates.start,
        toDate: dates.end
      })
    );
    setDataVersion(prev => prev + 1);
  };

  const showLoading = teamSwitching || isLoading || isMetricsLoading;

  return (
    <FlexBox col gap2>
      <FixedContentRefreshLoader show={isMetricsLoading} />
      
      {teamSwitching && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Switching to {currentTeam?.name || 'new team'} data... Please wait.
        </Alert>
      )}
      
      <FlexBox gap={2} alignCenter mb={2}>
        <PeopleAltRounded />
        <Line white huge bold>
          Contributors Performance
        </Line>
        {currentTeam && (
          <Chip 
            icon={<Groups />} 
            label={`Team: ${currentTeam.name}`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ ml: 2 }}
          />
        )}
      </FlexBox>
      
      <Divider />
      
      <Box id="contributors-performance-section" mt={2}>
        <Card sx={{ p: 2, borderRadius: 1, mb: 2 }}>
          <FlexBox justifyBetween alignCenter mb={2}>
            <FlexBox alignCenter gap={1}>
              <Line big bold white>
                Team Contributors Insights
              </Line>
              <Tooltip title="Shows contribution metrics from all team members, aggregating work across all branches. Bot accounts are excluded.">
                <Info fontSize="small" color="info" />
              </Tooltip>
            </FlexBox>
            
            {!showLoading && (
              <Tooltip title="Refresh contributor data">
                <IconButton 
                  size="small" 
                  onClick={handleRefresh}
                >
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </FlexBox>
          
          <Typography variant="body2" color="textSecondary" paragraph>
            This table displays performance metrics for all contributors in your team. 
            Click on a contributor to see detailed contribution analysis and metrics breakdown.
            {currentTeam && (
              <> Currently viewing <Box component="span" sx={{ fontWeight: 'bold', color: theme.colors.primary.main }}>{currentTeam.name}</Box> team.</>
            )}
          </Typography>
          
          {showLoading ? (
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Loading contributor data for {currentTeam?.name || 'team'}...
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Grabbing data. Taking a moment to refresh the data
              </Typography>
            </Box>
          ) : (
            <ContributorPerformanceTable 
              key={`contributors-${singleTeamId}-${dataVersion}`}
              contributors={contributors} 
              isLoading={false} 
              lastUpdated={lastUpdated}
              hasGithub={hasGithub}
            />
          )}
        </Card>
      </Box>
    </FlexBox>
  );
}; 