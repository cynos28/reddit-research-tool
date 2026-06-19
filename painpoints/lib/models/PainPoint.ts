import { Model, Schema, Types, model, models } from "mongoose";
import { CATEGORIES, type PainPointCategory } from "@/types";

export interface IPainPointRubric {
  frequencySignal: number;
  willingnessToPaySignal: number;
  specificity: number;
  solutionGap: number;
}

export interface IPainPoint {
  postId: Types.ObjectId;
  isPainPoint: boolean;
  problemSummary: string;
  category: PainPointCategory;
  intensity: number;
  willingnessToPay: boolean;
  confidence: number;
  evidenceQuote: string;
  rubric: IPainPointRubric;
  rubricTotal: number;
  rawClassification?: unknown;
  embedding?: number[];
  createdAt: Date;
}

const RubricSchema = new Schema<IPainPointRubric>(
  {
    frequencySignal: { type: Number, min: 0, max: 3, default: 0 },
    willingnessToPaySignal: { type: Number, min: 0, max: 3, default: 0 },
    specificity: { type: Number, min: 0, max: 3, default: 0 },
    solutionGap: { type: Number, min: 0, max: 3, default: 0 },
  },
  { _id: false },
);

const PainPointSchema = new Schema<IPainPoint>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, unique: true },
    isPainPoint: { type: Boolean, required: true, index: true },
    problemSummary: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, default: "Other", index: true },
    intensity: { type: Number, min: 1, max: 5, default: 1, index: true },
    willingnessToPay: { type: Boolean, default: false },
    confidence: { type: Number, min: 0, max: 1, default: 0, index: true },
    evidenceQuote: { type: String, default: "" },
    rubric: { type: RubricSchema, default: () => ({}) },
    rubricTotal: { type: Number, default: 0, index: true },
    rawClassification: { type: Schema.Types.Mixed, select: false },
    embedding: { type: [Number], select: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export const PainPoint =
  (models.PainPoint as Model<IPainPoint>) ||
  model<IPainPoint>("PainPoint", PainPointSchema);
