import {
  AutoAwesomeRounded,
  CheckRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  SmartToyOutlined
} from '@mui/icons-material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  Alert,
  Button,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  Tab,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
  Box,
  Chip,
  Grid,
  LinearProgress
} from '@mui/material';
import { AxiosError } from 'axios';
import copy from 'copy-to-clipboard';
import { enqueueSnackbar } from 'notistack';
import React, { useEffect, useMemo, useState } from 'react';
import { AiOutlineOpenAI } from 'react-icons/ai';
import { FaMeta } from 'react-icons/fa6';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import v from 'voca';
import { SiGooglegemini } from 'react-icons/si';
import { TbRobot, TbChartDots, TbBraces, TbAlertCircle, TbDeviceAnalytics, TbMessageChatbot } from 'react-icons/tb';
import { alpha } from '@mui/material/styles';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useAxios } from '@/hooks/useAxios';
import { useEasyState } from '@/hooks/useEasyState';
import { usePrevious } from '@/hooks/usePrevious';
import { useAiAgent } from '@/hooks/useAiAgent';
import { DoraAiAPIResponse, doraMetricsSlice } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import { depFn, noOp } from '@/utils/fn';

import RocketGraphic from './rocket-graphic.svg';

enum Model {
  GPT4o = 'GPT4o',
  LLAMA3p1450B = 'LLAMA3p1450B',
  LLAMA3p170B = 'LLAMA3p170B',
  GEMINI = 'GEMINI'
}

// AI Modes
enum AIMode {
  ANALYTICS = 'analytics',
  AGENT = 'agent'
}

// AI Agent Features
export enum AgentFeature {
  CODE_QUALITY = 'code_quality',
  PERFORMANCE_PREDICTION = 'performance_prediction',
  INCIDENT_RESPONSE = 'incident_response',
  WORKFLOW_OPTIMIZATION = 'workflow_optimization',
  CONVERSATION = 'conversation'
}

// Example prompts for each feature type
const featureExamplePrompts: Record<AgentFeature, string[]> = {
  [AgentFeature.CODE_QUALITY]: [
    "Analyze our PRs for code quality issues and suggest improvements",
    "What are the most common anti-patterns in our codebase?",
    "Identify potential security vulnerabilities in our recent code changes"
  ],
  [AgentFeature.PERFORMANCE_PREDICTION]: [
    "What will our deployment frequency be next month based on current trends?",
    "Will our lead time improve or worsen in the coming weeks?",
    "How will our change failure rate evolve if we maintain our current practices?"
  ],
  [AgentFeature.INCIDENT_RESPONSE]: [
    "What patterns do you see in our past incidents?",
    "How can we reduce our mean time to recovery?",
    "What preventative measures would help us avoid the most common failures?"
  ],
  [AgentFeature.WORKFLOW_OPTIMIZATION]: [
    "Where are the main bottlenecks in our development pipeline?",
    "How can we improve our code review process based on the metrics?",
    "What automation opportunities should we prioritize in our workflow?"
  ],
  [AgentFeature.CONVERSATION]: [
    "Are we performing better or worse than industry standards?",
    "What's the most concerning trend in our DORA metrics right now?",
    "How does our team compare to others in terms of deployment frequency?"
  ]
};

const openAiModels = new Set([Model.GPT4o]);
const llamaModels = new Set([Model.LLAMA3p1450B, Model.LLAMA3p170B]);
const geminiModels = new Set([Model.GEMINI]);

const modelLabelsMap: Record<Model, string> = {
  GPT4o: 'GPT 4o',
  LLAMA3p1450B: 'Llama 3.1 / 405B',
  LLAMA3p170B: 'Llama 3.1 / 70B',
  GEMINI: 'Google Gemini'
};

const modelIconMap: Record<Model, React.ReactNode> = {
  GPT4o: <AiOutlineOpenAI transform="scale(1.2)" />,
  LLAMA3p1450B: <FaMeta />,
  LLAMA3p170B: <FaMeta />,
  GEMINI: <SiGooglegemini />
};

