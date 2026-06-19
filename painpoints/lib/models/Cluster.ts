import { Model, Schema, Types, model, models } from "mongoose";

export interface ICluster {
  clusterKey: string;
  theme: string;
  category: string;
  painPointIds: Types.ObjectId[];
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
  lastUpdated: Date;
}

const ClusterSchema = new Schema<ICluster>(
  {
    clusterKey: { type: String, required: true, unique: true },
    theme: { type: String, required: true },
    category: { type: String, required: true, index: true },
    painPointIds: [{ type: Schema.Types.ObjectId, ref: "PainPoint" }],
    frequency: { type: Number, required: true, index: true },
    avgIntensity: { type: Number, required: true, index: true },
    avgConfidence: { type: Number, default: 0 },
    totalEngagementScore: { type: Number, default: 0, index: true },
    willingnessToPayCount: { type: Number, default: 0 },
    distinctAuthors: { type: Number, default: 0, index: true },
    distinctSubreddits: { type: Number, default: 0 },
    timeSpreadDays: { type: Number, default: 0 },
    cohesion: { type: Number, default: 0 },
    solutionSaturation: { type: Number, default: 0 },
    opportunityScore: { type: Number, default: 0, index: true },
    isWeak: { type: Boolean, default: false, index: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const Cluster =
  (models.Cluster as Model<ICluster>) || model<ICluster>("Cluster", ClusterSchema);
