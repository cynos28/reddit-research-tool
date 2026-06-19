import { Model, Schema, model, models } from "mongoose";

export interface IPost {
  subreddit: string;
  title: string;
  summary: string;
  author: string;
  url: string;
  publishedAt: Date;
  matchedPhrase: string;
  scrapedAt: Date;
  processed: boolean;
  engagementScore: number;
  score: number;
  numComments: number;
  upvoteRatio: number;
  normalizedHash: string;
  filteredOut: boolean;
  filterReason: string;
}

const PostSchema = new Schema<IPost>(
  {
    subreddit: { type: String, required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    author: { type: String, default: "unknown" },
    url: { type: String, required: true, unique: true },
    publishedAt: { type: Date, required: true, index: true },
    matchedPhrase: { type: String, required: true },
    scrapedAt: { type: Date, default: Date.now },
    processed: { type: Boolean, default: false, index: true },
    engagementScore: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    numComments: { type: Number, default: 0 },
    upvoteRatio: { type: Number, default: 0 },
    normalizedHash: { type: String, default: "", index: true },
    filteredOut: { type: Boolean, default: false, index: true },
    filterReason: { type: String, default: "" },
  },
  { versionKey: false },
);

export const Post =
  (models.Post as Model<IPost>) || model<IPost>("Post", PostSchema);
