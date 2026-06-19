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

export type ClassificationResult = {
  isPainPoint: boolean;
  problemSummary: string;
  category: PainPointCategory;
  intensity: number;
  willingnessToPay: boolean;
};

export type DashboardStats = {
  totalPosts: number;
  totalPainPoints: number;
  painPointsThisWeek: number;
  topCategoryThisWeek: string;
  categoryCounts: { name: string; count: number }[];
  dailyCounts: { date: string; count: number }[];
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
};

export type LeanPainPoint = {
  _id: string;
  postId: LeanPost | string;
  isPainPoint: boolean;
  problemSummary: string;
  category: string;
  intensity: number;
  willingnessToPay: boolean;
  createdAt: string;
};

export type LeanCluster = {
  _id: string;
  theme: string;
  category: string;
  painPointIds: LeanPainPoint[] | string[];
  frequency: number;
  avgIntensity: number;
  totalEngagementScore: number;
  willingnessToPayCount: number;
  lastUpdated: string;
};
