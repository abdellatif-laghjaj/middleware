import {
  AutoAwesomeRounded,
  CheckRounded,
  ChevronLeftRounded,
  ChevronRightRounded
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
  Tab,
  TextField,
  useTheme
} from '@mui/material';
import { AxiosError } from 'axios';
import copy from 'copy-to-clipboard';
import { enqueueSnackbar } from 'notistack';
import { useEffect, useMemo } from 'react';
import { AiOutlineOpenAI } from 'react-icons/ai';
import { FaMeta } from 'react-icons/fa6';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import v from 'voca';
import { SiGooglegemini } from 'react-icons/si';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useAxios } from '@/hooks/useAxios';
import { useEasyState } from '@/hooks/useEasyState';
import { usePrevious } from '@/hooks/usePrevious';
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

export const AIAnalysis = () => {
  const [models, { loading: loadingModels, fetch: fetchModels }] = useAxios<
    Model[]
  >(`/internal/ai/models`, { manual: true });

  const dispatch = useDispatch();
  const theme = useTheme();
  const doraData = useSelector((s) => s.doraMetrics.metrics_summary);
  const savedSummary = useSelector((s) => s.doraMetrics.ai_summary);
  const savedToken = useSelector((s) => s.doraMetrics.ai_summary_token);

  const [response, { loading: loadingData, fetch: loadData, error: loadDataError }] =
    useAxios<DoraAiAPIResponse>(`/internal/ai/dora_metrics`, {
      manual: true,
      onError: noOp
    });

  const data = useMemo(
    () => response || savedSummary,
    [response, savedSummary]
  );

  const selectedModel = useEasyState<Model>(Model.GPT4o);
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

  const handleGenerate = () => {
    loadData({
      method: 'POST',
      data: {
        model: selectedModel.value,
        data: doraData
      }
    })
      .then((r) => {
        dispatch(
          doraMetricsSlice.actions.setAiSummary({
            summary: r.data,
            token: ''
          })
        );
        selectedTab.set(String(AnalysisTabs.dora_trend_summary));
      })
      .catch((r: AxiosError) => {
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
      });
  };

  return (
    <FlexBox
      col
      gap1
      sx={{ ['[data-lastpass-icon-root]']: { display: 'none' } }}
    >
      <FlexBox gap1 fullWidth>
        <Select
          value={selectedModel.value || models?.[0] || Model.GPT4o}
          renderValue={(m) => modelLabelsMap[m as Model] || m}
          onChange={(e) => selectedModel.set(e.target.value as Model)}
          startAdornment={
            loadingModels ? (
              <InputAdornment position="start">
                <CircularProgress size={theme.spacing(1.5)} />
              </InputAdornment>
            ) : null
          }
          sx={{ flex: 1 }}
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
        <Button
          onClick={handleGenerate}
          disabled={loadingData}
          endIcon={
            loadingData ? (
              <CircularProgress size={theme.spacing(1.5)} />
            ) : (
              <AutoAwesomeRounded />
            )
          }
          sx={{ pl: 1.5 }}
          variant="contained"
        >
          Generate!
        </Button>
      </FlexBox>
      <FlexBox col gap1>
        {!data ? (
          <FlexBox col overflow="hidden">
            <Line>Select a model and click "Generate". API keys need to be added to your environment variables.</Line>
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
                      selectedTab.set((n) =>
                        String(
                          n === String(AnalysisTabs.dora_trend_summary)
                            ? AnalysisTabs.mean_time_to_recovery_trends_summary
                            : Number(n) - 1
                        )
                      )
                    }
                  >
                    <ChevronLeftRounded />
                  </IconButton>
                  <TabList
                    onChange={(_, n) => selectedTab.set(n)}
                    sx={{ mt: 1, flex: 1 }}
                  >
                    <Tab label="Summary" value="0" />
                    <Tab label="Trends" value="1" />
                    <Tab label="Lead Time" value="2" />
                    <Tab label="Deployments" value="3" />
                    <Tab label="Failure Rate" value="4" />
                    <Tab label="Recovery Time" value="5" />
                  </TabList>

                  <IconButton
                    size="small"
                    onClick={() =>
                      selectedTab.set((n) => String((Number(n) + 1) % 6))
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
    </FlexBox>
  );
};

const Markdown: typeof ReactMarkdown = (props) => (
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
