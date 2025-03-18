import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  TrendingDown,
  TrendingFlat,
  TrendingUp
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  useTheme
} from '@mui/material';
import { FC, useEffect, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { getDurationString } from '@/utils/date';

import { TeamContributorPerformance } from '@/slices/dora_metrics';

type SortField = 'activity_level' | 'total_contributions' | 'pull_requests' | 'average_lead_time' | 'change_failure_rate';
type SortOrder = 'asc' | 'desc';

const ActivityLevelChip: FC<{ level: number }> = ({ level }) => {
  const theme = useTheme();
  let color = theme.colors.error.main;
  let label = 'Inactive';

  if (level === 1) {
    color = theme.colors.warning.main;
    label = 'Low';
  } else if (level === 2) {
    color = theme.colors.primary.main;
    label = 'Medium';
  } else if (level >= 3) {
    color = theme.colors.success.main;
    label = 'High';
  }

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: color,
        color: '#fff',
        fontWeight: 'bold',
        minWidth: '80px'
      }}
    />
  );
};

const TrendIcon: FC<{ trend: 'improving' | 'declining' | 'stable' }> = ({ trend }) => {
  const theme = useTheme();

  if (trend === 'improving') {
    return <TrendingUp fontSize="small" sx={{ color: theme.colors.success.main }} />;
  }

  if (trend === 'declining') {
    return <TrendingDown fontSize="small" sx={{ color: theme.colors.error.main }} />;
  }

  return <TrendingFlat fontSize="small" sx={{ color: theme.colors.info.main }} />;
};

export const ContributorPerformanceTable: FC<{ contributors: TeamContributorPerformance[] }> = ({
  contributors
}) => {
  const [sortField, setSortField] = useState<SortField>('activity_level');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const theme = useTheme();

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedContributors = [...contributors].sort((a, b) => {
    let valueA, valueB;

    switch (sortField) {
      case 'activity_level':
        valueA = a.contributor.activity_level;
        valueB = b.contributor.activity_level;
        break;
      case 'total_contributions':
        valueA = a.contributor.total_contributions;
        valueB = b.contributor.total_contributions;
        break;
      case 'pull_requests':
        valueA = a.contributor.pull_requests;
        valueB = b.contributor.pull_requests;
        break;
      case 'average_lead_time':
        valueA = a.contributor.average_lead_time;
        valueB = b.contributor.average_lead_time;
        break;
      case 'change_failure_rate':
        valueA = a.contributor.change_failure_rate;
        valueB = b.contributor.change_failure_rate;
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });

  if (!contributors || contributors.length === 0) {
    return (
      <EmptyState>
        <Box>No contributor data available for this team in the selected date range</Box>
      </EmptyState>
    );
  }

  return (
    <Card sx={{ mt: 2 }}>
      <Box p={2}>
        <Line big bold white>Contributor Performance</Line>
        <Line small>Performance metrics for team contributors during the selected period</Line>
      </Box>
      <Divider />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Contributor</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'activity_level'}
                  direction={sortField === 'activity_level' ? sortOrder : 'asc'}
                  onClick={() => handleSort('activity_level')}
                >
                  Activity Level
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'total_contributions'}
                  direction={sortField === 'total_contributions' ? sortOrder : 'asc'}
                  onClick={() => handleSort('total_contributions')}
                >
                  Contributions
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'pull_requests'}
                  direction={sortField === 'pull_requests' ? sortOrder : 'asc'}
                  onClick={() => handleSort('pull_requests')}
                >
                  PRs Merged
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'average_lead_time'}
                  direction={sortField === 'average_lead_time' ? sortOrder : 'asc'}
                  onClick={() => handleSort('average_lead_time')}
                >
                  Avg Lead Time
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'change_failure_rate'}
                  direction={sortField === 'change_failure_rate' ? sortOrder : 'asc'}
                  onClick={() => handleSort('change_failure_rate')}
                >
                  Change Failure Rate
                </TableSortLabel>
              </TableCell>
              <TableCell>Trend</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedContributors.map((item) => {
              const { contributor, insights } = item;

              return (
                <TableRow key={contributor.id} hover>
                  <TableCell>
                    <FlexBox gap={1} alignCenter>
                      <Avatar
                        src={contributor.avatar_url}
                        alt={contributor.name}
                        sx={{ width: 32, height: 32 }}
                      >
                        {contributor.name?.charAt(0)}
                      </Avatar>
                      <FlexBox col>
                        <Line bold>{contributor.name}</Line>
                        <Line small>@{contributor.username}</Line>
                      </FlexBox>
                    </FlexBox>
                  </TableCell>
                  <TableCell>
                    <ActivityLevelChip level={contributor.activity_level} />
                  </TableCell>
                  <TableCell>{contributor.total_contributions}</TableCell>
                  <TableCell>{contributor.pull_requests}</TableCell>
                  <TableCell>
                    {contributor.average_lead_time ? getDurationString(contributor.average_lead_time) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Percentage of changes that resulted in incidents or rollbacks">
                      <Box component="span">
                        {contributor.change_failure_rate.toFixed(1)}%
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`Performance is ${insights.trend}`}>
                      <Box component="span">
                        <TrendIcon trend={insights.trend} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};
