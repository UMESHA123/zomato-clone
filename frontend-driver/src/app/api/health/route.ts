export async function GET() {
  return Response.json({
    status: "UP",
    service: "frontend-driver",
    timestamp: new Date().toISOString(),
  });
}
