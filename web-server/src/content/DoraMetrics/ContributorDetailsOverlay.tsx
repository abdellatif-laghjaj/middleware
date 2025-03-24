import { FC, useMemo } from 'react';
import { 
  Avatar, Box, Button, Chip, Divider, Grid, Paper, Tooltip, 
  Typography, useTheme, LinearProgress, IconButton, Link,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { 
  Timeline, AccessTime, Build, BugReport, CloudUpload, 
  CheckCircle, Error as ErrorIcon, GitHub, OpenInNew,
  TrendingUp, TrendingDown, Commit, CompareArrows
} from '@mui/icons-material';

import { Chart2, ChartOptions } from '@/components/Chart2';
import { FlexBox } from '@/components/FlexBox';
import { ContributorData } from '@/hooks/useContributorData';
import { SimpleAvatar } from '@/components/SimpleAvatar';
import { getGHAvatar } from '@/utils/user';
import { useSelector } from '@/store';
import { format } from 'date-fns';
import { getDurationString } from '@/utils/date';

interface ContributorDetailsProps {
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

export const ContributorDetailsOverlay: FC<ContributorDetailsProps> = ({ 
  contributor,
  hasGithub = false
}) => {
  const theme = useTheme();
  
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

  // Determine if activity is increasing or decreasing based on actual PR and commit data
  const isActivityIncreasing = useMemo(() => {
    // If more than average PRs in the last 30 days, consider activity increasing
    if (!allPrs || !allPrs.length) return null;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const sixtyDaysAgo = new Date(thirtyDaysAgo);
    sixtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPrs = allPrs.filter(pr => 
      pr.author?.username === contributor.username && 
      new Date(pr.created_at) >= thirtyDaysAgo
    );
    
    const olderPrs = allPrs.filter(pr => 
      pr.author?.username === contributor.username && 
      new Date(pr.created_at) >= sixtyDaysAgo &&
      new Date(pr.created_at) < thirtyDaysAgo
    );
    
    // Return null if no data to compare
    if (recentPrs.length === 0 && olderPrs.length === 0) return null;
    
    return recentPrs.length >= olderPrs.length;
  }, [allPrs, contributor.username]);

  // Chart data based on real PR history and commit counts
  const commitHistorySeries = useMemo(() => {
    if (!allPrs || !allPrs.length) {
      return [{
        label: 'Commits',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: alpha(theme.colors.success.main, 0.2),
        borderColor: theme.colors.success.main,
        borderWidth: 2,
        tension: 0.4
      }];
    }
    
    // Create a 12-week array for commit counts
    const commitData = Array(12).fill(0);
    const now = new Date();
    
    // Count actual commits per week for the last 12 weeks
    allPrs.forEach(pr => {
      if (pr.author?.username === contributor.username) {
        const prDate = new Date(pr.created_at);
        const diffWeeks = Math.floor((now.getTime() - prDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        
        if (diffWeeks >= 0 && diffWeeks < 12) {
          // We're counting backwards, so week 0 is the most recent
          // Use the actual commit count from the PR if available
          const commitCount = pr.commits || 1; // Default to 1 if commits not available
          commitData[11 - diffWeeks] += commitCount;
        }
      }
    });
    
    return [{
      label: 'Commits',
      data: commitData,
      backgroundColor: alpha(theme.colors.success.main, 0.2),
      borderColor: theme.colors.success.main,
      borderWidth: 2,
      tension: 0.4
    }];
  }, [allPrs, contributor.username, theme.colors.success.main]);

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

  // Helper to open GitHub links
  const openGitHubLink = (url) => {
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Calculate performance score based on lead time, merge time and rework time
  const performanceScore = useMemo(() => {
    if (!contributor) return 0;
    
    let score = 0;
    let factors = 0;
    
    // Lead time - lower is better (target: under 1 day)
    if (contributor.leadTime) {
      const leadTimeHours = contributor.leadTime / (1000 * 60 * 60);
      // 24 hours or less is optimal
      const leadTimeScore = Math.max(0, 100 - (leadTimeHours / 24 * 50));
      score += leadTimeScore;
      factors++;
    }
    
    // Merge time - lower is better (target: under 4 hours)
    if (contributor.mergeTime) {
      const mergeTimeHours = contributor.mergeTime / (1000 * 60 * 60);
      // 4 hours or less is optimal
      const mergeTimeScore = Math.max(0, 100 - (mergeTimeHours / 4 * 50));
      score += mergeTimeScore;
      factors++;
    }
    
    // First-time approval rate - higher is better
    if (contributor.firstTimeApprovalRate) {
      score += contributor.firstTimeApprovalRate;
      factors++;
    }
    
    return factors ? Math.round(score / factors) : 0;
  }, [contributor]);

  // 1. For the activity level, ensure it's using real data
const activityLevel = useMemo(() => {
  // Base on actual contribution count from the data
  const contributions = contributor.contributions || 0;
  // Scale appropriately based on real data
  return Math.min(100, Math.max(10, (contributions / 200) * 100));
}, [contributor.contributions]);

// 2. For the activity trend, use real data comparison
const activityTrend = useMemo(() => {
  // Get PRs from last 30 days vs previous 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const sixtyDaysAgo = new Date(thirtyDaysAgo);
  sixtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentPrs = allPrs.filter(pr => 
    pr.author?.username === contributor.username && 
    new Date(pr.created_at) >= thirtyDaysAgo
  );
  
  const olderPrs = allPrs.filter(pr => 
    pr.author?.username === contributor.username && 
    new Date(pr.created_at) >= sixtyDaysAgo &&
    new Date(pr.created_at) < thirtyDaysAgo
  );
  
  // If no data to compare, return null
  if (recentPrs.length === 0 && olderPrs.length === 0) return null;
  
  return recentPrs.length >= olderPrs.length;
}, [allPrs, contributor.username]);

// 3. Create real data for the additions and deletions chart
const codeChangesSeries = useMemo(() => {
  // Generate weekly data points for the last 12 weeks
  const weeks = 12;
  const additionsByWeek = Array(weeks).fill(0);
  const deletionsByWeek = Array(weeks).fill(0);
  
  // Get current date
  const now = new Date();
  
  // Filter PRs for this contributor
  const contributorPrs = allPrs.filter(pr => 
    pr.author?.username === contributor.username
  );
  
  // Aggregate data by week
  contributorPrs.forEach(pr => {
    const prDate = new Date(pr.created_at);
    const weekDiff = Math.floor((now - prDate) / (7 * 24 * 60 * 60 * 1000));
    
    if (weekDiff >= 0 && weekDiff < weeks) {
      const weekIndex = weeks - 1 - weekDiff;
      // Ensure we're using the actual additions/deletions from the PR data
      const additions = typeof pr.additions === 'number' ? pr.additions : 0;
      const deletions = typeof pr.deletions === 'number' ? pr.deletions : 0;
      
      additionsByWeek[weekIndex] += additions;
      deletionsByWeek[weekIndex] += deletions;
    }
  });
  
  return [
    {
      label: 'Additions',
      data: additionsByWeek,
      backgroundColor: alpha(theme.colors.success.main, 0.2),
      borderColor: theme.colors.success.main,
      borderWidth: 2,
      tension: 0.4
    },
    {
      label: 'Deletions',
      data: deletionsByWeek,
      backgroundColor: alpha(theme.colors.error.main, 0.2),
      borderColor: theme.colors.error.main,
      borderWidth: 2,
      tension: 0.4
    }
  ];
}, [allPrs, contributor.username, theme.colors]);

  return (
  <FlexBox col gap={3} p={2}>
    {/* Contributor Header with GitHub profile link */}
    <FlexBox alignCenter gap={2} mb={3} sx={{ 
      background: alpha(theme.colors.primary.lighter, 0.15),
      borderRadius: '12px',
      p: 2
    }}>
      <Avatar 
        src={contributor.avatarUrl || getGHAvatar(contributor.username)}
        alt={contributor.name} 
        sx={{ width: 70, height: 70 }}
      />
      <FlexBox col flex={1}>
        <Typography variant="h4">{contributor.name}</Typography>
        <FlexBox alignCenter gap={1}>
          <Typography variant="subtitle1" color="textSecondary">@{contributor.username}</Typography>
        </FlexBox>
      </FlexBox>
      
      <Button 
        variant="contained" 
        startIcon={<GitHub />}
        onClick={() => window.open(`https://github.com/${contributor.username}`, '_blank', 'noopener,noreferrer')}
        sx={{ 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }
        }}
      >
        View GitHub Profile
      </Button>
    </FlexBox>

    {/* Activity Level (using real data) */}
    <Paper sx={{ p: 2 }}>
      <FlexBox col gap={1}>
        <FlexBox alignCenter justifyBetween>
          <Typography variant="h6">Activity Level</Typography>
          {activityTrend !== null && (
            <FlexBox alignCenter gap={1}>
              {activityTrend ? (
                <TrendingUp color="success" fontSize="small" />
              ) : (
                <TrendingDown color="error" fontSize="small" />
              )}
              <Typography 
                variant="body2" 
                color={activityTrend ? "success.main" : "error.main"}
              >
                {activityTrend ? "Increasing" : "Decreasing"}
              </Typography>
            </FlexBox>
          )}
        </FlexBox>
        <LinearProgress 
          variant="determinate" 
          value={activityLevel} 
          sx={{ 
            height: 10, 
            borderRadius: 5,
            bgcolor: alpha(theme.colors.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              bgcolor: theme.colors.primary.main
            }
          }} 
        />
        <FlexBox alignCenter justifyBetween>
          <Typography variant="body2">Low</Typography>
          <Typography variant="body2">High</Typography>
        </FlexBox>
      </FlexBox>
    </Paper>

    <Divider />

    {/* Contributor Stats Summary with real data */}
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, bgcolor: alpha(theme.colors.primary.main, 0.05) }}>
          <FlexBox col alignCenter>
            <FlexBox alignCenter>
              <Commit color="primary" fontSize="large" />
              {activityTrend !== null && (
                <Box sx={{ ml: 0.5 }}>
                  {activityTrend ? (
                    <TrendingUp color="success" fontSize="small" />
                  ) : (
                    <TrendingDown color="error" fontSize="small" />
                  )}
                </Box>
              )}
            </FlexBox>
            <Typography variant="h6">{contributor.contributions || 0}</Typography>
            <Typography variant="body2">Total Commits</Typography>
          </FlexBox>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, bgcolor: alpha(theme.colors.info.main, 0.05) }}>
          <FlexBox col alignCenter>
            <CompareArrows color="info" fontSize="large" />
            <Typography variant="h6">{contributor.prs || 0}</Typography>
            <Typography variant="body2">Pull Requests</Typography>
          </FlexBox>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, bgcolor: alpha(theme.colors.success.main, 0.05) }}>
          <FlexBox col alignCenter>
            <CloudUpload color="success" fontSize="large" />
            <Typography variant="h6">{contributor.deploymentCount || 0}</Typography>
            <Typography variant="body2">Deployments</Typography>
          </FlexBox>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Paper sx={{ p: 2, bgcolor: alpha(theme.colors.warning.main, 0.05) }}>
          <FlexBox col alignCenter>
            <BugReport color="warning" fontSize="large" />
            <Typography variant="h6">{contributor.incidentCount || 0}</Typography>
            <Typography variant="body2">Incidents</Typography>
          </FlexBox>
        </Paper>
      </Grid>
    </Grid>

    {/* Commit Activity Chart */}
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

    {/* Code Changes Chart (Additions/Deletions) */}
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

    {/* Performance Metrics */}
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <FlexBox col alignCenter p={2}>
            <Tooltip title="Time from first commit to deployment">
              <AccessTime color="primary" fontSize="large" />
            </Tooltip>
            <Typography variant="h6">{contributor.leadTimeFormatted || 'N/A'}</Typography>
            <Typography variant="body2">Avg. Lead Time</Typography>
          </FlexBox>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FlexBox col alignCenter p={2}>
            <Tooltip title="Time from PR opened to merged">
              <AccessTime color="info" fontSize="large" />
            </Tooltip>
            <Typography variant="h6">{contributor.mergeTimeFormatted || 'N/A'}</Typography>
            <Typography variant="body2">Avg. Merge Time</Typography>
          </FlexBox>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FlexBox col alignCenter p={2}>
            <Tooltip title="Time spent on code review changes">
              <Build color="warning" fontSize="large" />
            </Tooltip>
            <Typography variant="h6">{contributor.reworkTimeFormatted || 'N/A'}</Typography>
            <Typography variant="body2">Avg. Rework Time</Typography>
          </FlexBox>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FlexBox col alignCenter p={2}>
            <Tooltip title="Percentage of PRs merged on first review">
              <CheckCircle color="success" fontSize="large" />
            </Tooltip>
            <Typography variant="h6">{contributor.firstTimeApprovalRate || '0'}%</Typography>
            <Typography variant="body2">First Approval Rate</Typography>
          </FlexBox>
        </Grid>
      </Grid>
    </Paper>

    {/* Recent Pull Requests with PR number */}
    <Paper sx={{ p: 2, borderRadius: '12px', boxShadow: theme.customShadows?.z1 || '0 2px 8px rgba(0,0,0,0.08)' }}>
      <FlexBox justifyBetween alignCenter mb={2}>
        <Typography variant="h6">Recent Pull Requests</Typography>
        <Button 
          variant="outlined" 
          size="small"
          startIcon={<GitHub />}
          onClick={() => window.open(`https://github.com/${contributor.username}?tab=repositories`, '_blank', 'noopener,noreferrer')}
          sx={{ borderRadius: '8px' }}
        >
          View All PRs
        </Button>
      </FlexBox>
      
      {contributorPrs.length > 0 ? (
        <TableContainer sx={{ maxHeight: '400px' }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: alpha(theme.colors.primary.main, 0.08) }}>
              <TableRow>
                <TableCell>PR</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Changes</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Created</TableCell>
                <TableCell align="right">Lead Time</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contributorPrs.map((pr) => {
                // Ensure we have a valid URL
                const prUrl = pr.html_url || pr.pr_link || `https://github.com/${pr.repo_name}/pull/${pr.number}`;
                
                return (
                  <TableRow 
                    key={pr.id} 
                    hover
                    sx={{ 
                      '&:hover': {
                        backgroundColor: alpha(theme.colors.primary.lighter, 0.15),
                      }
                    }}
                  >
                    <TableCell>
                      <Link 
                        href={prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5,
                          fontWeight: 'bold',
                          color: theme.colors.primary.main,
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        <GitHub fontSize="small" color="primary" />
                        #{pr.number || '?'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={pr.title || ''}>
                        <Typography 
                          noWrap 
                          sx={{ 
                            maxWidth: 250,
                            cursor: 'pointer',
                            '&:hover': { color: theme.colors.primary.main }
                          }}
                          onClick={() => window.open(prUrl, '_blank', 'noopener,noreferrer')}
                        >
                          {pr.title}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`${pr.additions || 0} additions, ${pr.deletions || 0} deletions, ${pr.changed_files || 0} files changed`}>
                        <Box>
                          <FlexBox gap={1}>
                            <span style={{ color: theme.colors.success.main }}>+{pr.additions || 0}</span>
                            <span style={{ color: theme.colors.error.main }}>-{pr.deletions || 0}</span>
                          </FlexBox>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={getStatusLabel(pr.state)}
                        color={getStatusColor(pr.state)}
                        icon={getStatusIcon(pr.state)}
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {pr.created_at ? format(new Date(pr.created_at), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      {pr.lead_time ? getDurationString(pr.lead_time) : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open PR in GitHub">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => window.open(prUrl, '_blank', 'noopener,noreferrer')}
                          sx={{ 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            '&:hover': {
                              backgroundColor: alpha(theme.colors.primary.main, 0.1),
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s'
                          }}
                        >
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
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
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ backgroundColor: alpha(theme.colors.primary.main, 0.08) }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contributorDeployments.map((deployment) => (
                <TableRow key={deployment.id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">{deployment.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={deployment.environment || 'Unknown'}
                      size="small"
                      color={getEnvironmentColor(deployment.environment)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={deployment.status || 'unknown'}
                      color={deployment.status === 'success' ? 'success' : 'error'}
                      icon={deployment.status === 'success' ? 
                        <CheckCircle fontSize="small" /> : 
                        <ErrorIcon fontSize="small" />}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {deployment.created_at ? format(new Date(deployment.created_at), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    {deployment.url ? (
                      <Tooltip title="View deployment details">
                        <IconButton 
                          size="small"
                          onClick={() => openGitHubLink(deployment.url)}
                          color="primary"
                        >
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <IconButton size="small" disabled>
                        <OpenInNew fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <FlexBox col alignCenter justifyCenter p={4}>
          <CloudUpload sx={{ fontSize: 40, opacity: 0.3, mb: 2 }} />
          <Typography variant="body1">No deployments found</Typography>
        </FlexBox>
      )}
    </Paper>

    {/* Add smooth transitions */}
    <style jsx global>{`
      .MuiTableRow-root, .MuiLink-root, .MuiButton-root, .MuiIconButton-root {
        transition: all 0.2s ease !important;
      }
      
      .MuiChip-root {
        border-radius: 6px !important;
      }
      
      .MuiButton-root:hover {
        transform: translateY(-1px);
      }
    `}</style>
  </FlexBox>
);
};

// Helper functions for PR status display
const getStatusLabel = (state) => {
  if (!state) return 'unknown';
  
  switch(state.toLowerCase()) {
    case 'merged': return 'Merged';
    case 'open': return 'Open';
    case 'closed': return 'Closed';
    default: return state;
  }
};

const getStatusColor = (state): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  if (!state) return 'default';
  
  switch(state.toLowerCase()) {
    case 'merged': return 'success';
    case 'open': return 'info';
    case 'closed': return 'error';
    default: return 'default';
  }
};

const getStatusIcon = (state) => {
  if (!state) return <Timeline fontSize="small" />;
  
  switch(state.toLowerCase()) {
    case 'merged': return <CheckCircle fontSize="small" />;
    case 'open': return <Timeline fontSize="small" />;
    case 'closed': return <ErrorIcon fontSize="small" />;
    default: return <Timeline fontSize="small" />;
  }
};

// Helper function for environment colors
const getEnvironmentColor = (environment) => {
  if (!environment) return 'default';
  const env = environment.toLowerCase();
  if (env.includes('prod')) return 'error';
  if (env.includes('staging')) return 'warning';
  if (env.includes('dev')) return 'info';
  if (env.includes('test')) return 'success';
  return 'default';
};