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
  Avatar,
  Tooltip,
  Typography,
  useTheme,
  CircularProgress,
  Box
} from '@mui/material';
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
  ArrowUpward,
  ArrowDownward,
  GitHub
} from '@mui/icons-material';
import { FC, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { alpha } from '@mui/material/styles';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { ContributorData } from '@/hooks/useContributorData';
import { SimpleAvatar } from '@/components/SimpleAvatar';
import { getGHAvatar } from '@/utils/user';
import { useOverlayPage } from '@/components/OverlayPageContext';

type SortDirection = 'asc' | 'desc';
type SortField = keyof ContributorData | '';

interface ContributorPerformanceTableProps {
  contributors: ContributorData[];
  isLoading?: boolean;
  lastUpdated?: Date | null;
  hasGithub?: boolean;
}

const ActivityChip: FC<{ contributions: number }> = ({ contributions }) => {
  let label = 'Low';
  let color: 'success' | 'info' | 'warning' | 'error' | 'default' = 'default';

  if (contributions >= 50) {
    label = 'Very High';
    color = 'error';
  } else if (contributions >= 30) {
    label = 'High';
    color = 'warning';
  } else if (contributions >= 10) {
    label = 'Medium';
    color = 'info';
  } else if (contributions >= 5) {
    label = 'Low';
    color = 'success';
  }

  return (
    <Tooltip title={`${contributions} commits - Activity level: ${label}`}>
      <Chip size="small" label={label} color={color} />
    </Tooltip>
  );
};

const NoContributorsMessage: FC = () => (
  <FlexBox col alignCenter justifyCenter p={4}>
    <GitHub sx={{ fontSize: 60, opacity: 0.3, mb: 2 }} />
    <Typography variant="h6">No contributor data available</Typography>
    <Typography variant="body2" color="textSecondary">
      This could be because there are no PRs in the selected time range,
      or all contributors were identified as bots.
    </Typography>
  </FlexBox>
);

export const ContributorPerformanceTable: FC<ContributorPerformanceTableProps> = ({
  contributors,
  isLoading = false,
  lastUpdated = null,
  hasGithub = false
}) => {
  const theme = useTheme();
  const [sortField, setSortField] = useState<SortField>('contributions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { addPage } = useOverlayPage();

  const handleSort = useCallback((field: SortField) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prevDirection => prevDirection === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setSortDirection('desc');
      return field;
    });
  }, []);

  const handleContributorClick = useCallback((contributor: ContributorData) => {
    addPage({
      page: {
        ui: 'contributor_details',
        props: { contributor },
        title: `${contributor.name}'s Contributions`
      }
    });
  }, [addPage]);

  const sortedContributors = useMemo(() => {
    if (!contributors.length) return [];
    return [...contributors].sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];

      if (fieldA === undefined && fieldB === undefined) return 0;
      if (fieldA === undefined) return 1;
      if (fieldB === undefined) return -1;

      // For string fields
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        return sortDirection === 'asc'
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      }

      // For numeric fields
      return sortDirection === 'asc'
        ? Number(fieldA) - Number(fieldB)
        : Number(fieldB) - Number(fieldA);
    });
  }, [contributors, sortField, sortDirection]);

  const handleContributorClick = useCallback((contributor) => {
    addPage({
      page: {
        title: `${contributor.name}'s Contribution Details`,
        ui: 'contributor_details',
        props: {
          contributor,
          hasGithub
        }
      }
    });
  }, [addPage, hasGithub]);

  if (isLoading) {
    return (
      <FlexBox col alignCenter justifyCenter p={4}>
        <CircularProgress size={40} />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading contributor data...
        </Typography>
      </FlexBox>
    );
  }

  if (!contributors.length) {
    return <NoContributorsMessage />;
  }

  return (
    <FlexBox col gap={1}>
      {lastUpdated && (
        <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
          Last updated: {format(lastUpdated, 'PPpp')}
        </Typography>
      )}
      
      <TableContainer 
        component={Paper} 
        sx={{ 
          boxShadow: theme.shadows[1],
          borderRadius: 1,
          overflow: 'hidden',
          border: `1px solid ${theme.colors.secondary.lighter}`
        }}
      >
        <Table size="medium">
          <TableHead sx={{ backgroundColor: alpha(theme.colors.primary.main, 0.08) }}>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortDirection : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  <Tooltip title="Sort by contributor name">
                    <FlexBox alignCenter gap={1}>
                      <Person fontSize="small" />
                      Contributor
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'contributions'}
                  direction={sortField === 'contributions' ? sortDirection : 'asc'}
                  onClick={() => handleSort('contributions')}
                >
                  <Tooltip title="Sort by number of commits">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <Timeline fontSize="small" />
                      Commits
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'prs'}
                  direction={sortField === 'prs' ? sortDirection : 'asc'}
                  onClick={() => handleSort('prs')}
                >
                  <Tooltip title="Sort by number of pull requests">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <Code fontSize="small" />
                      PRs
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'additions'}
                  direction={sortField === 'additions' ? sortDirection : 'asc'}
                  onClick={() => handleSort('additions')}
                >
                  <Tooltip title="Sort by lines of code added">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <ArrowUpward fontSize="small" color="success" />
                      Additions
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'deletions'}
                  direction={sortField === 'deletions' ? sortDirection : 'asc'}
                  onClick={() => handleSort('deletions')}
                >
                  <Tooltip title="Sort by lines of code removed">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <ArrowDownward fontSize="small" color="error" />
                      Deletions
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'deploymentCount'}
                  direction={sortField === 'deploymentCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('deploymentCount')}
                >
                  <Tooltip title="Sort by number of deployments">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <CloudUpload fontSize="small" />
                      Deployments
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'successfulDeployments'}
                  direction={sortField === 'successfulDeployments' ? sortDirection : 'asc'}
                  onClick={() => handleSort('successfulDeployments')}
                >
                  <Tooltip title="Sort by deployment success rate">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <CheckCircle fontSize="small" color="success" />
                      Success Rate
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'incidentCount'}
                  direction={sortField === 'incidentCount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('incidentCount')}
                >
                  <Tooltip title="Sort by number of incidents">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <BugReport fontSize="small" />
                      Incidents
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'leadTime'}
                  direction={sortField === 'leadTime' ? sortDirection : 'asc'}
                  onClick={() => handleSort('leadTime')}
                >
                  <Tooltip title="Sort by average lead time (time from first commit to deployment)">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <AccessTime fontSize="small" />
                      Avg. Lead Time
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'mergeTime'}
                  direction={sortField === 'mergeTime' ? sortDirection : 'asc'}
                  onClick={() => handleSort('mergeTime')}
                >
                  <Tooltip title="Sort by average merge time (time from PR opened to merged)">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <AccessTime fontSize="small" />
                      Avg. Merge Time
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'reworkTime'}
                  direction={sortField === 'reworkTime' ? sortDirection : 'asc'}
                  onClick={() => handleSort('reworkTime')}
                >
                  <Tooltip title="Sort by average rework time (time spent making changes after code review)">
                    <FlexBox alignCenter gap={1} justifyEnd>
                      <Build fontSize="small" />
                      Avg. Rework Time
                    </FlexBox>
                  </Tooltip>
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Overall activity level based on commit frequency">
                  <Typography>Activity Level</Typography>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedContributors.map((contributor) => (
              <TableRow 
                key={contributor.username} 
                hover
                onClick={() => handleContributorClick(contributor)}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    backgroundColor: alpha(theme.colors.primary.lighter, 0.1),
                  }
                }}
              >
                <TableCell component="th" scope="row">
                  <FlexBox alignCenter gap={1}>
                    <Tooltip 
                      title={
                        <Box>
                          <Typography variant="body2">@{contributor.username}</Typography>
                          {contributor.name !== contributor.username && (
                            <Typography variant="caption">{contributor.name}</Typography>
                          )}
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Click to view detailed metrics
                          </Typography>
                        </Box>
                      }
                    >
                      <Box component="span">
                        {hasGithub ? (
                          <Avatar 
                            src={contributor.avatarUrl || getGHAvatar(contributor.username)}
                            alt={contributor.name} 
                            sx={{ width: 32, height: 32 }}
                          />
                        ) : (
                          <SimpleAvatar
                            name={contributor.name || contributor.username}
                            size={theme.spacing(4)}
                            url={contributor.avatarUrl || getGHAvatar(contributor.username)}
                          />
                        )}
                      </Box>
                    </Tooltip>
                    <Line bold>{contributor.name}</Line>
                  </FlexBox>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`${contributor.contributions} total commits`}>
                    <Line big bold white>
                      {contributor.contributions}
                    </Line>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`${contributor.prs} pull requests`}>
                    <Line big bold white>
                      {contributor.prs}
                    </Line>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`${contributor.additions} lines added`}>
                    <Line big bold color="success.main">
                      +{contributor.additions}
                    </Line>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`${contributor.deletions} lines removed`}>
                    <Line big bold color="error.main">
                      -{contributor.deletions}
                    </Line>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`${contributor.deploymentCount} total deployments`}>
                    <Line big bold white>
                      {contributor.deploymentCount}
                    </Line>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  {contributor.deploymentCount ? (
                    <Tooltip 
                      title={`${contributor.successfulDeployments} successful, ${contributor.failedDeployments} failed deployments`}
                    >
                      <FlexBox justifyEnd>
                        <Chip 
                          size="small" 
                          label={`${Math.round((contributor.successfulDeployments / contributor.deploymentCount) * 100)}%`}
                          color={contributor.successfulDeployments / contributor.deploymentCount > 0.8 ? "success" : "warning"}
                        />
                      </FlexBox>
                    </Tooltip>
                  ) : (
                    <Line>N/A</Line>
                  )}
                </TableCell>
                <TableCell align="right">
                  {contributor.incidentCount > 0 ? (
                    <Tooltip title={`${contributor.incidentCount} incidents associated with this contributor's code`}>
                      <FlexBox justifyEnd>
                        <Chip 
                          size="small" 
                          label={contributor.incidentCount}
                          color={contributor.incidentCount > 5 ? "error" : "warning"}
                          icon={<BugReport />}
                        />
                      </FlexBox>
                    </Tooltip>
                  ) : (
                    <Tooltip title="No incidents associated with this contributor's code">
                      <Line>0</Line>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`Average lead time: ${contributor.leadTimeFormatted || 'N/A'}`}>
                    <Line>{contributor.leadTimeFormatted || 'N/A'}</Line>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`Average merge time: ${contributor.mergeTimeFormatted || 'N/A'}`}>
                    <Line>{contributor.mergeTimeFormatted || 'N/A'}</Line>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={`Average rework time: ${contributor.reworkTimeFormatted || 'N/A'}`}>
                    <Line>{contributor.reworkTimeFormatted || 'N/A'}</Line>
                  </Tooltip>
                </TableCell>
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