export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")
  if (!path) return Response.json({ error: "Missing path" }, { status: 400 })

  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY },
    next: { revalidate: 60 }
  })
  const data = await res.json()
  return Response.json(data.response ?? data)
}
