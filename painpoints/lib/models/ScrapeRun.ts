import { Model, Schema, model, models } from "mongoose";

export interface IScrapeRun {
  key: string;
  ranAt: Date;
  found: number;
  inserted: number;
}

const ScrapeRunSchema = new Schema<IScrapeRun>(
  {
    key: { type: String, required: true, unique: true },
    ranAt: { type: Date, required: true, index: true },
    found: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const ScrapeRun =
  (models.ScrapeRun as Model<IScrapeRun>) ||
  model<IScrapeRun>("ScrapeRun", ScrapeRunSchema);
