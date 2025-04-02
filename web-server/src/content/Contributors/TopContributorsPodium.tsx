import { FC, useMemo } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  useTheme, 
  Avatar, 
  Tooltip,
  alpha,
  Grid
} from '@mui/material';
import { 
  EmojiEvents, 
  WorkspacePremium, 
  Whatshot, 
  Diamond, 
  StarRate 
} from '@mui/icons-material';

import { FlexBox } from '@/components/FlexBox';
import { ContributorData } from '@/hooks/useContributorData';
import { getGHAvatar } from '@/utils/user';
import { useOverlayPage } from '@/components/OverlayPageContext';

interface TopContributorsPodiumProps {
  contributors: ContributorData[];
}

interface ContributorWithScore extends ContributorData {
  score: number;
}

interface PositionInfo {
  label: string;
  icon: JSX.Element;
  subtext: string;
}

// Calculate comprehensive score for ranking
const calculateContributorScore = (contributor: ContributorData): number => {
  // Base score from contributions and PRs
  let score = contributor.contributions * 5 + contributor.prs * 15;
  
  // Add points for code changes (balanced between additions and deletions)
  score += (contributor.additions + contributor.deletions) / 100;
  
  // Add deployment success points
  if (contributor.deploymentCount > 0) {
    const successRate = contributor.successfulDeployments / contributor.deploymentCount;
    score += successRate * 100;
  }
  
  // Add DORA score points if available
  if (contributor.doraScore) {
    score += contributor.doraScore * 2;
  }
  
  // Subtract points for longer lead times (if available)
  if (contributor.leadTime) {
    // Convert to hours
    const leadTimeHours = contributor.leadTime / (1000 * 60 * 60);
    // Less time is better - max penalty of 50 points
    score -= Math.min(50, leadTimeHours / 10);
  }
  
  return Math.max(0, score);
};

