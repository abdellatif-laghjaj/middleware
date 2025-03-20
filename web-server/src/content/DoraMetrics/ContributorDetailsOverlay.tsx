import { FC, useMemo } from 'react';
import { Avatar, Box, Divider, Grid, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { 
  Person, 
  Code, 
  Timeline, 
  AccessTime, 
  Build, 
  BugReport, 
  CloudUpload, 
  CheckCircle, 
  Error as ErrorIcon,
  GitHub
} from '@mui/icons-material';

import { Chart2, ChartOptions } from '@/components/Chart2';
import { FlexBox } from '@/components/FlexBox';
import { ContributorData } from '@/hooks/useContributorData';
import { SimpleAvatar } from '@/components/SimpleAvatar';
import { getGHAvatar } from '@/utils/user';
import { useSelector } from '@/store';
import { format } from 'date-fns';
import { getDurationString } from '@/utils/date';

interface ContributorDetailsOverlayProps {
  contributor: ContributorData;
  hasGithub?: boolean;
}

const chartOptions: ChartOptions = {
  options: {
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time Period'
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count'
        }
      }
    },
    plugins: {
      tooltip: {
        enabled: true
      },
      zoom: {
        zoom: {
          drag: {
            enabled: false
          }
        }
      }
    }
  }
};

