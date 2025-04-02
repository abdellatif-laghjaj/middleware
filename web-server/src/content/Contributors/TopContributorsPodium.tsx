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

// Helper function to calculate contributor score
const calculateContributorScore = (contributor: ContributorData): number => {
  // Start with a base score
  let score = 0;
  
  // Add points for pull requests (weighted heavily)
  score += (contributor.prs || 0) * 10;
  
  // Add points for commits
  score += (contributor.contributions || 0) * 5;
  
  // Add points for code changes
  score += (contributor.additions || 0) * 0.01;
  score += (contributor.deletions || 0) * 0.005;
  
  // Bonus for successful deployments
  score += (contributor.successfulDeployments || 0) * 8;
  
  // If we have a doraPercentage, use that as a boost
  if (contributor.doraPercentage) {
    score *= (1 + contributor.doraPercentage / 100);
  }
  
  return score;
};

// Extended contributor type with score for ranking
interface ContributorWithScore extends ContributorData {
  score: number;
}

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
  const placeHeights: string[] = ["125px", "95px", "65px"];
  
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
  
  // SINGLE CONTRIBUTOR VIEW
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
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      border: `4px solid ${medalColors[0]}`,
                      boxShadow: `0 8px 16px ${alpha(medalColors[0], 0.6)}`,
                      transform: 'scale(1.05)'
                    }
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
              sx={{ 
                mb: 2,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
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
            
            {/* Podium with rank integrated */}
            <Box
              sx={{
                width: '150px',
                height: '60px',
                bgcolor: alpha(medalColors[0], 0.3),
                borderRadius: '12px 12px 0 0',
                border: `2px solid ${medalColors[0]}`,
                borderBottom: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                mt: 2
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{
                  color: 'white',
                }}
              >
                {positionLabels[0]}
              </Typography>
            </Box>
          </FlexBox>
        </FlexBox>
      </Paper>
    );
  }
  
  // MULTIPLE CONTRIBUTORS VIEW (2 or 3)
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
          {/* Podium bases with integrated rank labels */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'flex-end',
            width: '100%',
            height: '125px'
          }}>
            {topContributors.length === 2 ? (
              // Two contributors - display 1st and 2nd place podiums
              <>
                <Box 
                  key="podium-1"
                  aria-label="Second place podium"
                  sx={{ 
                    width: '30%',
                    height: placeHeights[1],
                    mx: {xs: 0.25, sm: 0.5},
                    bgcolor: alpha(medalColors[1], 0.3),
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    border: `2px solid ${medalColors[1]}`,
                    borderBottom: 'none',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                    {positionLabels[1]}
                  </Typography>
                </Box>
                <Box 
                  key="podium-0"
                  aria-label="First place podium"
                  sx={{ 
                    width: '30%',
                    height: placeHeights[0],
                    mx: {xs: 0.25, sm: 0.5},
                    bgcolor: alpha(medalColors[0], 0.3),
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    border: `2px solid ${medalColors[0]}`,
                    borderBottom: 'none',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                    {positionLabels[0]}
                  </Typography>
                </Box>
              </>
            ) : (
              // Three contributors - display all podiums
              [1, 0, 2].map((podiumIndex) => (
                <Box 
                  key={`podium-${podiumIndex}`}
                  aria-label={`${positionLabels[podiumIndex]} place podium`}
                  sx={{ 
                    width: '30%',
                    height: placeHeights[podiumIndex],
                    mx: {xs: 0.25, sm: 0.5},
                    bgcolor: alpha(medalColors[podiumIndex], 0.3),
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    border: `2px solid ${medalColors[podiumIndex]}`,
                    borderBottom: 'none',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                    {positionLabels[podiumIndex]}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
          
          {/* Contributors */}
          <Grid container spacing={1} sx={{ 
            position: 'absolute', 
            bottom: '125px', 
            left: 0, 
            right: 0,
            px: 2,
            justifyContent: 'space-around'
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
                      transition: 'transform 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-8px)'
                      },
                      height: '180px',
                      position: 'relative',
                      justifyContent: 'flex-end',
                      maxWidth: '180px'
                    }}
                    onClick={() => handleContributorClick(contributor)}
                    role="button"
                    aria-label={`View ${contributor.name}'s details`}
                    tabIndex={0}
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
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: `0 8px 16px ${alpha(medalColors[index], 0.6)}`,
                              transform: 'scale(1.05)'
                            }
                          }}
                        />
                      </Tooltip>
                      
                      {/* Medal Badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -5,
                          right: -15,
                          backgroundColor: medalColors[index],
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          zIndex: 2
                        }}
                      >
                        <StarRate sx={{ 
                          color: 'white', 
                          fontSize: '1.1rem' 
                        }} />
                      </Box>
                    </Box>
                    
                    {/* Name and username */}
                    <Box sx={{ textAlign: 'center', width: '100%' }}>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold" 
                        sx={{ 
                          fontSize: isFirst ? '1.1rem' : '1rem',
                          mb: 0.5,
                          color: 'white',
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {contributor.name}
                      </Typography>
                      
                      <Typography 
                        variant="body2" 
                        color="textSecondary" 
                        sx={{
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        @{contributor.username}
                      </Typography>
                    </Box>
                    
                    {/* Stats */}
                    <FlexBox justifyCenter wrap sx={{ mt: 1.5, gap: 0.5 }}>
                      <Tooltip title="Commits">
                        <FlexBox alignCenter gap={0.5} sx={{ px: 0.5 }}>
                          <Whatshot fontSize="small" sx={{ color: theme.colors.primary.main }} />
                          <Typography variant="body2" fontWeight="medium">
                            {contributor.contributions}
                          </Typography>
                        </FlexBox>
                      </Tooltip>
                      <Typography variant="body2" color="textSecondary">•</Typography>
                      <Tooltip title="Pull Requests">
                        <FlexBox alignCenter gap={0.5} sx={{ px: 0.5 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {contributor.prs} PRs
                          </Typography>
                        </FlexBox>
                      </Tooltip>
                      {contributor.doraPercentage && (
                        <>
                          <Typography variant="body2" color="textSecondary">•</Typography>
                          <Tooltip title="Team Contribution Rate">
                            <Typography 
                              variant="body2" 
                              fontWeight="medium" 
                              sx={{ 
                                color: medalColors[index],
                                textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)'
                              }}
                            >
                              {contributor.doraPercentage}% Contrib
                            </Typography>
                          </Tooltip>
                        </>
                      )}
                    </FlexBox>
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