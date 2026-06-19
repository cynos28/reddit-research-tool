import { isValidObjectId } from "mongoose";
import { Cluster } from "@/lib/models/Cluster";
import { PainPoint } from "@/lib/models/PainPoint";
import { Post } from "@/lib/models/Post";
import { connectToDatabase } from "@/lib/mongodb";
import type { DashboardStats, LeanCluster, LeanPost } from "@/types";

function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getDashboardData() {
  await connectToDatabase();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);

  const [totalPosts, totalPainPoints, painPointsThisWeek, categories, daily, clusters] =
    await Promise.all([
      Post.countDocuments(),
      PainPoint.countDocuments({ isPainPoint: true }),
      PainPoint.countDocuments({ isPainPoint: true, createdAt: { $gte: weekStart } }),
      PainPoint.aggregate([
        { $match: { isPainPoint: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      PainPoint.aggregate([
        { $match: { isPainPoint: true, createdAt: { $gte: monthStart } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Cluster.find().sort({ frequency: -1, avgIntensity: -1 }).limit(10).lean(),
    ]);

  const weeklyCategories = await PainPoint.aggregate([
    { $match: { isPainPoint: true, createdAt: { $gte: weekStart } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);
  const byDate = new Map(daily.map((item) => [item._id, item.count]));
  const dailyCounts = Array.from({ length: 30 }, (_, offset) => {
    const date = new Date(monthStart);
    date.setDate(monthStart.getDate() + offset);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: byDate.get(key) ?? 0 };
  });

  const stats: DashboardStats = {
    totalPosts,
    totalPainPoints,
    painPointsThisWeek,
    topCategoryThisWeek: weeklyCategories[0]?._id ?? "—",
    categoryCounts: categories.map((item) => ({ name: item._id, count: item.count })),
    dailyCounts,
  };
  return { stats, clusters: serialize<LeanCluster[]>(clusters) };
}

export async function getClusters(sort = "frequency", category = "") {
  await connectToDatabase();
  const sortField = ["frequency", "avgIntensity", "totalEngagementScore"].includes(sort)
    ? sort
    : "frequency";
  const filter = category ? { category } : {};
  const clusters = await Cluster.find(filter)
    .sort({ [sortField]: -1 })
    .populate({
      path: "painPointIds",
      populate: { path: "postId", model: "Post" },
    })
    .lean();
  return serialize<LeanCluster[]>(clusters);
}

export async function getCluster(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  const cluster = await Cluster.findById(id)
    .populate({
      path: "painPointIds",
      populate: { path: "postId", model: "Post" },
    })
    .lean();
  return cluster ? serialize<LeanCluster>(cluster) : null;
}

export async function getPosts(filter: Record<string, unknown> = {}, limit = 100) {
  await connectToDatabase();
  const posts = await Post.find(filter).sort({ publishedAt: -1 }).limit(limit).lean();
  return serialize<LeanPost[]>(posts);
}
