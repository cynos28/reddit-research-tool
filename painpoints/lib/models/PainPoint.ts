import { Model, Schema, Types, model, models } from "mongoose";
import { CATEGORIES, type PainPointCategory } from "@/types";

export interface IPainPoint {
  postId: Types.ObjectId;
  isPainPoint: boolean;
  problemSummary: string;
  category: PainPointCategory;
  intensity: number;
  willingnessToPay: boolean;
  embedding?: number[];
  createdAt: Date;
}

const PainPointSchema = new Schema<IPainPoint>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, unique: true },
    isPainPoint: { type: Boolean, required: true, index: true },
    problemSummary: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, default: "Other", index: true },
    intensity: { type: Number, min: 1, max: 5, default: 1, index: true },
    willingnessToPay: { type: Boolean, default: false },
    embedding: { type: [Number], select: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false },
);

export const PainPoint =
  (models.PainPoint as Model<IPainPoint>) ||
  model<IPainPoint>("PainPoint", PainPointSchema);
