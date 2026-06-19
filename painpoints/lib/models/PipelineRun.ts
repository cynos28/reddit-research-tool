import { Model, Schema, model, models } from "mongoose";

export interface IPipelineRun {
  startedAt: Date;
  finishedAt: Date;
  ok: boolean;
  scrapeInserted: number;
  scrapeFiltered: number;
  scrapeErrors: number;
  classified: number;
  painPointsFound: number;
  clusters: number;
  weakClusters: number;
  message?: string;
}

const PipelineRunSchema = new Schema<IPipelineRun>(
  {
    startedAt: { type: Date, required: true, index: true },
    finishedAt: { type: Date, required: true },
    ok: { type: Boolean, default: true, index: true },
    scrapeInserted: { type: Number, default: 0 },
    scrapeFiltered: { type: Number, default: 0 },
    scrapeErrors: { type: Number, default: 0 },
    classified: { type: Number, default: 0 },
    painPointsFound: { type: Number, default: 0 },
    clusters: { type: Number, default: 0 },
    weakClusters: { type: Number, default: 0 },
    message: { type: String },
  },
  { versionKey: false },
);

export const PipelineRun =
  (models.PipelineRun as Model<IPipelineRun>) ||
  model<IPipelineRun>("PipelineRun", PipelineRunSchema);
