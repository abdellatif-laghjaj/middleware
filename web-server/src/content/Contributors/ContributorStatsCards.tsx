import { FC, useMemo } from 'react';
import { Paper, Grid, useTheme, alpha } from '@mui/material';
import { 
  Code, 
  Timeline, 
  Group, 
  AddCircleOutline, 
  RemoveCircleOutline,
  AccessTime,
  Merge
} from '@mui/icons-material';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useContributorData } from '@/hooks/useContributorData';
import { formatNumber } from '@/utils/number';
import { getDurationString } from '@/utils/date';
import { RootState } from '@/store/types';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  accentColor?: string;
}

const StatCard: FC<StatCardProps> = ({ 
  icon, 
  title, 
  value, 
  subtitle, 
  color,
  accentColor
}) => {
  const theme = useTheme();
  const bgColor = color || theme.colors.primary.lighter;
  const iconColor = accentColor || theme.colors.primary.main;
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 2,
        height: '100%',
        border: `1px solid ${alpha(theme.colors.secondary.main, 0.1)}`,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: theme.shadows[2],
          transform: 'translateY(-2px)'
        }
      }}
    >
      <FlexBox col gap={1.5}>
        <FlexBox alignCenter gap={1}>
          <FlexBox
            centered
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              backgroundColor: alpha(bgColor, 0.12),
              color: iconColor
            }}
          >
            {icon}
          </FlexBox>
          <Line medium color="textSecondary">
            {title}
          </Line>
        </FlexBox>
        <FlexBox col gap={0.5}>
          <Line huge bold>
            {value}
          </Line>
          {subtitle && (
            <Line small color="textSecondary">
              {subtitle}
            </Line>
          )}
        </FlexBox>
      </FlexBox>
    </Paper>
  );
};

export const ContributorStatsCards: FC = () => {
  const { contributors } = useContributorData();
  const theme = useTheme();
  
  const stats = useMemo(() => {
    if (!contributors.length) return null;
    
    // Total number of contributors
    const totalContributors = contributors.length;
    
    // Aggregate metrics
    const totalCommits = contributors.reduce((sum, contributor) => sum + contributor.contributions, 0);
    const totalPRs = contributors.reduce((sum, contributor) => sum + contributor.prs, 0);
    const totalAdditions = contributors.reduce((sum, contributor) => sum + contributor.additions, 0);
    const totalDeletions = contributors.reduce((sum, contributor) => sum + contributor.deletions, 0);
    
    // Average metrics
    const avgLeadTime = contributors.reduce((sum, contributor) => sum + (contributor.leadTime || 0), 0) / totalContributors;
    const avgMergeTime = contributors.reduce((sum, contributor) => sum + (contributor.mergeTime || 0), 0) / totalContributors;
    
    return {
      totalContributors,
      totalCommits,
      totalPRs,
      totalAdditions,
      totalDeletions,
      avgLeadTime,
      avgMergeTime
    };
  }, [contributors]);
  
  if (!stats) return null;
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={<Group />}
          title="Contributors"
          value={formatNumber(stats.totalContributors)}
          color={theme.colors.info.lighter}
          accentColor={theme.colors.info.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={<Timeline />}
          title="Total Commits"
          value={formatNumber(stats.totalCommits)}
          subtitle="Across all contributors"
          color={theme.colors.primary.lighter}
          accentColor={theme.colors.primary.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={<Code />}
          title="Pull Requests"
          value={formatNumber(stats.totalPRs)}
          subtitle="Successfully merged"
          color={theme.colors.success.lighter}
          accentColor={theme.colors.success.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={<AddCircleOutline />}
          title="Code Additions"
          value={formatNumber(stats.totalAdditions)}
          subtitle={`${formatNumber(stats.totalDeletions)} lines removed`}
          color={theme.colors.warning.lighter}
          accentColor={theme.colors.warning.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          icon={<RemoveCircleOutline />}
          title="Code Deletions"
          value={formatNumber(stats.totalDeletions)}
          subtitle={`${formatNumber(stats.totalAdditions)} lines added`}
          color={theme.colors.error.lighter}
          accentColor={theme.colors.error.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          icon={<AccessTime />}
          title="Avg. Lead Time"
          value={getDurationString(stats.avgLeadTime) || 'N/A'}
          subtitle="From first commit to deployment"
          color={theme.colors.success.lighter}
          accentColor={theme.colors.success.main}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          icon={<Merge />}
          title="Avg. Merge Time"
          value={getDurationString(stats.avgMergeTime) || 'N/A'}
          subtitle="From PR creation to merge"
          color={theme.colors.info.lighter}
          accentColor={theme.colors.info.main}
        />
      </Grid>
    </Grid>
  );
}; 