export const TopContributorsPodium: FC<TopContributorsPodiumProps> = ({ contributors }) => {
  const theme = useTheme();
  const { addPage } = useOverlayPage();
  
  // Get top contributors by calculated score (up to 3)
  const topContributors = useMemo((): ContributorWithScore[] => {
    if (!contributors || !contributors.length) return [];
    
    return [...contributors]
      .map(contributor => ({
        ...contributor,
        score: calculateContributorScore(contributor)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [contributors]);
  
  // Don't show anything if there are no contributors
  if (!topContributors.length) return null;
  
  const handleContributorClick = (contributor: ContributorData): void => {
    addPage({
      page: {
        title: `${contributor.name}'s Contribution Details`,
        ui: 'contributor_details',
        props: {
          contributor,
          hasGithub: true
        }
      }
    });
  };
  
  // Medal colors
  const medalColors: string[] = [
    '#FFD700', // Gold
    '#A9A9A9', // Silver
    '#CD7F32', // Bronze
  ];
  
  // Position labels
  const positionLabels = ["1st", "2nd", "3rd"];
  
  // Place heights for the podium bases
  const placeHeights: string[] = ["120px", "90px", "60px"];
  
  // For less than 3 contributors, create a new display order
  let displayOrder: number[] = [];
  
  if (topContributors.length === 1) {
    // Only one contributor - show them in the middle (1st place)
    displayOrder = [0];
  } else if (topContributors.length === 2) {
    // Two contributors - show 1st in the middle, 2nd on the left
    displayOrder = [1, 0];
  } else {
    // Three contributors - standard layout: 2nd, 1st, 3rd
    displayOrder = [1, 0, 2];
  }

  // Avatar sizes
  const avatarSizes = {
    first: 100, // 1st place
    others: 80 // 2nd and 3rd place
  };
  
  // Render a single contributor podium
  if (topContributors.length === 1) {
    const contributor = topContributors[0];
    return (
      <Paper sx={{ 
        p: 3, 
        borderRadius: 2, 
        overflow: 'hidden', 
        position: 'relative',
        height: '100%', 
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}>
        <FlexBox col sx={{ width: '100%', height: '100%' }}>
          <Box sx={{ width: '100%', mb: 4, pl: 1.5 }}>
            <Typography variant="h4" fontWeight="bold" textAlign="left" color="white" mb={1}>
              Top Contributor
            </Typography>
            
            <Typography variant="body2" color="textSecondary" textAlign="left">
              Recognizing outstanding performance
            </Typography>
          </Box>
          
          {/* Main container - centered display for single contributor */}
          <FlexBox 
            justifyCenter 
            alignCenter 
            sx={{ 
              width: '100%', 
              flexGrow: 1,
              flexDirection: 'column'
            }}
          >
            {/* Avatar with medal */}
            <Box sx={{ 
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              mb: 2
            }}>
              <Tooltip title={`View ${contributor.name}'s details`}>
                <Avatar
                  src={contributor.avatarUrl || getGHAvatar(contributor.username)}
                  alt={contributor.name}
                  sx={{
                    width: 120,
                    height: 120,
                    border: `4px solid ${medalColors[0]}`,
                    boxShadow: `0 4px 8px ${alpha(medalColors[0], 0.4)}`,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleContributorClick(contributor)}
                />
              </Tooltip>
              
              {/* Medal Badge */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -5,
                  right: -15,
                  backgroundColor: medalColors[0],
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  zIndex: 2
                }}
              >
                <StarRate sx={{ color: 'white', fontSize: '1.2rem' }} />
              </Box>
            </Box>
            
            {/* Name and username */}
            <Typography 
              variant="h5" 
              fontWeight="bold"
              textAlign="center"
              sx={{ mb: 1 }}
            >
              {contributor.name}
            </Typography>
            
            <Typography 
              variant="body1" 
              color="textSecondary" 
              textAlign="center"
              sx={{ mb: 2 }}
            >
              @{contributor.username}
            </Typography>
            
            {/* Stats */}
            <FlexBox gap={3} mb={2}>
              <FlexBox col alignCenter>
                <Typography variant="h6" fontWeight="bold" color={medalColors[0]}>
                  {contributor.contributions}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Commits
                </Typography>
              </FlexBox>
              
              <FlexBox col alignCenter>
                <Typography variant="h6" fontWeight="bold" color={medalColors[0]}>
                  {contributor.prs}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Pull Requests
                </Typography>
              </FlexBox>
              
              {contributor.doraScore && (
                <FlexBox col alignCenter>
                  <Typography variant="h6" fontWeight="bold" color={medalColors[0]}>
                    {contributor.doraScore.toFixed(0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    DORA Score
                  </Typography>
                </FlexBox>
              )}

              {contributor.doraPercentage && (
                <FlexBox col alignCenter>
                  <Typography variant="h6" fontWeight="bold" color={medalColors[0]}>
                    {contributor.doraPercentage}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Contribution Rate
                  </Typography>
                </FlexBox>
              )}
            </FlexBox>
            
            {/* Position label */}
            <Box
              sx={{
                border: `2px solid ${medalColors[0]}`,
                backgroundColor: alpha(medalColors[0], 0.1),
                borderRadius: 2,
                py: 0.5,
                px: 2,
                mt: 1
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                color={medalColors[0]}
                textAlign="center"
              >
                1st Place
              </Typography>
            </Box>
          </FlexBox>
        </FlexBox>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ 
      p: 3, 
      borderRadius: 2, 
      overflow: 'hidden', 
      position: 'relative',
      height: '100%', 
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.paper'
    }}>
      <FlexBox col sx={{ width: '100%', height: '100%' }}>
        <Box sx={{ width: '100%', mb: 4, pl: 1.5 }}>
          <Typography variant="h4" fontWeight="bold" textAlign="left" color="white" mb={1}>
            Top Contributors
          </Typography>
          
          <Typography variant="body2" color="textSecondary" textAlign="left">
            Recognizing outstanding performance
          </Typography>
        </Box>
        
        {/* Main container */}
        <Box sx={{ 
          width: '100%', 
          height: '260px', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          flexGrow: 1
        }}>
          {/* Podium bases */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end',
            width: '100%',
            height: '120px'
          }}>
            {topContributors.length === 2 ? (
              // Two contributors - display 1st and 2nd place podiums
              <>
                <Box 
                  key="podium-1"
                  sx={{ 
                    width: '30%',
                    height: placeHeights[1],
                    mx: 0.5,
                    bgcolor: alpha(medalColors[1], 0.4),
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    border: `1px solid ${alpha(medalColors[1], 0.6)}`,
                    borderBottom: 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
                <Box 
                  key="podium-0"
                  sx={{ 
                    width: '30%',
                    height: placeHeights[0],
                    mx: 0.5,
                    bgcolor: alpha(medalColors[0], 0.4),
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    border: `1px solid ${alpha(medalColors[0], 0.6)}`,
                    borderBottom: 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              </>
            ) : (
              // Three contributors - display all podiums
              [1, 0, 2].map((podiumIndex) => (
                <Box 
                  key={`podium-${podiumIndex}`}
                  sx={{ 
                    width: '30%',
                    height: placeHeights[podiumIndex],
                    mx: 0.5,
                    bgcolor: alpha(medalColors[podiumIndex], 0.4),
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    border: `1px solid ${alpha(medalColors[podiumIndex], 0.6)}`,
                    borderBottom: 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))
            )}
          </Box>
          
          {/* Contributors */}
          <Grid container spacing={1} sx={{ 
            position: 'absolute', 
            bottom: '120px', 
            left: 0, 
            right: 0,
            px: 2,
            justifyContent: 'space-between'
          }}>
            {displayOrder.map((index) => {
              const contributor = topContributors[index];
              const isFirst = index === 0;
              const avatarSize = isFirst ? avatarSizes.first : avatarSizes.others;
              
              return (
                <Grid 
                  item 
                  xs={topContributors.length === 2 ? 6 : 4} 
                  key={contributor.username}
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center'
                  }}
                >
                  <FlexBox 
                    col 
                    alignCenter 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-5px)'
                      },
                      height: '180px',
                      position: 'relative',
                      justifyContent: 'flex-end',
                      maxWidth: '180px'
                    }}
                    onClick={() => handleContributorClick(contributor)}
                  >
                    {/* Avatar with medal circle */}
                    <Box sx={{ 
                      position: 'relative',
                      display: 'flex',
                      justifyContent: 'center',
                      mb: 1
                    }}>
                      <Tooltip title={`View ${contributor.name}'s details`}>
                        <Avatar
                          src={contributor.avatarUrl || getGHAvatar(contributor.username)}
                          alt={contributor.name}
                          sx={{
                            width: avatarSize,
                            height: avatarSize,
                            border: `4px solid ${medalColors[index]}`,
                            boxShadow: `0 4px 8px ${alpha(medalColors[index], 0.4)}`,
                          }}
                        />
                      </Tooltip>
                      
                      {/* Medal Badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -5,
                          right: isFirst ? 
                            `calc(50% - ${avatarSize/2}px - 15px)` : 
                            `calc(50% - ${avatarSize/2}px - 5px)`,
                          backgroundColor: medalColors[index],
                          borderRadius: '50%',
                          width: 30,
                          height: 30,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          zIndex: 2
                        }}
                      >
                        <StarRate sx={{ color: 'white', fontSize: '1.1rem' }} />
                      </Box>
                    </Box>
                    
                    {/* Name and username */}
                    <Box sx={{ textAlign: 'center', width: '100%' }}>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        noWrap 
                        sx={{ 
                          fontSize: isFirst ? '1.1rem' : '1rem',
                          mb: 0.5
                        }}
                      >
                        {contributor.name}
                      </Typography>
                      
                      <Typography 
                        variant="body2" 
                        color="textSecondary" 
                        noWrap
                      >
                        @{contributor.username}
                      </Typography>
                    </Box>
                    
                    {/* Stats */}
                    <FlexBox justifyCenter gap={1} mt={1}>
                      <Tooltip title="Commits">
                        <FlexBox alignCenter gap={0.5}>
                          <Whatshot fontSize="small" color="primary" />
                          <Typography variant="body2" fontWeight="medium">
                            {contributor.contributions}
                          </Typography>
                        </FlexBox>
                      </Tooltip>
                      <Typography variant="body2" color="textSecondary">•</Typography>
                      <Tooltip title="Pull Requests">
                        <Typography variant="body2" fontWeight="medium">
                          {contributor.prs} PRs
                        </Typography>
                      </Tooltip>
                      {contributor.doraPercentage && (
                        <>
                          <Typography variant="body2" color="textSecondary">•</Typography>
                          <Tooltip title="Team Contribution Rate">
                            <Typography variant="body2" fontWeight="medium" color={medalColors[index]}>
                              {contributor.doraPercentage}% Contrib
                            </Typography>
                          </Tooltip>
                        </>
                      )}
                    </FlexBox>
                    
                    {/* Position label */}
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color={medalColors[index]}
                      sx={{ mt: 1 }}
                    >
                      {positionLabels[index]}
                    </Typography>
                  </FlexBox>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </FlexBox>
    </Paper>
  );
}; 