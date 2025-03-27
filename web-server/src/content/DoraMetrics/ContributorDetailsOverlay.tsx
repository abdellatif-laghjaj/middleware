import { FC, useMemo, useEffect } from 'react';
import { 
  Avatar, Box, Button, Card, Chip, Divider, Grid, Paper, Tooltip, 
  Typography, useTheme, LinearProgress, IconButton, Link,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { 
  Timeline, AccessTime, Build, BugReport, CloudUpload, 
  CheckCircle, Error as ErrorIcon, GitHub, OpenInNew,
  TrendingUp, TrendingDown, Commit, CompareArrows, Code,
  Comment, Group, Speed, Equalizer, AssignmentTurnedIn,
  Assessment, ShowChart, BarChart, ArrowUpward, ArrowDownward,
  AutoAwesome, TipsAndUpdates, ThumbUp, Warning, Lightbulb
} from '@mui/icons-material';

import { Chart2, ChartOptions } from '@/components/Chart2';
import { FlexBox } from '@/components/FlexBox';
import { ContributorData } from '@/hooks/useContributorData';
import { SimpleAvatar } from '@/components/SimpleAvatar';
import { getGHAvatar } from '@/utils/user';
import { useSelector } from '@/store';
import { format } from 'date-fns';
import { getDurationString } from '@/utils/date';
import { useContributorSummary } from '@/hooks/useContributorSummary';
import ReactMarkdown from 'react-markdown';

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
  
  // Get AI summary hook
  const { summary, isLoading, error, generateSummary } = useContributorSummary();
  
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

  // Generate AI summary when the overlay is opened
  useEffect(() => {
    if (contributor) {
      generateSummary(contributor);
    }
  }, [contributor, generateSummary]);

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

  // Helper function for DORA score display
  const getDoraScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success.main;
    if (score >= 60) return theme.colors.info.main;
    if (score >= 40) return theme.colors.warning.main;
    return theme.colors.error.main;
  };

  const getDoraScoreLabel = (score: number) => {
    if (score >= 80) return 'Elite';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  // Helper to format the markdown content with proper styling and organize into cards
  const formatSummaryContent = (content: string) => {
    if (!content) return null;
    
    // Replace markdown headers with styled sections
    const sections = content.split('##').filter(section => section.trim().length > 0);
    
    if (sections.length <= 1) {
      // If no proper sections are found, just render the content as is
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ 
              p: 2.5, 
              height: '100%',
              boxShadow: `0 2px 8px ${alpha(theme.colors.primary.main, 0.1)}`,
              borderRadius: 2
            }}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </Card>
          </Grid>
        </Grid>
      );
    }
    
    // Define icons, colors, and gradient backgrounds for each section type
    const sectionStyles = {
      summary: {
        icon: <AutoAwesome />,
        color: theme.colors.primary.main,
        bgColor: alpha(theme.colors.primary.lighter, 0.15),
        borderColor: alpha(theme.colors.primary.main, 0.2),
        gradient: `linear-gradient(135deg, ${alpha(theme.colors.primary.lighter, 0.2)} 0%, ${alpha(theme.colors.primary.main, 0.05)} 100%)`
      },
      strengths: {
        icon: <ThumbUp />,
        color: theme.colors.success.main,
        bgColor: alpha(theme.colors.success.lighter, 0.15),
        borderColor: alpha(theme.colors.success.main, 0.2),
        gradient: `linear-gradient(135deg, ${alpha(theme.colors.success.lighter, 0.2)} 0%, ${alpha(theme.colors.success.main, 0.05)} 100%)`
      },
      weaknesses: {
        icon: <Warning />,
        color: theme.colors.warning.main,
        bgColor: alpha(theme.colors.warning.lighter, 0.15),
        borderColor: alpha(theme.colors.warning.main, 0.2),
        gradient: `linear-gradient(135deg, ${alpha(theme.colors.warning.lighter, 0.2)} 0%, ${alpha(theme.colors.warning.main, 0.05)} 100%)`
      },
      recommendations: {
        icon: <Lightbulb />,
        color: theme.colors.info.main,
        bgColor: alpha(theme.colors.info.lighter, 0.15),
        borderColor: alpha(theme.colors.info.main, 0.2),
        gradient: `linear-gradient(135deg, ${alpha(theme.colors.info.lighter, 0.2)} 0%, ${alpha(theme.colors.info.main, 0.05)} 100%)`
      }
    };
    
    return (
      <Grid container spacing={2}>
        {sections.map((section, index) => {
          const [title, ...contentParts] = section.split('\n').filter(line => line.trim().length > 0);
          const sectionContent = contentParts.join('\n');
          const titleLower = title.trim().toLowerCase();
          
          let style = sectionStyles.summary;
          
          if (titleLower.includes('strength')) {
            style = sectionStyles.strengths;
          } else if (titleLower.includes('weakness')) {
            style = sectionStyles.weaknesses;
          } else if (titleLower.includes('recommend')) {
            style = sectionStyles.recommendations;
          }
          
          return (
            <Grid item xs={12} md={6} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 2,
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  background: style.gradient,
                  boxShadow: `0 2px 8px ${alpha(style.color, 0.1)}`,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 12px ${alpha(style.color, 0.15)}`
                  },
                  border: `1px solid ${alpha(style.color, 0.1)}`
                }}
              >
                <Box
                  sx={{ 
                    p: 2,
                    pb: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: `1px solid ${alpha(style.color, 0.1)}`
                  }}
                >
                  <Box 
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(style.color, 0.1),
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      mr: 1.5,
                      color: style.color
                    }}
                  >
                    {style.icon}
                  </Box>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontWeight: 600,
                      color: style.color
                    }}
                  >
                    {title.trim()}
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    p: 2, 
                    pt: 1.5,
                    flexGrow: 1,
                    '& ul, & ol': {
                      pl: 2,
                      mb: 0
                    },
                    '& p': {
                      mb: 0.5
                    },
                    '& li': {
                      mb: 0.5
                    }
                  }}
                >
                  <ReactMarkdown>{sectionContent}</ReactMarkdown>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  return (
    <Grid container spacing={3}>
      {/* Profile Section */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <FlexBox gap={3} alignCenter>
            {hasGithub ? (
              <Avatar 
                src={contributor.avatarUrl || getGHAvatar(contributor.username)}
                alt={contributor.name}
                sx={{ width: 80, height: 80 }}
              />
            ) : (
              <SimpleAvatar
                name={contributor.name || contributor.username}
                size={theme.spacing(10)}
                url={contributor.avatarUrl || getGHAvatar(contributor.username)}
              />
            )}
            <FlexBox col>
              <Typography variant="h4">{contributor.name}</Typography>
              <FlexBox alignCenter gap={1}>
                <Typography variant="subtitle1" color="textSecondary">@{contributor.username}</Typography>
                {contributor.doraScore !== undefined && (
                  <Tooltip title="DORA Performance Score">
                    <Chip 
                      size="small" 
                      label={`DORA: ${getDoraScoreLabel(contributor.doraScore)}`} 
                      sx={{ 
                        bgcolor: alpha(getDoraScoreColor(contributor.doraScore), 0.1),
                        color: getDoraScoreColor(contributor.doraScore),
                        fontWeight: 'bold'
                      }}
                      icon={<Speed style={{ color: getDoraScoreColor(contributor.doraScore) }} />}
                    />
                  </Tooltip>
                )}
              </FlexBox>
            </FlexBox>
            <Box sx={{ ml: 'auto' }}>
              <Button 
                variant="outlined" 
                startIcon={<GitHub />}
                onClick={() => window.open(`https://github.com/${contributor.username}`, '_blank')}
              >
                GitHub Profile
              </Button>
            </Box>
          </FlexBox>
        </Paper>
      </Grid>

      {/* Stats Overview */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Contribution Overview</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <FlexBox col alignCenter>
                <FlexBox centered sx={{ 
                  borderRadius: '50%', 
                  bgcolor: alpha(theme.colors.primary.main, 0.1), 
                  width: 48, 
                  height: 48, 
                  mb: 1 
                }}>
                  <Commit color="primary" />
                </FlexBox>
                <Typography variant="h5">{contributor.contributions}</Typography>
                <Typography variant="body2" color="textSecondary">Commits</Typography>
              </FlexBox>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FlexBox col alignCenter>
                <FlexBox centered sx={{ 
                  borderRadius: '50%', 
                  bgcolor: alpha(theme.colors.success.main, 0.1), 
                  width: 48, 
                  height: 48, 
                  mb: 1 
                }}>
                  <Code color="success" />
                </FlexBox>
                <Typography variant="h5">{contributor.prs}</Typography>
                <Typography variant="body2" color="textSecondary">Pull Requests</Typography>
              </FlexBox>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FlexBox col alignCenter>
                <FlexBox centered sx={{ 
                  borderRadius: '50%', 
                  bgcolor: alpha(theme.colors.info.main, 0.1), 
                  width: 48, 
                  height: 48, 
                  mb: 1 
                }}>
                  <Comment color="info" />
                </FlexBox>
                <Typography variant="h5">{contributor.commentCount || 0}</Typography>
                <Typography variant="body2" color="textSecondary">Comments</Typography>
              </FlexBox>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FlexBox col alignCenter>
                <FlexBox centered sx={{ 
                  borderRadius: '50%', 
                  bgcolor: alpha(theme.colors.warning.main, 0.1),
                  width: 48, 
                  height: 48, 
                  mb: 1 
                }}>
                  <CompareArrows color="warning" />
                </FlexBox>
                <Typography variant="h5">{contributor.changeCycles || 0}</Typography>
                <Typography variant="body2" color="textSecondary">Rework Cycles</Typography>
              </FlexBox>
            </Grid>
          </Grid>

          {/* Code Stats */}
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Code Contribution</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  bgcolor: alpha(theme.colors.success.main, 0.05),
                  borderRadius: 1,
                  border: `1px solid ${alpha(theme.colors.success.main, 0.1)}`
                }}
              >
                <FlexBox justifyBetween alignCenter>
                  <Typography variant="body2" color="textSecondary">Additions</Typography>
                  <ArrowUpward fontSize="small" color="success" />
                </FlexBox>
                <Typography variant="h5" sx={{ mt: 1 }}>{contributor.additions.toLocaleString()}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  bgcolor: alpha(theme.colors.error.main, 0.05),
                  borderRadius: 1,
                  border: `1px solid ${alpha(theme.colors.error.main, 0.1)}`
                }}
              >
                <FlexBox justifyBetween alignCenter>
                  <Typography variant="body2" color="textSecondary">Deletions</Typography>
                  <ArrowDownward fontSize="small" color="error" />
                </FlexBox>
                <Typography variant="h5" sx={{ mt: 1 }}>{contributor.deletions.toLocaleString()}</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Recent Activity Chart Title */}
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Recent Commit Activity</Typography>
        </Paper>
      </Grid>

      {/* DORA Metrics Section */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
          <FlexBox gap={1} alignCenter mb={2}>
            <Assessment color="primary" />
            <Typography variant="h6">DORA Performance Metrics</Typography>
          </FlexBox>
          
          {contributor.doraScore !== undefined && (
            <Box sx={{ mb: 3, mt: 2 }}>
              <FlexBox justifyBetween alignCenter mb={1}>
                <Typography variant="body2" color="textSecondary">Overall Score</Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: getDoraScoreColor(contributor.doraScore) }}>
                  {getDoraScoreLabel(contributor.doraScore)}
                </Typography>
              </FlexBox>
              <LinearProgress 
                variant="determinate" 
                value={contributor.doraScore} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  bgcolor: alpha(theme.colors.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getDoraScoreColor(contributor.doraScore)
                  }
                }} 
              />
            </Box>
          )}
          
          {/* DORA Metrics */}
          <Box sx={{ mt: 3 }}>
            <FlexBox justifyBetween alignCenter mb={1.5}>
              <FlexBox gap={1} alignCenter>
                <ShowChart fontSize="small" color="primary" />
                <Typography variant="body2">Deployment Frequency</Typography>
              </FlexBox>
              <Chip 
                size="small" 
                label={contributor.deployFrequency ? 
                  contributor.deployFrequency.toFixed(2) + ' / PR' : 
                  'N/A'
                } 
                sx={{ 
                  bgcolor: alpha(theme.colors.primary.main, 0.1),
                  fontWeight: 'medium'
                }} 
              />
            </FlexBox>
            
            <FlexBox justifyBetween alignCenter mb={1.5}>
              <FlexBox gap={1} alignCenter>
                <AccessTime fontSize="small" color="primary" />
                <Typography variant="body2">Lead Time for Changes</Typography>
              </FlexBox>
              <Chip 
                size="small" 
                label={contributor.leadTimeFormatted || 'N/A'} 
                sx={{ 
                  bgcolor: alpha(theme.colors.primary.main, 0.1),
                  fontWeight: 'medium'
                }} 
              />
            </FlexBox>
            
            <FlexBox justifyBetween alignCenter mb={1.5}>
              <FlexBox gap={1} alignCenter>
                <ErrorIcon fontSize="small" color="primary" />
                <Typography variant="body2">Change Failure Rate</Typography>
              </FlexBox>
              <Chip 
                size="small" 
                label={contributor.changeFailureRate !== undefined ? 
                  (contributor.changeFailureRate * 100).toFixed(1) + '%' : 
                  'N/A'
                } 
                sx={{ 
                  bgcolor: alpha(theme.colors.primary.main, 0.1),
                  fontWeight: 'medium'
                }} 
              />
            </FlexBox>
            
            <FlexBox justifyBetween alignCenter>
              <FlexBox gap={1} alignCenter>
                <BugReport fontSize="small" color="primary" />
                <Typography variant="body2">Time to Restore</Typography>
              </FlexBox>
              <Chip 
                size="small" 
                label={contributor.timeToRestore ? 
                  getDurationString(contributor.timeToRestore) : 
                  'N/A'
                } 
                sx={{ 
                  bgcolor: alpha(theme.colors.primary.main, 0.1),
                  fontWeight: 'medium'
                }} 
              />
            </FlexBox>
          </Box>
        </Paper>
      </Grid>
      
      {/* Commit History Chart */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 0, borderRadius: 2, height: '100%', overflow: 'hidden' }}>
          <Chart2
            height={260}
            id="commit-history-chart"
            type="line"
            options={chartOptions}
            series={commitHistorySeries}
            labels={commitHistoryLabels}
          />
        </Paper>
      </Grid>
      
      {/* Top Reviewers */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
          <FlexBox gap={1} alignCenter mb={2}>
            <Group color="primary" />
            <Typography variant="h6">Top Reviewers</Typography>
          </FlexBox>
          
          {contributor.reviewersList && contributor.reviewersList.length > 0 ? (
            <Box>
              {contributor.reviewersList.map((reviewer, index) => (
                <FlexBox justifyBetween alignCenter key={reviewer.username} mb={1.5}>
                  <FlexBox gap={1.5} alignCenter>
                    <Avatar
                      sx={{ width: 32, height: 32 }}
                      src={getGHAvatar(reviewer.username)}
                      alt={reviewer.name}
                    />
                    <Box>
                      <Typography variant="body2">{reviewer.name}</Typography>
                      <Typography variant="caption" color="textSecondary">@{reviewer.username}</Typography>
                    </Box>
                  </FlexBox>
                  <Chip 
                    size="small" 
                    label={`${reviewer.count} ${reviewer.count === 1 ? 'review' : 'reviews'}`} 
                    sx={{ 
                      bgcolor: alpha(theme.colors.info.main, 0.1),
                      fontWeight: 'medium'
                    }} 
                  />
                </FlexBox>
              ))}
            </Box>
          ) : (
            <FlexBox col alignCenter justifyCenter sx={{ height: 200 }}>
              <Group sx={{ fontSize: 40, color: alpha(theme.colors.primary.main, 0.2), mb: 1 }} />
              <Typography variant="body2" color="textSecondary">
                No reviewer data available
              </Typography>
            </FlexBox>
          )}
        </Paper>
      </Grid>

      {/* Recent PRs */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <FlexBox gap={1} alignCenter mb={3}>
            <Code color="primary" />
            <Typography variant="h6">Recent Pull Requests</Typography>
          </FlexBox>
          
          {contributorPrs.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Repository</TableCell>
                    <TableCell align="right">Commits</TableCell>
                    <TableCell align="right">Changes</TableCell>
                    <TableCell align="right">Status</TableCell>
                    <TableCell align="right">Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contributorPrs.map((pr) => (
                    <TableRow 
                      key={pr.id}
                      hover
                      onClick={() => openGitHubLink(pr.pr_link)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Tooltip title={pr.title}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                            {pr.title || `PR #${pr.number}`}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{pr.repo_name}</TableCell>
                      <TableCell align="right">{pr.commits}</TableCell>
                      <TableCell align="right">+{pr.additions} / -{pr.deletions}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          size="small" 
                          label={pr.state} 
                          color={getStatusColor(pr.state)}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {format(new Date(pr.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <FlexBox col alignCenter justifyCenter sx={{ py: 4 }}>
              <Code sx={{ fontSize: 40, color: alpha(theme.colors.primary.main, 0.2), mb: 1 }} />
              <Typography variant="body2" color="textSecondary">
                No recent pull requests found
              </Typography>
            </FlexBox>
          )}
        </Paper>
      </Grid>
      
      {/* Recent Deployments */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <FlexBox gap={1} alignCenter mb={3}>
            <CloudUpload color="primary" />
            <Typography variant="h6">Recent Deployments</Typography>
          </FlexBox>
          
          {contributorDeployments.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contributorDeployments.map((deployment) => (
                    <TableRow key={deployment.id}>
                      <TableCell>{deployment.deployment_id}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          label={deployment.environment || 'production'} 
                          sx={{ 
                            bgcolor: alpha(getEnvironmentColor(deployment.environment), 0.1),
                            color: getEnvironmentColor(deployment.environment)
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <FlexBox alignCenter gap={0.5}>
                          {getStatusIcon(deployment.status)}
                          <Typography variant="body2">
                            {getStatusLabel(deployment.status)}
                          </Typography>
                        </FlexBox>
                      </TableCell>
                      <TableCell align="right">
                        {format(new Date(deployment.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <FlexBox col alignCenter justifyCenter sx={{ py: 4 }}>
              <CloudUpload sx={{ fontSize: 40, color: alpha(theme.colors.primary.main, 0.2), mb: 1 }} />
              <Typography variant="body2" color="textSecondary">
                No recent deployments found
              </Typography>
            </FlexBox>
          )}
        </Paper>
      </Grid>

      {/* AI-powered summary section */}
      <Grid item xs={12}>
        <Paper 
          sx={{ 
            p: 3, 
            borderRadius: 2,
            boxShadow: `0 0 20px ${alpha(theme.colors.primary.main, 0.08)}`,
            overflow: 'hidden'
          }}
        >
          <FlexBox gap={1.5} alignCenter mb={3}>
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.colors.primary.main, 0.1),
                borderRadius: '50%',
                width: 40,
                height: 40
              }}
            >
              <AutoAwesome color="primary" />
            </Box>
            <Typography variant="h6">AI-Powered Contributor Summary</Typography>
          </FlexBox>
          
          {isLoading ? (
            <FlexBox alignCenter justifyCenter sx={{ py: 4 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress size={36} />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AutoAwesome style={{ fontSize: 16, color: theme.colors.primary.main }} />
                </Box>
              </Box>
              <Typography variant="body2" sx={{ ml: 2, fontWeight: 500 }}>
                Generating summary...
              </Typography>
            </FlexBox>
          ) : error ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : summary ? (
            <Box sx={{ pt: 1 }}>
              {formatSummaryContent(summary)}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No summary available.
            </Typography>
          )}
        </Paper>
      </Grid>
    </Grid>
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