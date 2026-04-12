export async function GET() {
  return Response.json({
    status: "UP",
    service: "frontend-customer",
    timestamp: new Date().toISOString(),
  });
}
