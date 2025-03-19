import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  CircularProgress
} from '@mui/material';
import { FC, useState, useEffect, useMemo } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { EmptyState } from '@/components/EmptyState';
import { formatTime } from '@/utils/date';

// Define the contributor data structure
export interface ContributorData {
  name: string;
  avatarUrl?: string;
  contributions: number;
  prs: number;
  deploymentCount: number;
  successfulDeployments: number;
  failedDeployments: number;
  incidentCount: number;
  leadTime?: number;
  mergeTime?: number;
  reworkTime?: number;
}

interface ContributorPerformanceTableProps {
  contributors: ContributorData[];
  isLoading?: boolean;
}

type SortDirection = 'asc' | 'desc';
type SortField = keyof ContributorData;

// Activity level component to visually represent contributor activity
const ActivityChip: FC<{ contributions: number }> = ({ contributions }) => {
  let color: 'success' | 'info' | 'warning' | 'error' = 'info';
  let label = 'Medium';

  if (contributions > 100) {
    color = 'success';
    label = 'High';
  } else if (contributions > 50) {
    color = 'info';
    label = 'Medium';
  } else if (contributions > 10) {
    color = 'warning';
    label = 'Low';
  } else {
    color = 'error';
    label = 'Very Low';
  }

  return <Chip size="small" color={color} label={label} />;
};

export const ContributorPerformanceTable: FC<ContributorPerformanceTableProps> = ({
  contributors,
  isLoading = false
}) => {
  const [sortField, setSortField] = useState<SortField>('contributions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedContributors = useMemo(() => {
    if (!contributors || contributors.length === 0) return [];

    return [...contributors].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      // Compare based on sort direction
      const compareResult = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
  }, [contributors, sortField, sortDirection]);

  if (isLoading) {
    return (
      <FlexBox centered fullWidth p={4}>
        <CircularProgress size={40} />
        <Line ml={2}>Loading contributor data...</Line>
      </FlexBox>
    );
  }

  if (!contributors || contributors.length === 0) {
    return (
      <EmptyState>
        <Line>No contributor data available.</Line>
      </EmptyState>
    );
  }

  return (
    <FlexBox col gap={2} fullWidth>
      <Line white huge bold>
        Contributors Performance
      </Line>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="contributors table">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortDirection : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Contributor
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'contributions'}
                  direction={sortField === 'contributions' ? sortDirection : 'asc'}
                  onClick={() => handleSort('contributions')}
                >
                  Contributions
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'prs'}
                  direction={sortField === 'prs' ? sortDirection : 'asc'}
                  onClick={() => handleSort('prs')}
                >
                  PRs
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'deploymentCount'}
                  direction={sortField === 'deploymentCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('deploymentCount')}
                >
                  Deployments
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'successfulDeployments'}
                  direction={sortField === 'successfulDeployments' ? sortDirection : 'asc'}
                  onClick={() => handleSort('successfulDeployments')}
                >
                  Success Rate
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'incidentCount'}
                  direction={sortField === 'incidentCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('incidentCount')}
                >
                  Incidents
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'leadTime'}
                  direction={sortField === 'leadTime' ? sortDirection : 'asc'}
                  onClick={() => handleSort('leadTime')}
                >
                  Avg. Lead Time
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'mergeTime'}
                  direction={sortField === 'mergeTime' ? sortDirection : 'asc'}
                  onClick={() => handleSort('mergeTime')}
                >
                  Avg. Merge Time
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'reworkTime'}
                  direction={sortField === 'reworkTime' ? sortDirection : 'asc'}
                  onClick={() => handleSort('reworkTime')}
                >
                  Avg. Rework Time
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Activity Level</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedContributors.map((contributor) => (
              <TableRow key={contributor.name}>
                <TableCell component="th" scope="row">
                  {contributor.name}
                </TableCell>
                <TableCell align="right">{contributor.contributions}</TableCell>
                <TableCell align="right">{contributor.prs || 0}</TableCell>
                <TableCell align="right">{contributor.deploymentCount || 0}</TableCell>
                <TableCell align="right">
                  {contributor.deploymentCount
                    ? `${Math.round((contributor.successfulDeployments || 0) / contributor.deploymentCount * 100)}%`
                    : 'N/A'}
                </TableCell>
                <TableCell align="right">{contributor.incidentCount || 0}</TableCell>
                <TableCell align="right">{contributor.leadTime}</TableCell>
                <TableCell align="right">{contributor.mergeTime}</TableCell>
                <TableCell align="right">{contributor.reworkTime}</TableCell>
                <TableCell align="right">
                  <ActivityChip contributions={contributor.contributions} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </FlexBox>
  );
};