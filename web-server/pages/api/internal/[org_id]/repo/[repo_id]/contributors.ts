import * as yup from 'yup';
import axios from 'axios';

import { Endpoint } from '@/api-helpers/global';
import { handleRequest } from '@/api-helpers/axios';
import { db, getFirstRow, dbRaw } from '@/utils/db';
import { Table } from '@/constants/db';
import { Integration } from '@/constants/integrations';
import { dec } from '@/utils/auth-supplementary';

// Define the schema for path parameters
const pathSchema = yup.object().shape({
  org_id: yup.string().required(),
  repo_id: yup.string().required()
});

// Define the schema for query parameters
const getSchema = yup.object().shape({
  from_date: yup.string().required(),
  to_date: yup.string().required()
});

// Create a new endpoint handler
const endpoint = new Endpoint(pathSchema);

// Define the response type for GitHub contributors
interface GitHubContributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

// Get GitHub token from Integration table
const getGithubToken = async (org_id: string) => {
  try {
    const integration = await db('Integration')
      .select()
      .where({
        org_id,
        name: Integration.GITHUB
      })
      .returning('*')
      .then(getFirstRow);
    
    if (!integration || !integration.access_token_enc_chunks) {
      console.log('GitHub integration not found or token missing');
      return null;
    }
    
    return dec(integration.access_token_enc_chunks);
  } catch (error) {
    console.error('Error retrieving or decrypting token:', error);
    return null;
  }
};

// Handle GET requests
endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, repo_id } = req.payload;
  const { from_date, to_date } = req.query;
  
  try {
    // Get repository information from the database
    const repoInfo = await db(Table.OrgRepo)
      .where('id', repo_id)
      .andWhere('org_id', org_id)
      .first();
    
    if (!repoInfo) {
      console.error(`Repository not found: repo_id=${repo_id}, org_id=${org_id}`);
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    console.log(`Repository info retrieved:`, {
      id: repoInfo.id,
      name: repoInfo.name,
      org_name: repoInfo.org_name,
      provider: repoInfo.provider
    });
    
    // Get GitHub integration token using the correct method
    let token;
    try {
      token = await getGithubToken(org_id);
      if (!token) {
        return res.status(400).json({ error: 'GitHub integration not configured' });
      }
    } catch (tokenError) {
      console.error('Error retrieving GitHub token:', tokenError);
      return res.status(400).json({ error: 'Failed to retrieve GitHub token' });
    }
    
    // Format the repository path
    const repoPath = `${repoInfo.org_name}/${repoInfo.name}`;
    console.log(`Fetching contributors for repo: ${repoPath}`);
    
    // Call GitHub API to get contributors
    const githubApiUrl = `https://api.github.com/repos/${repoPath}/contributors`;
    console.log(`GitHub API URL: ${githubApiUrl}`);
    
    try {
      // GitHub API authentication - try different formats based on project patterns
      const headers = {};
      
      // Check token format and use appropriate header
      if (token.startsWith('ghp_') || token.startsWith('github_pat_')) {
        // Personal Access Token format
        headers['Authorization'] = `token ${token}`;
      } else {
        // OAuth token format
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      headers['Accept'] = 'application/vnd.github.v3+json';
      
      console.log(`Making GitHub API request with token type: ${token.startsWith('ghp_') || token.startsWith('github_pat_') ? 'Personal Access Token' : 'OAuth token'}`);
      
      const response = await axios.get<GitHubContributor[]>(githubApiUrl, {
        headers,
        params: {
          per_page: 100
        },
        validateStatus: status => status < 500 // Don't throw on 4xx errors so we can handle them
      });
      
      if (response.status !== 200) {
        console.error(`GitHub API error: Status ${response.status}`, response.data);
        return res.status(response.status).json({
          error: 'GitHub API error',
          details: response.data?.message || 'Unknown error',
          status: response.status
        });
      }
      
      // Map GitHub response to our expected format
      const contributors = response.data.map(contributor => ({
        name: contributor.login,
        avatar_url: contributor.avatar_url,
        contributions: contributor.contributions
      }));
      
      return res.status(200).json(contributors);
    } catch (apiError: any) {
      console.error('GitHub API error:', apiError.response?.data || apiError.message);
      return res.status(apiError.response?.status || 500).json({ 
        error: 'GitHub API error', 
        details: apiError.response?.data?.message || apiError.message 
      });
    }
  } catch (error: any) {
    console.error('Error fetching GitHub contributors:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch contributors',
      details: error.message
    });
  }
});

export default endpoint.serve();