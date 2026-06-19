import { Model, Schema, model, models } from "mongoose";
import { DEFAULT_PHRASES, DEFAULT_SUBREDDITS } from "@/lib/constants";

export interface ISettings {
  key: string;
  subreddits: string[];
  phrases: string[];
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: "scraper", unique: true },
    subreddits: { type: [String], default: DEFAULT_SUBREDDITS },
    phrases: { type: [String], default: DEFAULT_PHRASES },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

export const Settings =
  (models.Settings as Model<ISettings>) || model<ISettings>("Settings", SettingsSchema);
