export const CATEGORIES = [
  "Productivity",
  "Finance",
  "Health",
  "Education",
  "Business Tools",
  "E-commerce",
  "Developer Tools",
  "Parenting",
  "Travel",
  "Other",
] as const;

export type PainPointCategory = (typeof CATEGORIES)[number];

export type Rubric = {
  frequencySignal: number;
  willingnessToPaySignal: number;
  specificity: number;
  solutionGap: number;
};

export type ClassificationResult = {
  isPainPoint: boolean;
  problemSummary: string;
  category: PainPointCategory;
  intensity: number;
  willingnessToPay: boolean;
  confidence: number;
  evidenceQuote: string;
  rubric: Rubric;
};

export type DashboardStats = {
  totalPosts: number;
  totalPainPoints: number;
  painPointsThisWeek: number;
  topCategoryThisWeek: string;
  categoryCounts: { name: string; count: number }[];
  dailyCounts: { date: string; count: number }[];
  filteredOut: number;
  weakClusters: number;
};

export type LeanPost = {
  _id: string;
  subreddit: string;
  title: string;
  summary: string;
  author: string;
  url: string;
  publishedAt: string;
  matchedPhrase: string;
  processed: boolean;
  engagementScore?: number;
  score?: number;
  numComments?: number;
  upvoteRatio?: number;
};

export type LeanPainPoint = {
  _id: string;
  postId: LeanPost | string;
  isPainPoint: boolean;
  problemSummary: string;
  category: string;
  intensity: number;
  willingnessToPay: boolean;
  confidence: number;
  evidenceQuote: string;
  rubric: Rubric;
  createdAt: string;
};

export type LeanCluster = {
  _id: string;
  theme: string;
  category: string;
  painPointIds: LeanPainPoint[] | string[];
  frequency: number;
  avgIntensity: number;
  avgConfidence: number;
  totalEngagementScore: number;
  willingnessToPayCount: number;
  distinctAuthors: number;
  distinctSubreddits: number;
  timeSpreadDays: number;
  cohesion: number;
  solutionSaturation: number;
  opportunityScore: number;
  isWeak: boolean;
  lastUpdated: string;
};

export type ScrapeHealth = {
  phrase: string;
  subreddit: string;
  ranAt: string;
  found: number;
  inserted: number;
  filtered: number;
};
