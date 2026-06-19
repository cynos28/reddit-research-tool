import { createHash } from "node:crypto";
import { CLUSTER_SIMILARITY_THRESHOLD } from "@/lib/constants";
import { Cluster } from "@/lib/models/Cluster";
import { PainPoint } from "@/lib/models/PainPoint";
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

export async function clusterPainPoints() {
  await connectToDatabase();
  const painPoints = await PainPoint.find({ isPainPoint: true })
    .select("+embedding")
    .populate("postId", "engagementScore")
    .lean();

  if (!painPoints.length) {
    await Cluster.deleteMany({});
    return { clustered: 0, clusters: 0 };
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
  const operations = groups.map((group) => {
    const ids = group.map((point) => String(point._id)).sort();
    const clusterKey = createHash("sha1").update(ids.join(":"), "utf8").digest("hex");
    activeKeys.push(clusterKey);
    const engagement = group.reduce((sum, point) => {
      const post = point.postId as unknown as { engagementScore?: number };
      return sum + (post?.engagementScore ?? 0);
    }, 0);
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
            avgIntensity:
              group.reduce((sum, point) => sum + point.intensity, 0) / group.length,
            totalEngagementScore: engagement,
            willingnessToPayCount: group.filter((point) => point.willingnessToPay).length,
            lastUpdated: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  await Cluster.bulkWrite(operations);
  await Cluster.deleteMany({ clusterKey: { $nin: activeKeys } });
  return { clustered: painPoints.length, clusters: groups.length };
}
