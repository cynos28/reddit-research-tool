import { Model, Schema, Types, model, models } from "mongoose";

export interface ICluster {
  clusterKey: string;
  theme: string;
  category: string;
  painPointIds: Types.ObjectId[];
  frequency: number;
  avgIntensity: number;
  totalEngagementScore: number;
  willingnessToPayCount: number;
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
    totalEngagementScore: { type: Number, default: 0, index: true },
    willingnessToPayCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const Cluster =
  (models.Cluster as Model<ICluster>) || model<ICluster>("Cluster", ClusterSchema);