const agentFeatureIconMap: Record<AgentFeature, React.ReactNode> = {
  [AgentFeature.CODE_QUALITY]: <TbBraces size={20} />,
  [AgentFeature.PERFORMANCE_PREDICTION]: <TbChartDots size={20} />,
  [AgentFeature.INCIDENT_RESPONSE]: <TbAlertCircle size={20} />,
  [AgentFeature.WORKFLOW_OPTIMIZATION]: <TbDeviceAnalytics size={20} />,
  [AgentFeature.CONVERSATION]: <TbMessageChatbot size={20} />
};

const agentFeatureLabelMap: Record<AgentFeature, string> = {
  [AgentFeature.CODE_QUALITY]: 'Code Quality Analysis',
  [AgentFeature.PERFORMANCE_PREDICTION]: 'Team Performance Prediction',
  [AgentFeature.INCIDENT_RESPONSE]: 'Incident Response Assistant',
  [AgentFeature.WORKFLOW_OPTIMIZATION]: 'Workflow Optimization',
  [AgentFeature.CONVERSATION]: 'Natural Language Interface'
};

const agentFeatureDescriptionMap: Record<AgentFeature, string> = {
  [AgentFeature.CODE_QUALITY]: 'Analyze code quality, identify potential issues, and suggest improvements.',
  [AgentFeature.PERFORMANCE_PREDICTION]: 'Predict future team performance based on historical DORA metrics.',
  [AgentFeature.INCIDENT_RESPONSE]: 'Get recommendations for incident resolution and prevention.',
  [AgentFeature.WORKFLOW_OPTIMIZATION]: 'Identify bottlenecks and optimize developer workflows.',
  [AgentFeature.CONVERSATION]: 'Ask questions and get insights about your team\'s performance in natural language.'
};

