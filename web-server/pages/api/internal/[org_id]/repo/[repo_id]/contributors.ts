import * as yup from 'yup';
import axios from 'axios';

import { Endpoint } from '@/api-helpers/global';
import { handleRequest } from '@/api-helpers/axios';
import { db, getFirstRow, dbRaw } from '@/utils/db';
import { Table, Integration } from '@/constants/db';
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
  return await db('Integration')
    .select()
    .where({
      org_id,
      name: Integration.GITHUB
    })
    .returning('*')
    .then(getFirstRow)
    .then((r) => dec(r.access_token_enc_chunks));
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
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    // Get GitHub integration token using the correct method
    const token = await getGithubToken(org_id);
    
    if (!token) {
      return res.status(400).json({ error: 'GitHub integration not configured' });
    }
    
    // Format the repository path
    const repoPath = `${repoInfo.parent}/${repoInfo.slug}`;
    
    // Call GitHub API to get contributors
    const githubApiUrl = `https://api.github.com/repos/${repoPath}/contributors`;
    const response = await axios.get<GitHubContributor[]>(githubApiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      },
      params: {
        // GitHub API doesn't directly support date filtering for contributors
        // We'll fetch all and filter on our side if needed
        per_page: 100
      }
    });
    
    // Map GitHub response to our expected format
    const contributors = response.data.map(contributor => ({
      name: contributor.login,
      avatar_url: contributor.avatar_url,
      contributions: contributor.contributions
    }));
    
    return res.status(200).json(contributors);
  } catch (error) {
    console.error('Error fetching GitHub contributors:', error);
    return res.status(500).json({ error: 'Failed to fetch contributors' });
  }
});

export default endpoint.serve();