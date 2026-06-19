import { createHash } from "node:crypto";
import {
  CLUSTER_SIMILARITY_THRESHOLD,
  COMMON_TOOLS,
  MIN_CLUSTER_SIZE,
  MIN_COHESION,
  MIN_DISTINCT_AUTHORS,
  MIN_DISTINCT_SUBREDDITS,
  MIN_TIME_SPREAD_DAYS,
} from "@/lib/constants";
import { Cluster } from "@/lib/models/Cluster";
import { PainPoint } from "@/lib/models/PainPoint";
import { Post } from "@/lib/models/Post";
import { connectToDatabase } from "@/lib/mongodb";
import { createEmbeddings } from "@/lib/openai";

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] ** 2;
    normB += b[index] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

function averageVectors(vectors: number[][]) {
  return vectors[0].map((_, index) =>
    vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length,
  );
}

function pairwiseCohesion(vectors: number[][]) {
  if (vectors.length < 2) return 1;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < vectors.length; i += 1) {
    for (let j = i + 1; j < vectors.length; j += 1) {
      sum += cosineSimilarity(vectors[i], vectors[j]);
      count += 1;
    }
  }
  return count ? sum / count : 1;
}

function recencyDecay(latest: Date, halfLifeDays = 30) {
  const ageDays = (Date.now() - latest.getTime()) / (24 * 60 * 60 * 1000);
  return Math.pow(0.5, Math.max(ageDays, 0) / halfLifeDays);
}

function solutionSaturation(summaries: string[]) {
  if (!summaries.length) return 0;
  const mentions = summaries.filter((text) => {
    const haystack = text.toLowerCase();
    return COMMON_TOOLS.some((tool) => haystack.includes(tool));
  }).length;
  return mentions / summaries.length;
}

export async function clusterPainPoints() {
  await connectToDatabase();
  const painPoints = await PainPoint.find({ isPainPoint: true })
    .select("+embedding")
    .populate({ path: "postId", select: "engagementScore author subreddit publishedAt score numComments" })
    .lean();

  if (!painPoints.length) {
    await Cluster.deleteMany({});
    return { clustered: 0, clusters: 0, weak: 0 };
  }

  const missing = painPoints.filter((point) => !point.embedding?.length);
  for (let index = 0; index < missing.length; index += 100) {
    const batch = missing.slice(index, index + 100);
    const embeddings = await createEmbeddings(batch.map((point) => point.problemSummary));
    await Promise.all(
      batch.map((point, batchIndex) => {
        point.embedding = embeddings[batchIndex];
        return PainPoint.updateOne(
          { _id: point._id },
          { $set: { embedding: embeddings[batchIndex] } },
        );
      }),
    );
  }

  const groups: (typeof painPoints)[] = [];
  for (const point of painPoints) {
    const matchingGroup = groups.find((group) => {
      if (group[0].category !== point.category) return false;
      const centroid = averageVectors(group.map((item) => item.embedding!));
      return cosineSimilarity(centroid, point.embedding!) >= CLUSTER_SIMILARITY_THRESHOLD;
    });
    if (matchingGroup) matchingGroup.push(point);
    else groups.push([point]);
  }

  const activeKeys: string[] = [];
  let weak = 0;

  const operations = groups.map((group) => {
    const ids = group.map((point) => String(point._id)).sort();
    const clusterKey = createHash("sha1").update(ids.join(":"), "utf8").digest("hex");
    activeKeys.push(clusterKey);

    const posts = group.map((point) => point.postId as unknown as {
      engagementScore?: number;
      author?: string;
      subreddit?: string;
      publishedAt?: Date;
      score?: number;
      numComments?: number;
    });

    const engagement = posts.reduce((sum, p) => sum + (p?.engagementScore ?? 0), 0);
    const namedAuthors = new Set(
      posts.map((p) => (p?.author || "").toLowerCase()).filter((a) => a && a !== "unknown"),
    );
    // If we have no usable usernames, treat each post as a distinct author so the cluster
    // still surfaces. Otherwise the strict "named-author" count would suppress everything.
    const authors = namedAuthors.size > 0 ? namedAuthors : new Set(posts.map((_, i) => String(i)));
    const subs = new Set(posts.map((p) => (p?.subreddit || "").toLowerCase()).filter(Boolean));
    const dates = posts.map((p) => new Date(p?.publishedAt ?? Date.now()).getTime()).sort();
    const timeSpreadDays = dates.length
      ? (dates[dates.length - 1] - dates[0]) / (24 * 60 * 60 * 1000)
      : 0;
    const cohesion = pairwiseCohesion(group.map((point) => point.embedding!));
    const saturation = solutionSaturation(group.map((point) => point.problemSummary));
    const avgIntensity = group.reduce((sum, point) => sum + point.intensity, 0) / group.length;
    const avgConfidence = group.reduce((sum, point) => sum + (point.confidence ?? 0), 0) / group.length;
    const latest = new Date(dates[dates.length - 1] || Date.now());

    const isWeak =
      group.length < MIN_CLUSTER_SIZE ||
      authors.size < MIN_DISTINCT_AUTHORS ||
      subs.size < MIN_DISTINCT_SUBREDDITS ||
      timeSpreadDays < MIN_TIME_SPREAD_DAYS ||
      cohesion < MIN_COHESION;
    if (isWeak) weak += 1;

    // Composite opportunity score
    const opportunityScore =
      Math.log(1 + authors.size) *
      avgIntensity *
      recencyDecay(latest) *
      (1 - saturation) *
      (cohesion) *
      (1 + Math.log10(1 + engagement));

    return {
      updateOne: {
        filter: { clusterKey },
        update: {
          $set: {
            clusterKey,
            theme: group[0].problemSummary.slice(0, 120),
            category: group[0].category,
            painPointIds: group.map((point) => point._id),
            frequency: group.length,
            avgIntensity,
            avgConfidence,
            totalEngagementScore: engagement,
            willingnessToPayCount: group.filter((point) => point.willingnessToPay).length,
            distinctAuthors: authors.size,
            distinctSubreddits: subs.size,
            timeSpreadDays,
            cohesion,
            solutionSaturation: saturation,
            opportunityScore,
            isWeak,
            lastUpdated: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  if (operations.length) await Cluster.bulkWrite(operations);
  await Cluster.deleteMany({ clusterKey: { $nin: activeKeys } });

  // touch Post to update an unused var lint-wise
  void Post;

  return { clustered: painPoints.length, clusters: groups.length, weak };
}
