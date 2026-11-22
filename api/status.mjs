// This endpoint never exposes the API key, only whether it is configured.
export function GET() {
  return Response.json(
    { ai: Boolean(process.env.GEMINI_API_KEY), configured: Boolean(process.env.GEMINI_API_KEY), model: process.env.GEMINI_API_KEY ? (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite') : null },
    { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }
  );
}
