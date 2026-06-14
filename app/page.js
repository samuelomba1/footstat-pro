"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { COMPETITIONS, ALL_COMPS } from "../lib/competitions"

// ─── THEME ───────────────────────────────────────────────────────
const T = {
  bg:"#07090F", bg2:"#0C0F1A", card:"#10141F", border:"#1A2035",
  green:"#00E676", gdim:"rgba(0,230,118,0.08)", electric:"#40C4FF",
  yellow:"#FFD600", red:"#FF4D4D", purple:"#CE93D8", orange:"#FF9800",
  text:"#E3EAF4", text2:"#7B8BAD", text3:"#3A4660",
}

// ─── API HELPERS ─────────────────────────────────────────────────
async function footballFetch(path) {
  const r = await fetch(`/api/football?path=${encodeURIComponent(path)}`)
  return r.json()
}
async function claudeAnalyze(body) {
  const r = await fetch("/api/claude", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) })
  return r.json()
}

// ─── ATOMS ───────────────────────────────────────────────────────
function Spin({ size=24, color=T.green }) {
  return <div style={{ width:size, height:size, border:`2px solid ${T.border}`, borderTopColor:color, borderRadius:"50%", flexShrink:0, animation:"spin .8s linear infinite" }} />
}
function Tag({ children, color=T.green }) {
  return <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".67rem", color, background:`${color}15`, border:`1px solid ${color}28`, padding:"2px 9px", borderRadius:20, display:"inline-block", whiteSpace:"nowrap" }}>{children}</span>
}
function Card({ children, style={} }) {
  return <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:13, padding:"1.1rem 1.3rem", position:"relative", overflow:"hidden", ...style }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${T.green}18,transparent)` }} />
    {children}
  </div>
}
function Sec({ children }) {
  return <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:".65rem", color:T.text3, letterSpacing:"1.8px", textTransform:"uppercase", marginBottom:".8rem" }}>{children}</div>
}
function Logo({ src, name, size=28 }) {
  const [e,setE] = useState(false)
  if (!src || e) return <div style={{ width:size, height:size, borderRadius:"50%", background:T.bg2, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.36, color:T.text2, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, flexShrink:0 }}>{(name||"?")[0]}</div>
  return <img src={src} alt={name} width={size} height={size} style={{ objectFit:"contain", flexShrink:0, borderRadius:"50%" }} onError={()=>setE(true)} />
}
function FormBadge({ r }) {
  const c = r==="W"?T.green:r==="D"?T.yellow:T.red
  const bg = r==="W"?"rgba(0,230,118,.12)":r==="D"?"rgba(255,214,0,.1)":"rgba(255,77,77,.1)"
  return <span style={{ width:26, height:26, borderRadius:6, background:bg, color:c, display:"inline-flex", alignItems:"center", justifyContent:"center", fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:".8rem", border:`1px solid ${c}30`, flexShrink:0 }}>{r}</span>
}

// ─── LIVE STATUS ─────────────────────────────────────────────────
const LIVE = ["1H","2H","HT","ET","BT","P","INT"]
const STATUS_MAP = {
  FT:[T.text3,"Terminé"], NS:[T.electric,"À venir"], HT:[T.yellow,"Mi-temps"],
  "1H":[T.green,"1ère MT"], "2H":[T.green,"2ème MT"], ET:[T.yellow,"Prolong."],
  BT:[T.yellow,"Pause ET"], P:[T.red,"Tirs au but"], PST:[T.red,"Reporté"], CANC:[T.red,"Annulé"],
}

// ─── SCORES ──────────────────────────────────────────────────────
function Scores({ compId, season }) {
  const [data,setData] = useState([])
  const [loading,setLoading] = useState(true)
  const [filter,setFilter] = useState("all")
  const intervalRef = useRef(null)

  const load = useCallback(async () => {
    const d = await footballFetch(`/fixtures?league=${compId}&season=${season}&last=20`)
    setData(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [compId, season])

  useEffect(() => {
    setLoading(true); setData([]); setFilter("all")
    load()
    intervalRef.current = setInterval(load, 60000)
    return () => clearInterval(intervalRef.current)
  }, [load])

  const shown = data.filter(f => {
    const s = f.fixture.status.short
    if (filter==="all") return true
    if (filter==="live") return LIVE.includes(s)
    if (filter==="FT") return s==="FT"
    if (filter==="NS") return s==="NS"
    return true
  })

  const liveCount = data.filter(f => LIVE.includes(f.fixture.status.short)).length

  if (loading) return <div style={{display:"flex",justifyContent:"center",padding:"3rem"}}><Spin size={32}/></div>
  if (!data.length) return <div style={{textAlign:"center",padding:"2.5rem",color:T.text2}}>Aucun match disponible pour cette compétition cette saison.</div>

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        {[["all",`Tous (${data.length})`],["live",`🟢 En direct (${liveCount})`],["FT","✓ Terminés"],["NS","🕐 À venir"]].map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)} style={{ padding:"4px 13px", borderRadius:20, border:`1px solid ${filter===id?T.green:T.border}`, background:filter===id?T.gdim:"transparent", color:filter===id?T.green:T.text2, fontFamily:"'Inter',sans-serif", fontSize:".77rem", cursor:"pointer" }}>{label}</button>
        ))}
        <div style={{marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:".65rem",color:T.text3}}>↻ Actualisation auto toutes les 60s</div>
      </div>
      {shown.length===0
        ? <div style={{textAlign:"center",padding:"1.5rem",color:T.text2}}>Aucun match dans cette catégorie.</div>
        : shown.map(f => {
          const s = f.fixture.status.short
          const live = LIVE.includes(s)
          const [sc,sl] = STATUS_MAP[s]||[T.text3,s]
          const isNS = s==="NS"
          const date = new Date(f.fixture.date)
          return (
            <div key={f.fixture.id} style={{ display:"flex", alignItems:"center", gap:".75rem", padding:".75rem 1.1rem", background:T.card, border:`1px solid ${live?T.green+"40":T.border}`, borderRadius:11, marginBottom:".45rem", position:"relative", overflow:"hidden" }}>
              {live && <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${T.green}40,transparent)`}}/>}
              <div style={{width:82,flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  {live && <span style={{width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block",animation:"blink 1.5s infinite"}}/>}
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".67rem",color:sc,fontWeight:live?700:400}}>{sl}</span>
                </div>
                {live && f.fixture.status.elapsed && <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".73rem",color:T.green,marginTop:1}}>{f.fixture.status.elapsed}'</div>}
                {isNS && <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".65rem",color:T.text3,lineHeight:1.4}}>{date.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})}<br/>{date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</div>}
              </div>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:600,fontSize:".95rem",color:T.text,textAlign:"right"}}>{f.teams.home.name}</span>
                <Logo src={f.teams.home.logo} name={f.teams.home.name} size={26}/>
              </div>
              <div style={{minWidth:66,textAlign:"center",fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.25rem",color:isNS?T.text3:T.text,flexShrink:0}}>
                {isNS?"—":`${f.goals.home??0} - ${f.goals.away??0}`}
              </div>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
                <Logo src={f.teams.away.logo} name={f.teams.away.name} size={26}/>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:600,fontSize:".95rem",color:T.text}}>{f.teams.away.name}</span>
              </div>
              {f.fixture.venue?.name && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".62rem",color:T.text3,flexShrink:0,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.fixture.venue.name}</span>}
            </div>
          )
        })
      }
    </div>
  )
}

