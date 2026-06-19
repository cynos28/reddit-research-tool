export function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";

  const headerSecret = request.headers.get("x-cron-secret");
  const authorization = request.headers.get("authorization");
  return headerSecret === secret || authorization === `Bearer ${secret}`;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
