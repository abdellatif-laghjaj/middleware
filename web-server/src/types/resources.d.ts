// ...existing code...

export interface BaseRepo {
  id: number;
  name: string;
  desc: string;
  slug: string;
  web_url: string;
  branch: string | null;
  parent: string;
  provider: Integration;
  
  // Keep only avatar_url
  avatar_url?: string;
  // ...existing fields...
}

// ...existing code...