export const ContributorDetailsOverlay: FC<ContributorDetailsOverlayProps> = ({ 
  contributor,
  hasGithub = false
}) => {
  const theme = useTheme();
  
  // Chart data with useMemo for performance
  const commitHistorySeries = useMemo(() => [
    {
      label: 'Commits',
      data: [5, 8, 12, 4, 7, 9, 6, 11, 3, 8, 10, 7],
      backgroundColor: alpha(theme.colors.success.main, 0.2),
      borderColor: theme.colors.success.main,
      borderWidth: 2,
      tension: 0.4
    }
  ], [theme.colors.success.main]);

  const commitHistoryLabels = useMemo(() => {
    // Generate last 12 weeks as labels
    const labels = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      labels.push(format(date, 'MMM d'));
    }
    return labels;
  }, []);

  const codeChangesSeries = useMemo(() => [
    {
      label: 'Additions',
      data: [120, 150, 180, 90, 110, 200, 140, 160, 130, 170, 190, 100],
      backgroundColor: alpha(theme.colors.success.main, 0.2),
      borderColor: theme.colors.success.main,
      borderWidth: 2,
      tension: 0.4
    },
    {
      label: 'Deletions',
      data: [80, 100, 120, 60, 70, 130, 90, 110, 80, 120, 140, 70],
      backgroundColor: alpha(theme.colors.error.main, 0.2),
      borderColor: theme.colors.error.main,
      borderWidth: 2,
      tension: 0.4
    }
  ], [theme.colors.success.main, theme.colors.error.main]);

  // Get data from store
  const allPrs = useSelector(state => state.doraMetrics.summary_prs || []);
  const allDeployments = useSelector(state => state.doraMetrics.all_deployments || []);
  
  // Filter by contributor - memoized to prevent unnecessary processing
  const contributorPrs = useMemo(() => {
    return allPrs.filter(pr => 
      pr.author?.username === contributor.username
    ).slice(0, 5);
  }, [allPrs, contributor.username]);

  const contributorDeployments = useMemo(() => {
    return allDeployments.filter(deployment => 
      deployment.event_actor?.username === contributor.username
    ).slice(0, 5);
  }, [allDeployments, contributor.username]);

  // Table styles for reuse
  const tableStyles = {
    tableStyle: { width: '100%', borderCollapse: 'collapse' as const },
    headerCellStyle: { 
      textAlign: 'left' as const, 
      padding: '8px', 
      borderBottom: `1px solid ${theme.colors.secondary.lighter}` 
    },
    cellStyle: { 
      padding: '8px', 
      borderBottom: `1px solid ${theme.colors.secondary.lighter}` 
    }
  };

  return (
    <FlexBox col gap={3} p={2}>
      {/* Contributor Header */}
      <FlexBox alignCenter gap={2}>
        {hasGithub ? (
          <Avatar 
            src={contributor.avatarUrl || getGHAvatar(contributor.username)}
            alt={contributor.name} 
            sx={{ width: 64, height: 64 }}
          />
        ) : (
          <SimpleAvatar
            name={contributor.name || contributor.username}
            size={theme.spacing(8)}
            url={contributor.avatarUrl || getGHAvatar(contributor.username)}
          />
        )}
        <FlexBox col>
          <Typography variant="h4">{contributor.name}</Typography>
          <Typography variant="subtitle1" color="textSecondary">@{contributor.username}</Typography>
        </FlexBox>
      </FlexBox>

      <Divider />

      {/* Contributor Stats Summary */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: alpha(theme.colors.primary.main, 0.05) }}>
            <FlexBox col alignCenter>
              <Timeline color="primary" fontSize="large" />
              <Typography variant="h6">{contributor.contributions}</Typography>
              <Typography variant="body2">Total Commits</Typography>
            </FlexBox>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: alpha(theme.colors.info.main, 0.05) }}>
            <FlexBox col alignCenter>
              <Code color="info" fontSize="large" />
              <Typography variant="h6">{contributor.prs}</Typography>
              <Typography variant="body2">Pull Requests</Typography>
            </FlexBox>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: alpha(theme.colors.success.main, 0.05) }}>
            <FlexBox col alignCenter>
              <CloudUpload color="success" fontSize="large" />
              <Typography variant="h6">{contributor.deploymentCount}</Typography>
              <Typography variant="body2">Deployments</Typography>
            </FlexBox>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, bgcolor: alpha(theme.colors.warning.main, 0.05) }}>
            <FlexBox col alignCenter>
              <BugReport color="warning" fontSize="large" />
              <Typography variant="h6">{contributor.incidentCount}</Typography>
              <Typography variant="body2">Incidents</Typography>
            </FlexBox>
          </Paper>
        </Grid>
      </Grid>

      {/* Activity Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Commit Activity (Last 12 Weeks)</Typography>
            <Box height={300}>
              <Chart2
                id="contributor-commit-history"
                type="line"
                series={commitHistorySeries}
                labels={commitHistoryLabels}
                options={chartOptions}
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Code Changes (Last 12 Weeks)</Typography>
            <Box height={300}>
              <Chart2
                id="contributor-code-changes"
                type="line"
                series={codeChangesSeries}
                labels={commitHistoryLabels}
                options={chartOptions}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FlexBox col alignCenter p={2}>
              <AccessTime color="primary" fontSize="large" />
              <Typography variant="h6">{contributor.leadTimeFormatted || 'N/A'}</Typography>
              <Typography variant="body2">Avg. Lead Time</Typography>
            </FlexBox>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FlexBox col alignCenter p={2}>
              <AccessTime color="info" fontSize="large" />
              <Typography variant="h6">{contributor.mergeTimeFormatted || 'N/A'}</Typography>
              <Typography variant="body2">Avg. Merge Time</Typography>
            </FlexBox>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FlexBox col alignCenter p={2}>
              <Build color="warning" fontSize="large" />
              <Typography variant="h6">{contributor.reworkTimeFormatted || 'N/A'}</Typography>
              <Typography variant="body2">Avg. Rework Time</Typography>
            </FlexBox>
          </Grid>
        </Grid>
      </Paper>

      {/* Recent Pull Requests */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Recent Pull Requests</Typography>
        {contributorPrs.length > 0 ? (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={tableStyles.tableStyle}>
              <thead>
                <tr>
                  <th style={tableStyles.headerCellStyle}>Title</th>
                  <th style={tableStyles.headerCellStyle}>Status</th>
                  <th style={tableStyles.headerCellStyle}>Created</th>
                  <th style={tableStyles.headerCellStyle}>Lead Time</th>
                </tr>
              </thead>
              <tbody>
                {contributorPrs.map((pr) => (
                  <tr key={pr.id}>
                    <td style={tableStyles.cellStyle}>
                      <Tooltip title={pr.title}>
                        <Typography noWrap sx={{ maxWidth: 250 }}>{pr.title}</Typography>
                      </Tooltip>
                    </td>
                    <td style={tableStyles.cellStyle}>
                      <FlexBox alignCenter gap={1}>
                        {pr.state === 'merged' ? (
                          <CheckCircle fontSize="small" color="success" />
                        ) : pr.state === 'closed' ? (
                          <ErrorIcon fontSize="small" color="error" />
                        ) : (
                          <Timeline fontSize="small" color="info" />
                        )}
                        <Typography>{pr.state}</Typography>
                      </FlexBox>
                    </td>
                    <td style={tableStyles.cellStyle}>
                      {pr.created_at ? format(new Date(pr.created_at), 'MMM d, yyyy') : 'N/A'}
                    </td>
                    <td style={tableStyles.cellStyle}>
                      {pr.lead_time ? getDurationString(pr.lead_time) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        ) : (
          <FlexBox col alignCenter justifyCenter p={4}>
            <GitHub sx={{ fontSize: 40, opacity: 0.3, mb: 2 }} />
            <Typography variant="body1">No pull requests found</Typography>
          </FlexBox>
        )}
      </Paper>

      {/* Recent Deployments */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Recent Deployments</Typography>
        {contributorDeployments.length > 0 ? (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={tableStyles.tableStyle}>
              <thead>
                <tr>
                  <th style={tableStyles.headerCellStyle}>Environment</th>
                  <th style={tableStyles.headerCellStyle}>Status</th>
                  <th style={tableStyles.headerCellStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {contributorDeployments.map((deployment) => (
                  <tr key={deployment.id}>
                    <td style={tableStyles.cellStyle}>
                      {deployment.environment || 'Unknown'}
                    </td>
                    <td style={tableStyles.cellStyle}>
                      <FlexBox alignCenter gap={1}>
                        {deployment.status === 'success' ? (
                          <CheckCircle fontSize="small" color="success" />
                        ) : (
                          <ErrorIcon fontSize="small" color="error" />
                        )}
                        <Typography>{deployment.status}</Typography>
                      </FlexBox>
                    </td>
                    <td style={tableStyles.cellStyle}>
                      {deployment.created_at ? format(new Date(deployment.created_at), 'MMM d, yyyy') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        ) : (
          <FlexBox col alignCenter justifyCenter p={4}>
            <CloudUpload sx={{ fontSize: 40, opacity: 0.3, mb: 2 }} />
            <Typography variant="body1">No deployments found</Typography>
          </FlexBox>
        )}
      </Paper>
    </FlexBox>
  );
};