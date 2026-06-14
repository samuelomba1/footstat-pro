import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const body = await request.json()
  const { teamA, teamB, statsA, statsB, h2h, competition, season } = body

  const prompt = `Tu es un expert analyste football professionnel. Voici les données réelles et actuelles pour le match ${teamA} vs ${teamB} en ${competition} (saison ${season}).

STATS ${teamA} (domicile):
- Matchs joués: ${statsA?.fixtures?.played?.total ?? "N/A"}
- Victoires: ${statsA?.fixtures?.wins?.total ?? "N/A"}
- Nuls: ${statsA?.fixtures?.draws?.total ?? "N/A"}
- Défaites: ${statsA?.fixtures?.loses?.total ?? "N/A"}
- Buts marqués/match: ${statsA?.goals?.for?.average?.total ?? "N/A"}
- Buts encaissés/match: ${statsA?.goals?.against?.average?.total ?? "N/A"}
- Clean sheets: ${statsA?.clean_sheet?.total ?? "N/A"}
- Forme récente: ${statsA?.form?.slice(-5) ?? "N/A"}
- Meilleur buteur: ${statsA?.lineups?.[0]?.formation ?? "N/A"}

STATS ${teamB} (extérieur):
- Matchs joués: ${statsB?.fixtures?.played?.total ?? "N/A"}
- Victoires: ${statsB?.fixtures?.wins?.total ?? "N/A"}
- Nuls: ${statsB?.fixtures?.draws?.total ?? "N/A"}
- Défaites: ${statsB?.fixtures?.loses?.total ?? "N/A"}
- Buts marqués/match: ${statsB?.goals?.for?.average?.total ?? "N/A"}
- Buts encaissés/match: ${statsB?.goals?.against?.average?.total ?? "N/A"}
- Clean sheets: ${statsB?.clean_sheet?.total ?? "N/A"}
- Forme récente: ${statsB?.form?.slice(-5) ?? "N/A"}

CONFRONTATIONS DIRECTES (H2H - ${h2h?.length ?? 0} derniers matchs):
${h2h?.slice(0,5).map(f => `- ${new Date(f.fixture.date).toLocaleDateString("fr-FR")}: ${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name} (${f.league.name})`).join("\n") ?? "Aucune donnée"}

Réponds en JSON uniquement, sans markdown:
{
  "pronostic": "string (ex: Victoire ${teamA})",
  "score": "string (ex: 2-1)",
  "confiance": number (0-100),
  "pct_domicile": number,
  "pct_nul": number,
  "pct_exterieur": number,
  "btts": boolean,
  "over25": boolean,
  "cote_domicile": number,
  "cote_nul": number,
  "cote_exterieur": number,
  "analyse": "string (analyse détaillée 4-5 phrases basée sur les vraies stats)",
  "facteurs_cles": ["string", "string", "string"],
  "risques": ["string", "string"],
  "tactique_probable_domicile": "string",
  "tactique_probable_exterieur": "string"
}`

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }]
  })

  const text = message.content[0].text.replace(/```json|```/g, "").trim()
  try {
    return Response.json(JSON.parse(text))
  } catch {
    return Response.json({ error: "Parse error", raw: text }, { status: 500 })
  }
}