export const AIAnalysis = () => {
  const [models, { loading: loadingModels, fetch: fetchModels }] = useAxios<
    Model[]
  >(`/internal/ai/models`, { manual: true });

  const dispatch = useDispatch();
  const theme = useTheme();
  const doraData = useSelector((s: any) => s.doraMetrics.metrics_summary);
  const savedSummary = useSelector((s: any) => s.doraMetrics.ai_summary);
  const savedToken = useSelector((s: any) => s.doraMetrics.ai_summary_token);

  const [response, { loading: loadingData, fetch: loadData, error: loadDataError }] =
    useAxios<DoraAiAPIResponse>(`/internal/ai/dora_metrics`, {
      manual: true,
      onError: noOp
    });

  // AI agent state using our new hook
  const { 
    response: agentResponse, 
    isLoading: loadingAgentResponse,
    error: agentError,
    prDiffs,
    generateResponse
  } = useAiAgent();
  
  const [aiMode, setAiMode] = useState<AIMode>(AIMode.ANALYTICS);
  const [selectedAgentFeature, setSelectedAgentFeature] = useState<AgentFeature>(AgentFeature.CODE_QUALITY);
  const [agentQuery, setAgentQuery] = useState<string>('');

  const data = useMemo(
    () => response || savedSummary,
    [response, savedSummary]
  );

  const selectedModel = useEasyState<Model>(Model.GEMINI);
  const token = useEasyState<string>('');
  const selectedTab = useEasyState<string>(
    String(AnalysisTabs.dora_compiled_summary)
  );

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const prevSavedToken = usePrevious(savedToken);
  useEffect(() => {
    if (token.value || prevSavedToken === savedToken) return;
    depFn(token.set, savedToken);
  }, [prevSavedToken, savedToken, token.set, token.value]);

  const generateAnalysis = () => {
    loadData({
      method: 'POST',
      data: {
        model: selectedModel.value,
        data: doraData
      }
    })
      .then((r) => {
        if (r && r.data) {
          dispatch(
            doraMetricsSlice.actions.setAiSummary({
              summary: r.data,
              token: ''
            })
          );
          selectedTab.set(String(AnalysisTabs.dora_compiled_summary));
        }
      })
      .catch((r: AxiosError) => {
        if (r && r.response && r.response.status >= 400) {
          let errorMessage = 'Something went wrong!';
          
          if (r.response?.data) {
            const responseData = r.response.data as any;
            if (responseData.message) {
              errorMessage = responseData.message;
            }
          }
          
          enqueueSnackbar(errorMessage, {
            variant: 'error',
            anchorOrigin: {
              horizontal: 'right',
              vertical: 'bottom'
            }
          });
        }
      });
  };

  useEffect(() => {
    if (doraData && !data && !loadingData) {
      generateAnalysis();
    }
  }, [doraData, data, loadingData]);

  useEffect(() => {
    if (doraData && !loadingData) {
      generateAnalysis();
    }
  }, [selectedModel.value]);

  // Function to handle AI agent queries using our new hook
  const handleAgentQuery = async () => {
    if (!agentQuery.trim()) return;
    
    try {
      // Call the generateResponse method from our hook
      await generateResponse(
        selectedAgentFeature,
        agentQuery,
        selectedModel.value,
        doraData || {}
      );
      
      // Show success notification if response is received without errors
      if (!agentError) {
        enqueueSnackbar('AI analysis complete!', {
          variant: 'success',
          anchorOrigin: {
            horizontal: 'right',
            vertical: 'bottom'
          }
        });
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      enqueueSnackbar('Failed to generate AI response. Please try again.', {
        variant: 'error',
        anchorOrigin: {
          horizontal: 'right',
          vertical: 'bottom'
        }
      });
    }
  };

  const renderSkeletonLoader = () => (
    <FlexBox col sx={{ width: '100%', px: 2 }}>
      <FlexBox alignCenter justifyCenter sx={{ py: 4 }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress size={40} />
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
            <AutoAwesomeRounded style={{ fontSize: 20, color: theme.colors.primary.main }} />
          </Box>
        </Box>
        <Typography variant="body1" sx={{ ml: 2, fontWeight: 500 }}>
          Generating AI response...
        </Typography>
      </FlexBox>
    </FlexBox>
  );

  const renderFeatureSelection = () => (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        {Object.values(AgentFeature).map((feature) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={feature}>
            {renderFeatureCard(feature)}
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render individual feature card
  const renderFeatureCard = (feature: AgentFeature) => (
    <Card
      onClick={() => setSelectedAgentFeature(feature)}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: `1px solid ${selectedAgentFeature === feature 
          ? theme.colors.primary.main 
          : theme.colors.alpha.black[10]}`,
        backgroundColor: selectedAgentFeature === feature 
          ? alpha(theme.colors.primary.lighter, 0.15)
          : 'transparent',
        boxShadow: selectedAgentFeature === feature 
          ? `0 0 20px ${alpha(theme.colors.primary.main, 0.2)}`
          : 'none',
        '&:hover': {
          backgroundColor: selectedAgentFeature === feature 
            ? alpha(theme.colors.primary.lighter, 0.15)
            : alpha(theme.colors.primary.lighter, 0.05),
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 16px ${alpha(theme.colors.primary.main, 0.1)}`
        }
      }}
    >
      <Box
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56, 
          height: 56, 
          borderRadius: '50%',
          backgroundColor: alpha(theme.colors.primary.main, 0.1),
          color: theme.colors.primary.main,
          mb: 2,
          fontSize: 24
        }}
      >
        {agentFeatureIconMap[feature]}
      </Box>
      <Typography variant="h5" gutterBottom>
        {agentFeatureLabelMap[feature]}
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ flexGrow: 1 }}>
        {agentFeatureDescriptionMap[feature]}
      </Typography>
    </Card>
  );

  // Render agent interface based on selected feature
  const renderAgentInterface = () => {
    return (
      <FlexBox col gap={2} sx={{ mt: 2 }}>
        <Card sx={{ p: 3 }}>
          <FlexBox col gap={2}>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {agentFeatureIconMap[selectedAgentFeature]}
              {agentFeatureLabelMap[selectedAgentFeature]}
            </Typography>
            <Typography variant="body1">
              {agentFeatureDescriptionMap[selectedAgentFeature]}
            </Typography>
            
            {/* Code Quality Analysis Info */}
            {selectedAgentFeature === AgentFeature.CODE_QUALITY && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <FlexBox col gap={1}>
                  <Typography variant="body2" fontWeight="medium">
                    Code Analysis Available
                  </Typography>
                  <Typography variant="body2">
                    The AI agent will analyze real code from your recent pull requests to provide specific code quality insights.
                  </Typography>
                </FlexBox>
              </Alert>
            )}
            
            {/* Example prompts */}
            <Box sx={{ mt: 1, mb: 1 }}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                Try these examples:
              </Typography>
              <FlexBox gap={1} flexWrap="wrap">
                {featureExamplePrompts[selectedAgentFeature].map((prompt, index) => (
                  <Chip
                    key={index}
                    label={prompt}
                    clickable
                    color="primary"
                    variant="outlined"
                    onClick={() => setAgentQuery(prompt)}
                    sx={{ 
                      mb: 1,
                      '& .MuiChip-label': { 
                        whiteSpace: 'normal',
                        textAlign: 'left'
                      }
                    }}
                  />
                ))}
              </FlexBox>
            </Box>
            
            <FlexBox gap={1}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={selectedAgentFeature === AgentFeature.CONVERSATION 
                  ? "Ask a question about your team's performance..." 
                  : `What would you like to know about ${agentFeatureLabelMap[selectedAgentFeature].toLowerCase()}?`}
                value={agentQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgentQuery(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAgentQuery()}
                disabled={loadingAgentResponse}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {agentFeatureIconMap[selectedAgentFeature]}
                    </InputAdornment>
                  ),
                }}
              />
              <Button 
                variant="contained" 
                onClick={handleAgentQuery} 
                disabled={!agentQuery.trim() || loadingAgentResponse}
                startIcon={loadingAgentResponse ? <CircularProgress size={20} /> : <AutoAwesomeRounded />}
                sx={{ 
                  minWidth: '160px',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto'
                }}
              >
                {loadingAgentResponse ? 'Analyzing...' : 'Ask AI Agent'}
              </Button>
            </FlexBox>
            
            {selectedAgentFeature === AgentFeature.CODE_QUALITY && loadingAgentResponse && (
              <Box sx={{ mt: 2 }}>
                <FlexBox alignCenter gap={1} sx={{ mb: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="textSecondary">
                    Analyzing code from pull requests...
                  </Typography>
                </FlexBox>
                <LinearProgress variant="indeterminate" />
              </Box>
            )}
            
            {agentError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {agentError}
              </Alert>
            )}
            
            {/* Display PR information for code quality analysis */}
            {selectedAgentFeature === AgentFeature.CODE_QUALITY && prDiffs.length > 0 && agentResponse && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Code Analysis Details
                </Typography>
                <Box sx={{ 
                  backgroundColor: alpha(theme.colors.primary.main, 0.05),
                  p: 2, 
                  borderRadius: 1,
                  maxHeight: '200px',
                  overflowY: 'auto' 
                }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Analyzed {prDiffs.length} pull request{prDiffs.length !== 1 ? 's' : ''}:
                  </Typography>
                  {prDiffs.map((pr, index) => (
                    <FlexBox key={index} sx={{ mb: 1 }}>
                      <Chip 
                        size="small" 
                        label={`#${pr.pull_id}`} 
                        color="primary" 
                        sx={{ mr: 1 }} 
                      />
                      <Typography variant="body2" noWrap>
                        {pr.title} <Typography component="span" color="textSecondary" variant="caption">by {pr.author}</Typography>
                      </Typography>
                    </FlexBox>
                  ))}
                </Box>
              </Box>
            )}
            
            {agentResponse && (
              <Card 
                variant="outlined" 
                sx={{ 
                  mt: 2, 
                  p: 2,
                  backgroundColor: theme.colors.alpha.black[5],
                  '& pre': {
                    backgroundColor: theme.colors.alpha.black[10],
                    p: 1,
                    borderRadius: 1,
                    overflowX: 'auto'
                  },
                  '& table': {
                    borderCollapse: 'collapse',
                    width: '100%',
                    '& th, & td': {
                      border: `1px solid ${theme.colors.alpha.black[30]}`,
                      p: 1
                    }
                  }
                }}
              >
                {loadingAgentResponse ? (
                  renderSkeletonLoader()
                ) : (
                  <Markdown>{agentResponse}</Markdown>
                )}
              </Card>
            )}
          </FlexBox>
        </Card>
      </FlexBox>
    );
  };

  return (
    <FlexBox
      col
      gap1
      sx={{ ['[data-lastpass-icon-root]']: { display: 'none' } }}
    >
      <FlexBox justifyContent="space-between" alignItems="center" gap={1}>
        <ToggleButtonGroup
          value={aiMode}
          exclusive
          onChange={(_, val: AIMode) => val && setAiMode(val)}
          sx={{ 
            '.MuiToggleButton-root': { 
              textTransform: 'none', 
              px: 3,
              py: 1.2
            }
          }}
        >
          <ToggleButton value={AIMode.ANALYTICS}>
            <AutoAwesomeRounded style={{ marginRight: 8, fontSize: 24 }} /> AI Analytics
          </ToggleButton>
          <ToggleButton value={AIMode.AGENT}>
            <SmartToyOutlined style={{ marginRight: 8, fontSize: 24 }} /> AI Agent
          </ToggleButton>
        </ToggleButtonGroup>
        
        <Select
          value={selectedModel.value || models?.[0] || Model.GEMINI}
          renderValue={(m: any) => modelLabelsMap[m as Model] || m}
          onChange={(e: React.ChangeEvent<{ value: unknown }>) => selectedModel.set(e.target.value as Model)}
          startAdornment={
            loadingModels ? (
              <InputAdornment position="start">
                <CircularProgress size={theme.spacing(1.5)} />
              </InputAdornment>
            ) : (
              <InputAdornment position="start">
                {modelIconMap[selectedModel.value as Model]}
              </InputAdornment>
            )
          }
          sx={{ width: 220 }}
          size="small"
        >
          {models?.map((m) => (
            <MenuItem value={m} key={m}>
              <FlexBox gap1 alignCenter>
                {modelIconMap[m as Model]}
                <span>{modelLabelsMap[m as Model] || m}</span>
              </FlexBox>
            </MenuItem>
          ))}
        </Select>
      </FlexBox>
      
      {aiMode === AIMode.ANALYTICS ? (
        <FlexBox col gap1>
          {loadingData ? (
            <FlexBox col overflow="hidden" alignCenter justifyCenter sx={{ minHeight: 350 }}>
              {renderSkeletonLoader()}
            </FlexBox>
          ) : !data ? (
            <FlexBox col overflow="hidden" alignCenter justifyCenter sx={{ minHeight: 350 }}>
              <Line>AI summary will appear here when available. API keys need to be added to your environment variables.</Line>
              <FlexBox
                position="absolute"
                sx={{
                  opacity: 0.3,
                  bottom: theme.spacing(-0),
                  height: '400px',
                  maxHeight: '50%'
                }}
              >
                <RocketGraphic />
              </FlexBox>
            </FlexBox>
          ) : (
            <>
              <FlexBox gap1 alignCenter>
                <Alert
                  icon={<CheckRounded fontSize="inherit" />}
                  severity="success"
                  sx={{ flex: 1 }}
                >
                  <Line white>{data.dora_metrics_score}</Line>
                </Alert>
                <Button
                  variant="outlined"
                  onClick={() => {
                    copy(
                      Object.entries(data)
                        .map(
                          ([key, val]) =>
                            `# ${v.titleCase(key).replaceAll('_', ' ')}\n${val}`
                        )
                        .join('\n\n')
                    );
                    enqueueSnackbar('Copied!', { variant: 'success' });
                  }}
                >
                  Copy
                </Button>
              </FlexBox>
              <Card
                sx={{
                  '.MuiTabPanel-root': { p: 2 },
                  '.MuiTabs-scroller': { overflow: 'auto' },
                  table: { m: -1 },
                  th: { color: theme.colors.primary.main, fontSize: '1.1em' },
                  'td:first-of-type': {
                    fontWeight: 'bold',
                    color: theme.colors.secondary.main
                  },
                  'th, td': { textAlign: 'left', verticalAlign: 'top', p: 1 }
                }}
              >
                <TabContext value={selectedTab.value}>
                  <FlexBox alignCenter gap1 px={1} fullWidth>
                    <IconButton
                      size="small"
                      onClick={() =>
                        selectedTab.set((n: string) =>
                          String(
                            Math.max(
                              0,
                              Number(n) - 1
                            )
                          )
                        )
                      }
                    >
                      <ChevronLeftRounded />
                    </IconButton>
                    <TabList
                      onChange={(_, val: string) => selectedTab.set(val)}
                      sx={{ flex: 1 }}
                      variant="scrollable"
                      scrollButtons="auto"
                    >
                      <Tab
                        label="DORA Overview"
                        value={String(AnalysisTabs.dora_compiled_summary)}
                      />
                      <Tab
                        label="DORA Trends"
                        value={String(AnalysisTabs.dora_trend_summary)}
                      />
                      <Tab
                        label="Lead Time"
                        value={String(AnalysisTabs.lead_time_trends_summary)}
                      />
                      <Tab
                        label="Deployment Frequency"
                        value={String(
                          AnalysisTabs.deployment_frequency_trends_summary
                        )}
                      />
                      <Tab
                        label="Change Failure Rate"
                        value={String(
                          AnalysisTabs.change_failure_rate_trends_summary
                        )}
                      />
                      <Tab
                        label="Time to Recovery"
                        value={String(
                          AnalysisTabs.mean_time_to_recovery_trends_summary
                        )}
                      />
                    </TabList>
                    <IconButton
                      size="small"
                      onClick={() =>
                        selectedTab.set((n: string) =>
                          String(
                            Math.min(
                              Object.keys(AnalysisTabs).length / 2 - 1,
                              Number(n) + 1
                            )
                          )
                        )
                      }
                    >
                      <ChevronRightRounded />
                    </IconButton>
                  </FlexBox>
                  <TabPanel value={String(AnalysisTabs.dora_compiled_summary)}>
                    <Markdown>{data.dora_compiled_summary}</Markdown>
                  </TabPanel>
                  <TabPanel
                    value={String(AnalysisTabs.dora_trend_summary)}
                    sx={{ 'table td:first-of-type': { whiteSpace: 'nowrap' } }}
                  >
                    <Markdown>{data.dora_trend_summary}</Markdown>
                  </TabPanel>
                  <TabPanel
                    value={String(AnalysisTabs.lead_time_trends_summary)}
                    sx={{ 'table td:first-of-type': { whiteSpace: 'nowrap' } }}
                  >
                    <Markdown>{data.lead_time_trends_summary}</Markdown>
                  </TabPanel>
                  <TabPanel
                    value={String(
                      AnalysisTabs.deployment_frequency_trends_summary
                    )}
                    sx={{ 'table td:first-of-type': { whiteSpace: 'nowrap' } }}
                  >
                    <Markdown>
                      {data.deployment_frequency_trends_summary}
                    </Markdown>
                  </TabPanel>
                  <TabPanel
                    value={String(
                      AnalysisTabs.change_failure_rate_trends_summary
                    )}
                    sx={{ 'table td:first-of-type': { whiteSpace: 'nowrap' } }}
                  >
                    <Markdown>{data.change_failure_rate_trends_summary}</Markdown>
                  </TabPanel>
                  <TabPanel
                    value={String(
                      AnalysisTabs.mean_time_to_recovery_trends_summary
                    )}
                    sx={{ 'table td:first-of-type': { whiteSpace: 'nowrap' } }}
                  >
                    <Markdown>
                      {data.mean_time_to_recovery_trends_summary}
                    </Markdown>
                  </TabPanel>
                </TabContext>
              </Card>
            </>
          )}
        </FlexBox>
      ) : (
        <FlexBox col>
          {renderFeatureSelection()}
          {renderAgentInterface()}
        </FlexBox>
      )}
    </FlexBox>
  );
};

const Markdown: typeof ReactMarkdown = (props: any) => (
  <ReactMarkdown {...props} remarkPlugins={[gfm]} />
);

enum AnalysisTabs {
  dora_compiled_summary,
  dora_trend_summary,
  lead_time_trends_summary,
  deployment_frequency_trends_summary,
  change_failure_rate_trends_summary,
  mean_time_to_recovery_trends_summary
}
