import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { handleRequest } from '@/api-helpers/axios';

// Define the schema for path parameters
const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

// Define the schema for query parameters
const getSchema = yup.object().shape({
  from_date: yup.date().required(),
  to_date: yup.date().required()
});

// Create a new endpoint handler
const endpoint = new Endpoint(pathSchema);

// Define the response type for contributors
export interface Contributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
  contributions: number;
  repositories: Array<{
    name: string;
    contributions: number;
  }>;
}

// Handle GET requests
endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id, from_date, to_date } = req.payload;
  
  try {
    // Call our backend API to get contributors for the team
    const response = await handleRequest<{ contributors: Contributor[] }>(
      `/teams/${team_id}/contributors`,
      {
        params: {
          from_time: from_date,
          to_time: to_date
        }
      }
    );
    
    return res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching team contributors:', error);
    return res.status(error.status || 500).json({ 
      error: 'Failed to fetch contributors',
      details: error.data?.message || error.message 
    });
  }
});

export default endpoint.serve();