export function GET(request: Request) {
  return Response.json({
    status: 'success',
    message: 'Paalalay API is running!',
    timestamp: new Date().toISOString(),
  });
}
