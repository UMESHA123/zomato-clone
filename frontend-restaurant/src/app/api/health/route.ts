export async function GET() {
  return Response.json({
    status: "UP",
    service: "frontend-restaurant",
    timestamp: new Date().toISOString(),
  });
}
