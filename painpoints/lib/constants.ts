export const DEFAULT_PHRASES = [
  "I wish there was",
  "is there a tool that",
  "so frustrating that",
  "looking for an alternative to",
  "no good solution for",
  "why is there no",
  "sick of",
];

export const CLASSIFICATION_BATCH_SIZE = 10;
export const CLASSIFICATION_DELAY_MS = 350;
export const SCRAPE_DELAY_MS = 1_750;
export const SCRAPE_COOLDOWN_HOURS = 4;
export const CLUSTER_SIMILARITY_THRESHOLD = 0.78;

// Scrape-stage filters
export const MIN_POST_LENGTH = 200;
export const MIN_SCORE = 2;
export const MIN_COMMENTS = 3;
export const MAX_POST_AGE_DAYS = 180;
export const NEGATIVE_PHRASES = [
  "recommend",
  "recommendations",
  " vs ",
  "which is better",
  "best app",
  "best tool",
];

// Classifier
export const RUBRIC_THRESHOLD = 7; // out of 12; sum of 4 axes 0-3
export const CONFIDENCE_RECHECK = 0.8;

// Cluster gates
export const MIN_CLUSTER_SIZE = 5;
export const MIN_DISTINCT_AUTHORS = 3;
export const MIN_DISTINCT_SUBREDDITS = 2;
export const MIN_TIME_SPREAD_DAYS = 7;
export const MIN_COHESION = 0.7;

// Pipeline guardrails
export const PIPELINE_MIN_INTERVAL_MS = 5 * 60 * 1000;

// Phrase validation
export const MIN_PHRASE_LEN = 3;
export const MAX_PHRASE_LEN = 120;

// Solution-saturation heuristic: brand mentions in summaries inside a cluster
export const COMMON_TOOLS = [
  "notion","airtable","trello","asana","monday","clickup","linear","jira","slack",
  "zapier","make","n8n","hubspot","salesforce","stripe","quickbooks","xero","shopify",
  "webflow","wordpress","figma","canva","mailchimp","klaviyo","intercom","zendesk",
  "google sheets","excel","calendly","loom","zoom",
];