// ─── STANDINGS ────────────────────────────────────────────────────
function Standings({ compId, season }) {
  const [data,setData] = useState(null)
  const [loading,setLoading] = useState(true)
  useEffect(()=>{
    setLoading(true); setData(null)
    footballFetch(`/standings?league=${compId}&season=${season}`)
      .then(d=>{ setData(d?.[0]?.league?.standings||null); setLoading(false) })
      .catch(()=>setLoading(false))
  },[compId,season])

  if (loading) return <div style={{display:"flex",justifyContent:"center",padding:"3rem"}}><Spin size={32}/></div>
  if (!data) return <div style={{textAlign:"center",padding:"2.5rem",color:T.text2}}>Classement non disponible (élimination directe ou hors saison).</div>

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
      {data.map((group,gi)=>(
        <div key={gi}>
          {data.length>1 && <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:T.electric,marginBottom:".6rem",fontSize:"1rem"}}>Groupe {gi+1}</div>}
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:580}}>
              <thead>
                <tr>{["#","Équipe","J","V","N","D","BP","BC","Diff","Pts","Forme"].map(c=>(
                  <th key={c} style={{padding:".45rem .5rem",textAlign:c==="Équipe"?"left":"center",fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",color:T.text3,letterSpacing:"1px",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>{c}</th>
                ))}</tr>
              </thead>
              <tbody>
                {group.map((t,i)=>{
                  const n=group.length
                  const zc=t.rank<=1?T.green:t.rank<=3?"#69F0AE":t.rank<=6?T.electric:t.rank>=n-2?T.red:t.rank>=n-4?T.yellow:"transparent"
                  const diff=t.goalsDiff
                  const form=(t.form||"").slice(-5).split("")
                  return (
                    <tr key={t.team.id} style={{borderBottom:`1px solid ${T.border}18`,background:i%2===0?`${T.bg2}40`:"transparent"}}>
                      <td style={{padding:".48rem .5rem"}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <div style={{width:3,height:16,borderRadius:2,background:zc,flexShrink:0}}/>
                          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".78rem",color:T.text2}}>{t.rank}</span>
                        </div>
                      </td>
                      <td style={{padding:".48rem .5rem"}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <Logo src={t.team.logo} name={t.team.name} size={20}/>
                          <span style={{fontFamily:"'Inter',sans-serif",fontSize:".85rem",fontWeight:500,color:T.text,whiteSpace:"nowrap"}}>{t.team.name}</span>
                        </div>
                      </td>
                      {[t.all.played,t.all.win,t.all.draw,t.all.lose,t.all.goals.for,t.all.goals.against].map((v,j)=>(
                        <td key={j} style={{padding:".48rem .5rem",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:".78rem",color:T.text2}}>{v}</td>
                      ))}
                      <td style={{padding:".48rem .5rem",textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:".78rem",color:diff>0?T.green:diff<0?T.red:T.text2}}>
                        {diff>0?"+":""}{diff}
                      </td>
                      <td style={{padding:".48rem .5rem",textAlign:"center"}}>
                        <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1rem",color:T.text}}>{t.points}</span>
                      </td>
                      <td style={{padding:".48rem .5rem"}}>
                        <div style={{display:"flex",gap:2}}>
                          {form.map((r,ri)=>{
                            const c=r==="W"?T.green:r==="D"?T.yellow:T.red
                            return <div key={ri} style={{width:16,height:16,borderRadius:3,background:`${c}18`,border:`1px solid ${c}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".58rem",color:c,fontWeight:700}}>{r}</div>
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        {[[T.green,"UCL / Phase suivante"],[T.electric,"Europa League"],[T.yellow,"Barrage"],[T.red,"Relégation"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:9,height:9,borderRadius:2,background:c}}/>
            <span style={{fontSize:".7rem",color:T.text2}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TOP SCORERS ─────────────────────────────────────────────────
function Scorers({ compId, season }) {
  const [data,setData] = useState([])
  const [loading,setLoading] = useState(true)
  useEffect(()=>{
    setLoading(true); setData([])
    footballFetch(`/players/topscorers?league=${compId}&season=${season}`)
      .then(d=>{ setData(Array.isArray(d)?d:[]); setLoading(false) })
      .catch(()=>setLoading(false))
  },[compId,season])

  if (loading) return <div style={{display:"flex",justifyContent:"center",padding:"3rem"}}><Spin size={32}/></div>
  if (!data.length) return <div style={{textAlign:"center",padding:"2.5rem",color:T.text2}}>Données buteurs non disponibles.</div>

  const max = data[0]?.statistics?.[0]?.goals?.total||1
  return (
    <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
      {data.slice(0,20).map((p,i)=>{
        const goals = p.statistics?.[0]?.goals?.total||0
        const assists = p.statistics?.[0]?.goals?.assists||0
        const apps = p.statistics?.[0]?.games?.appearences||0
        const team = p.statistics?.[0]?.team
        const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null
        return (
          <div key={p.player.id} style={{display:"flex",alignItems:"center",gap:".85rem",padding:".7rem 1.1rem",background:T.card,border:`1px solid ${T.border}`,borderRadius:11}}>
            <div style={{width:28,textAlign:"center",flexShrink:0}}>
              {medal?<span style={{fontSize:"1.1rem"}}>{medal}</span>:<span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:".95rem",color:T.text3}}>{i+1}</span>}
            </div>
            <img src={p.player.photo} alt="" width={34} height={34} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.target.style.opacity=0}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Inter',sans-serif",fontWeight:600,fontSize:".88rem",color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.player.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                <Logo src={team?.logo} name={team?.name} size={14}/>
                <span style={{fontSize:".7rem",color:T.text2}}>{team?.name}</span>
                <span style={{fontSize:".67rem",color:T.text3}}>• {p.player.nationality}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:"1rem",alignItems:"center",flexShrink:0}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.5rem",color:T.green,lineHeight:1}}>{goals}</div>
                <div style={{fontSize:".62rem",color:T.text3}}>buts</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.1rem",color:T.electric,lineHeight:1}}>{assists}</div>
                <div style={{fontSize:".62rem",color:T.text3}}>passes</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".8rem",color:T.text2,lineHeight:1}}>{apps}</div>
                <div style={{fontSize:".62rem",color:T.text3}}>matchs</div>
              </div>
            </div>
            <div style={{width:60,height:5,background:T.bg2,borderRadius:3,overflow:"hidden",flexShrink:0}}>
              <div style={{width:`${(goals/max)*100}%`,height:"100%",background:`linear-gradient(90deg,#00C853,${T.green})`}}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── ANALYSE CLAUDE AI ────────────────────────────────────────────
function Analyse({ compId, compName, season }) {
  const [teams,setTeams] = useState([])
  const [teamA,setTeamA] = useState("")
  const [teamB,setTeamB] = useState("")
  const [loading,setLoading] = useState(false)
  const [tLoad,setTLoad] = useState(true)
  const [result,setResult] = useState(null)
  const [error,setError] = useState("")
  const [step,setStep] = useState("")

  useEffect(()=>{
    setTLoad(true); setTeams([]); setTeamA(""); setTeamB(""); setResult(null)
    footballFetch(`/teams?league=${compId}&season=${season}`)
      .then(d=>{ setTeams(Array.isArray(d)?d:[]); setTLoad(false) })
      .catch(()=>setTLoad(false))
  },[compId,season])

  async function analyze() {
    if (!teamA||!teamB) { setError("Sélectionnez deux équipes."); return }
    if (teamA===teamB) { setError("Choisissez deux équipes différentes."); return }
    setError(""); setLoading(true); setResult(null)
    try {
      setStep("📊 Chargement des statistiques...")
      const [sA,sB,h2h] = await Promise.all([
        footballFetch(`/teams/statistics?league=${compId}&season=${season}&team=${teamA}`),
        footballFetch(`/teams/statistics?league=${compId}&season=${season}&team=${teamB}`),
        footballFetch(`/fixtures/headtohead?h2h=${teamA}-${teamB}&last=6`),
      ])
      setStep("🤖 Claude AI analyse les données...")
      const iA = teams.find(t=>t.team.id==teamA)
      const iB = teams.find(t=>t.team.id==teamB)
      const aiResult = await claudeAnalyze({ teamA:iA?.team?.name, teamB:iB?.team?.name, statsA:sA, statsB:sB, h2h:Array.isArray(h2h)?h2h:[], competition:compName, season })
      setResult({ sA, sB, h2h:Array.isArray(h2h)?h2h:[], iA, iB, ai:aiResult })
    } catch(e) { setError("Erreur: "+e.message) }
    setLoading(false); setStep("")
  }

  function VBar({label,a,b}) {
    const va=parseFloat(a)||0, vb=parseFloat(b)||0, tot=va+vb||1
    return (
      <div style={{marginBottom:".7rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:".22rem"}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".73rem",color:T.green}}>{a??'—'}</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".63rem",color:T.text3,letterSpacing:"1px"}}>{label}</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".73rem",color:T.electric}}>{b??'—'}</span>
        </div>
        <div style={{height:5,background:T.bg2,borderRadius:3,overflow:"hidden",display:"flex"}}>
          <div style={{width:`${va/tot*100}%`,background:T.green,height:"100%"}}/>
          <div style={{width:`${vb/tot*100}%`,background:T.electric,height:"100%"}}/>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Card style={{marginBottom:"1.2rem"}}>
        <Sec>⚡ Analyse IA — Sélectionner les équipes</Sec>
        {tLoad ? <div style={{display:"flex",alignItems:"center",gap:10,color:T.text2,fontSize:".85rem"}}><Spin size={18}/>Chargement des équipes...</div> : (
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr auto",gap:".9rem",alignItems:"flex-end"}}>
            {[{val:teamA,set:setTeamA,label:"🏠 Domicile"},null,{val:teamB,set:setTeamB,label:"✈️ Extérieur"}].map((item,i)=>
              item ? (
                <div key={i}>
                  <div style={{fontSize:".75rem",color:T.text2,marginBottom:".35rem"}}>{item.label}</div>
                  <select value={item.val} onChange={e=>item.set(e.target.value)} style={{width:"100%",background:T.bg2,border:`1px solid ${T.border}`,color:item.val?T.text:T.text3,padding:".58rem .85rem",borderRadius:8,fontFamily:"'Inter',sans-serif",fontSize:".86rem",outline:"none",cursor:"pointer"}}>
                    <option value="">-- Sélectionner</option>
                    {teams.map(t=><option key={t.team.id} value={t.team.id}>{t.team.name}</option>)}
                  </select>
                </div>
              ) : <div key={i} style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.2rem",color:T.text3,textAlign:"center",paddingBottom:2}}>VS</div>
            )}
            <button onClick={analyze} disabled={loading} style={{background:loading?T.border:`linear-gradient(135deg,#00C853,${T.green})`,color:loading?T.text2:"#000",border:"none",cursor:loading?"not-allowed":"pointer",padding:".6rem 1.3rem",borderRadius:10,fontFamily:"'Rajdhani',sans-serif",fontSize:"1rem",fontWeight:700,display:"flex",alignItems:"center",gap:7,whiteSpace:"nowrap"}}>
              {loading?<><Spin size={15} color="#999"/>{step||"Analyse..."}</>:"🤖 Analyser avec IA"}
            </button>
          </div>
        )}
        {error && <div style={{marginTop:".6rem",color:T.red,fontSize:".82rem"}}>⚠ {error}</div>}
      </Card>

      {result && (()=>{
        const {sA,sB,h2h,iA,iB,ai} = result
        const nA = iA?.team?.name||"Équipe A"
        const nB = iB?.team?.name||"Équipe B"
        const fA=(sA?.form||"").slice(-5).split("")
        const fB=(sB?.form||"").slice(-5).split("")
        return (
          <div style={{animation:"fadeUp .35s ease"}}>
            {/* PRONO AI */}
            <div style={{background:"linear-gradient(135deg,#061309,#08101A)",border:`1px solid ${T.green}28`,borderRadius:15,padding:"1.6rem",marginBottom:"1.2rem",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-60,right:-60,width:240,height:240,background:`radial-gradient(circle,${T.green}07,transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.1rem",flexWrap:"wrap",gap:8}}>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.15rem",color:T.green}}>🤖 Analyse Claude AI — Données réelles {season}/{season+1}</span>
                <Tag color={T.electric}>Confiance {ai.confiance}%</Tag>
              </div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.85rem",marginBottom:".2rem"}}>{ai.pronostic}</div>
              <div style={{color:T.text2,fontSize:".85rem",marginBottom:"1.1rem"}}>Score estimé: <strong style={{color:T.text,fontFamily:"'Rajdhani',sans-serif",fontSize:"1.1rem"}}>{ai.score}</strong></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".65rem",marginBottom:".9rem"}}>
                {[{pct:ai.pct_domicile,label:nA,col:T.green},{pct:ai.pct_nul,label:"Nul",col:T.yellow},{pct:ai.pct_exterieur,label:nB,col:T.electric}].map((x,i)=>(
                  <div key={i} style={{textAlign:"center",background:`${x.col}09`,border:`1px solid ${x.col}22`,borderRadius:10,padding:".65rem .4rem"}}>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.65rem",color:x.col,lineHeight:1}}>{x.pct}%</div>
                    <div style={{fontSize:".7rem",color:T.text2,marginTop:3}}>{x.label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:".5rem",marginBottom:".9rem"}}>
                {[{label:"Cote Dom.",val:ai.cote_domicile,col:T.green},{label:"Cote Nul",val:ai.cote_nul,col:T.yellow},{label:"Cote Ext.",val:ai.cote_exterieur,col:T.electric}].map((c,i)=>(
                  <div key={i} style={{textAlign:"center",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:".55rem"}}>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.2rem",color:c.col}}>{c.val}</div>
                    <div style={{fontSize:".65rem",color:T.text3}}>{c.label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem"}}>
                <Tag color={ai.btts?T.green:T.red}>BTTS: {ai.btts?"✓ OUI":"✗ NON"}</Tag>
                <Tag color={ai.over25?T.green:T.red}>+2.5 buts: {ai.over25?"✓ OUI":"✗ NON"}</Tag>
                {ai.tactique_probable_domicile && <Tag color={T.purple}>🏠 {ai.tactique_probable_domicile}</Tag>}
                {ai.tactique_probable_exterieur && <Tag color={T.orange}>✈️ {ai.tactique_probable_exterieur}</Tag>}
              </div>
              <div style={{background:T.bg2,borderLeft:`3px solid ${T.green}`,borderRadius:"0 10px 10px 0",padding:".9rem 1.1rem",fontSize:".87rem",color:T.text2,lineHeight:1.7,marginBottom:".9rem"}}>
                🧠 <strong style={{color:T.text}}>Analyse IA:</strong> {ai.analyse}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".75rem"}}>
                <div>
                  <Sec>✅ FACTEURS CLÉS</Sec>
                  {(ai.facteurs_cles||[]).map((f,i)=><div key={i} style={{fontSize:".82rem",color:T.text2,padding:".3rem 0",borderBottom:`1px solid ${T.border}30`}}>• {f}</div>)}
                </div>
                <div>
                  <Sec>⚠️ RISQUES</Sec>
                  {(ai.risques||[]).map((r,i)=><div key={i} style={{fontSize:".82rem",color:T.red,padding:".3rem 0",borderBottom:`1px solid ${T.border}30`}}>• {r}</div>)}
                </div>
              </div>
            </div>

            {/* ÉQUIPES */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.1rem",marginBottom:"1.1rem"}}>
              {[{info:iA,s:sA,form:fA,name:nA,col:T.green,side:"🏠 DOMICILE"},{info:iB,s:sB,form:fB,name:nB,col:T.electric,side:"✈️ EXTÉRIEUR"}].map((t,i)=>(
                <Card key={i}>
                  <Sec>{t.side}</Sec>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:".9rem"}}>
                    <Logo src={t.info?.team?.logo} name={t.name} size={42}/>
                    <div>
                      <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.15rem"}}>{t.name}</div>
                      <div style={{fontSize:".72rem",color:T.text2}}>{t.s?.fixtures?.played?.total||0} matchs · {season}/{season+1}</div>
                    </div>
                  </div>
                  <Sec>Forme récente (5 derniers)</Sec>
                  <div style={{display:"flex",gap:4,marginBottom:".9rem",flexWrap:"wrap"}}>
                    {t.form.length?t.form.map((r,j)=><FormBadge key={j} r={r}/>):<span style={{color:T.text3,fontSize:".8rem"}}>—</span>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                    {[
                      {label:"Buts / match",val:t.s?.goals?.for?.average?.total||"—",col:t.col},
                      {label:"Encaissés / match",val:t.s?.goals?.against?.average?.total||"—",col:T.red},
                      {label:"Victoires",val:t.s?.fixtures?.wins?.total||0,col:T.green},
                      {label:"Défaites",val:t.s?.fixtures?.loses?.total||0,col:T.red},
                      {label:"Clean sheets",val:t.s?.clean_sheet?.total||0,col:t.col},
                      {label:"Nuls",val:t.s?.fixtures?.draws?.total||0,col:T.yellow},
                    ].map((s,j)=>(
                      <div key={j} style={{background:T.bg2,borderRadius:8,padding:".55rem .7rem",border:`1px solid ${T.border}`}}>
                        <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.15rem",color:s.col}}>{s.val}</div>
                        <div style={{fontSize:".64rem",color:T.text3,marginTop:1}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* COMPARAISON */}
            <Card style={{marginBottom:"1.1rem"}}>
              <Sec>⚖️ COMPARAISON — <span style={{color:T.green}}>{nA}</span> vs <span style={{color:T.electric}}>{nB}</span></Sec>
              {[
                {label:"Buts / match",a:sA?.goals?.for?.average?.total,b:sB?.goals?.for?.average?.total},
                {label:"Encaissés / match",a:sA?.goals?.against?.average?.total,b:sB?.goals?.against?.average?.total},
                {label:"Victoires",a:sA?.fixtures?.wins?.total,b:sB?.fixtures?.wins?.total},
                {label:"Clean sheets",a:sA?.clean_sheet?.total,b:sB?.clean_sheet?.total},
                {label:"Matchs joués",a:sA?.fixtures?.played?.total,b:sB?.fixtures?.played?.total},
              ].map((s,i)=><VBar key={i} {...s}/>)}
            </Card>

            {/* H2H */}
            {h2h.length>0 && (
              <Card>
                <Sec>🔁 CONFRONTATIONS DIRECTES — {h2h.length} derniers matchs</Sec>
                {h2h.map((f,i)=>{
                  const d=new Date(f.fixture.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})
                  const wH=f.goals.home>f.goals.away, wA=f.goals.away>f.goals.home
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:".8rem",padding:".6rem 0",borderBottom:i<h2h.length-1?`1px solid ${T.border}40`:"none"}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".67rem",color:T.text3,width:90,flexShrink:0}}>{d}</span>
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                        <Logo src={f.teams.home.logo} name={f.teams.home.name} size={18}/>
                        <span style={{fontFamily:"'Inter',sans-serif",fontSize:".83rem",color:wH?T.green:T.text2,fontWeight:wH?600:400}}>{f.teams.home.name}</span>
                      </div>
                      <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.05rem",background:T.bg2,border:`1px solid ${T.border}`,padding:"1px 12px",borderRadius:6,minWidth:60,textAlign:"center",flexShrink:0}}>{f.goals.home} - {f.goals.away}</span>
                      <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontFamily:"'Inter',sans-serif",fontSize:".83rem",color:wA?T.electric:T.text2,fontWeight:wA?600:400}}>{f.teams.away.name}</span>
                        <Logo src={f.teams.away.logo} name={f.teams.away.name} size={18}/>
                      </div>
                      <Tag color={T.text3}>{f.league.name}</Tag>
                    </div>
                  )
                })}
              </Card>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────
export default function App() {
  const [comp,setComp] = useState(null)
  const [tab,setTab] = useState("scores")
  const [season,setSeason] = useState(2024)
  const [search,setSearch] = useState("")
  const [sideOpen,setSideOpen] = useState(true)

  const TYPE_COLORS = {league:T.green,cup:T.yellow,friendly:T.purple}
  const TABS = [{id:"scores",label:"📅 Matchs"},{id:"standings",label:"📊 Classement"},{id:"scorers",label:"⚽ Buteurs"},{id:"analyse",label:"🤖 Analyse IA"}]

  const filtered = search.trim() ? ALL_COMPS.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())) : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#07090F;color:#E3EAF4;font-family:'Inter',sans-serif;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#0C0F1A;}
        ::-webkit-scrollbar-thumb{background:#1A2035;border-radius:3px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        select,input{outline:none;color-scheme:dark;}
      `}</style>
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.bg}}>

        {/* NAV */}
        <div style={{position:"sticky",top:0,zIndex:200,background:"rgba(7,9,15,.97)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1rem",height:54,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
            <button onClick={()=>setSideOpen(o=>!o)} style={{background:"none",border:"none",cursor:"pointer",color:T.text2,fontSize:"1.1rem",padding:4}}>☰</button>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.35rem",fontWeight:700,color:T.green,display:"flex",alignItems:"center",gap:8}}>
              ⚽ FootStat<span style={{color:T.text}}> Pro</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".6rem",color:T.text3,background:T.bg2,border:`1px solid ${T.border}`,padding:"1px 7px",borderRadius:4,letterSpacing:"1px"}}>2026</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",color:T.text3}}>Saison</span>
            <select value={season} onChange={e=>setSeason(Number(e.target.value))} style={{background:T.bg2,border:`1px solid ${T.border}`,color:T.text,padding:"4px 8px",borderRadius:6,fontFamily:"'JetBrains Mono',monospace",fontSize:".73rem"}}>
              {[2024,2023,2022,2021,2020].map(s=><option key={s} value={s}>{s}/{s+1}</option>)}
            </select>
            <div style={{display:"flex",gap:3}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",background:tab===t.id?T.gdim:"transparent",color:tab===t.id?T.green:T.text2,fontFamily:"'Inter',sans-serif",fontSize:".78rem",fontWeight:500,transition:".15s"}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* SIDEBAR */}
          {sideOpen && (
            <div style={{width:270,flexShrink:0,borderRight:`1px solid ${T.border}`,overflowY:"auto",padding:".85rem .65rem"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{width:"100%",background:T.bg2,border:`1px solid ${T.border}`,color:T.text,padding:".48rem .75rem",borderRadius:8,fontFamily:"'Inter',sans-serif",fontSize:".8rem",marginBottom:".85rem"}}/>
              {(filtered?[{cat:"Résultats",items:filtered}]:COMPETITIONS).map(cat=>(
                <div key={cat.cat}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".59rem",color:T.text3,letterSpacing:"1.5px",textTransform:"uppercase",padding:".15rem .4rem",marginBottom:".3rem",marginTop:".55rem"}}>{cat.cat}</div>
                  {cat.items.map(c=>(
                    <button key={`${c.id}-${c.name}`} onClick={()=>{setComp(c);setSearch("");setTab("scores")}} style={{width:"100%",display:"flex",alignItems:"center",gap:7,padding:".4rem .65rem",borderRadius:7,border:"none",cursor:"pointer",background:comp?.id===c.id&&comp?.name===c.name?T.gdim:"transparent",color:comp?.id===c.id&&comp?.name===c.name?T.green:T.text2,fontFamily:"'Inter',sans-serif",fontSize:".79rem",marginBottom:1,textAlign:"left",transition:".12s"}}>
                      <span style={{flexShrink:0}}>{c.flag}</span>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span>
                      <span style={{width:6,height:6,borderRadius:"50%",background:TYPE_COLORS[c.type]||T.text3,flexShrink:0,opacity:.7}}/>
                    </button>
                  ))}
                </div>
              ))}
              <div style={{marginTop:"1rem",padding:".6rem",background:T.bg2,borderRadius:8,border:`1px solid ${T.border}`}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".59rem",color:T.text3,marginBottom:".4rem",letterSpacing:"1px"}}>LÉGENDE</div>
                {Object.entries({league:[T.green,"Championnat"],cup:[T.yellow,"Coupe"],friendly:[T.purple,"Amical / Nation"]}).map(([k,[c,l]])=>(
                  <div key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:c,display:"inline-block"}}/>
                    <span style={{fontSize:".68rem",color:T.text2}}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIN */}
          <div style={{flex:1,overflowY:"auto",padding:"1.2rem 1.4rem"}}>
            {!comp ? (
              <div style={{textAlign:"center",padding:"5rem 2rem",color:T.text2}}>
                <div style={{fontSize:"4rem",marginBottom:"1rem",opacity:.3}}>⚽</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:"1.4rem",fontWeight:700,marginBottom:".5rem"}}>FootStat Pro 2026</div>
                <p style={{fontSize:".9rem"}}>Sélectionnez une compétition dans la sidebar pour commencer.</p>
                <p style={{fontSize:".8rem",color:T.text3,marginTop:".5rem"}}>Données en temps réel · Analyse par Claude AI · 60+ compétitions</p>
              </div>
            ) : (
              <>
                <div style={{marginBottom:"1.2rem"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:".35rem",flexWrap:"wrap"}}>
                    <span style={{fontSize:"1.5rem"}}>{comp.flag}</span>
                    <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.55rem",color:T.text}}>{comp.name}</h1>
                    <Tag color={TYPE_COLORS[comp.type]||T.text3}>{comp.type==="league"?"Championnat":comp.type==="cup"?"Coupe":"Amical"}</Tag>
                    {comp.nat && <Tag color={T.purple}>🌍 Équipes Nationales</Tag>}
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",color:T.text3}}>Saison {season}/{season+1} · Données API-Football · Analyse Claude AI</div>
                </div>
                {tab==="scores"    && <Scores    key={`${comp.id}-${comp.name}-${season}`} compId={comp.id} season={season}/>}
                {tab==="standings" && <Standings key={`${comp.id}-${comp.name}-${season}`} compId={comp.id} season={season}/>}
                {tab==="scorers"   && <Scorers   key={`${comp.id}-${comp.name}-${season}`} compId={comp.id} season={season}/>}
                {tab==="analyse"   && <Analyse   key={`${comp.id}-${comp.name}-${season}`} compId={comp.id} compName={comp.name} season={season}/>}
              </>
            )}
          </div>
        </div>
      </div>
