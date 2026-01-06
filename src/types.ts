export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string | number;
  statusCode?: number;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface Owner {
  id: string;
  username: string;
  avatar?: string;
}

export interface Bot {
  id: string;
  name: string;
  description?: string;
  shortDescription?: string;
  logo?: string;
  banner?: string;
  inviteUrl?: string;
  supportServerUrl?: string;
  websiteUrl?: string;
  documentationUrl?: string;
  githubUrl?: string;
  categories?: string[];
  tags?: string[];
  prefix?: string;
  votes?: number;
  guilds?: number;
  certified?: boolean;
  verified?: boolean;
  partnered?: boolean;
  nsfw?: boolean;
  owner?: Owner;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSummary {
  id: string;
  username: string;
  avatar?: string;
  stats?: {
    totalBots?: number;
    approvedBots?: number;
    totalVotes?: number;
    totalViews?: number;
    joinedAt?: string;
  };
}

export interface StatRecord {
  _id?: string;
  botId: string;
  userId?: string;
  guildCount?: number;
  userCount?: number;
  shardCount?: number;
  createdAt?: string;
}
