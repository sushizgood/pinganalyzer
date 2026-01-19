import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase, BUCKET } from "./supabaseClient";

/*
  =========================
  CONFIG PRINCIPALE (MODIFIABLE)
  =========================
  👉 Tu peux modifier ici : thèmes, tags coach, coups, services, etc.
*/
const APP_CONFIG = {
  themes: [
    { key: "T1", label: "T1 : service coupé court + démarrage sur remise coupée longue" },
    { key: "T2", label: "T2 : service long → bloc milieu → accélération diagonale" },
    { key: "T3", label: "T3 : remise sur service adverse (long actif / court court ou flick si haut)" },
  ],

  // MODIFIABLE (TON VOCABULAIRE)
  shotTypes: [
    "Service",
    "Remise courte",
    "Remise longue",
    "Flick",
    "Poussette",
    "Top rotation CD",
    "Top rotation RV",
    "Bloc RV",
    "Frappe",
  ],

  serveTypes: ["Court coupé", "Court mou", "Long lifté", "Long mou", "Latéral coupé"],

  coachTags: [
    "Balle favorable non attaquée",
    "Bon démarrage rotation",
    "Passif alors que possible",
    "Mauvaise transition RV→CD",
    "Je recule après démarrage",
  ],

  pointOutcome: ["Gagné", "Perdu"],
};

export default function App() {
  const [tab, setTab] = useState("UPLOAD"); // UPLOAD | LIBRARY
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);

  async function loadVideos() {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erreur chargement vidéos: " + error.message);
      return;
    }
    setVideos(data || []);
  }

  useEffect(() => {
    loadVideos();
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h1 style={{ margin: "8px 0" }}>Ping Video Analyse — V3</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Upload + bibliothèque + lecture + markers (suppression/modification) + stats + timeline à droite.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab("UPLOAD")} style={btn(tab === "UPLOAD")}>
          Upload
        </button>
        <button onClick={() => setTab("LIBRARY")} style={btn(tab === "LIBRARY")}>
          Bibliothèque
        </button>
      </div>

      {tab === "UPLOAD" && (
        <UploadPanel
          themes={APP_CONFIG.themes}
          onUploaded={() => {
            loadVideos();
            setTab("LIBRARY");
          }}
        />
      )}

      {tab === "LIBRARY" && (
        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16 }}>
          <LibraryPanel videos={videos} selected={selected} onSelect={setSelected} />
          <ViewerPanel video={selected} />
        </div>
      )}
    </div>
  );
}

function UploadPanel({ themes, onUploaded }) {
  const [file, setFile] = useState(null);

  // MODIFIABLE: métadonnées futures
  const [title, setTitle] = useState("");
  const [type, setType] = useState("EXERCICE"); // EXERCICE | MATCH
  const [theme, setTheme] = useState("T1"); // si EXERCICE
  const [setNumber, setSetNumber] = useState(1); // si MATCH
  const [notes, setNotes] = useState("");
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function handleUpload() {
    if (!file) return alert("Choisis une vidéo.");
    if (!title.trim()) return alert("Donne un titre.");

    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const filename = `${crypto.randomUUID()}.${ext}`;
      const path = `${type.toLowerCase()}/${filename}`;

      // 1) upload Storage
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || "video/mp4" });
      if (upErr) throw upErr;

      // 2) insert DB
      const payload = {
        title,
        type,
        theme: type === "EXERCICE" ? theme : null,
        set_number: type === "MATCH" ? setNumber : null,
        recorded_at: recordedAt,
        notes,
        file_path: path,
      };

      const { error: dbErr } = await supabase.from("videos").insert(payload);
      if (dbErr) throw dbErr;

      setFile(null);
      setTitle("");
      setNotes("");
      onUploaded?.();
    } catch (e) {
      alert("Erreur upload: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={card()}>
      <h2 style={{ marginTop: 0 }}>Déposer une vidéo</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label>Titre</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={input()} placeholder="Ex: Match vs X - Set 2" />
        </div>

        <div>
          <label>Date</label>
          <input type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} style={input()} />
        </div>

        <div>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} style={input()}>
            <option value="EXERCICE">Exercice</option>
            <option value="MATCH">Match (1 set = 1 vidéo)</option>
          </select>
        </div>

        {type === "EXERCICE" ? (
          <div>
            <label>Thème</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} style={input()}>
              {themes.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.key}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label>Set</label>
            <input type="number" min={1} value={setNumber} onChange={(e) => setSetNumber(parseInt(e.target.value || "1", 10))} style={input()} />
          </div>
        )}

        <div style={{ gridColumn: "1 / -1" }}>
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={textarea()} placeholder='Ex: "être plus actif sur balle favorable"' />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label>Fichier vidéo</label>
          <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      <button onClick={handleUpload} disabled={busy} style={{ ...btn(true), marginTop: 12 }}>
        {busy ? "Upload..." : "Uploader"}
      </button>
    </div>
  );
}

function LibraryPanel({ videos, selected, onSelect }) {
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  const filtered = useMemo(() => {
    return (videos || [])
      .filter((v) => (filterType === "ALL" ? true : v.type === filterType))
      .filter((v) => (q.trim() ? (v.title || "").toLowerCase().includes(q.toLowerCase()) : true));
  }, [videos, q, filterType]);

  return (
    <div style={card()}>
      <h2 style={{ marginTop: 0 }}>Vidéos</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} style={input()} placeholder="Rechercher..." />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={input()}>
          <option value="ALL">Tous</option>
          <option value="EXERCICE">Exercices</option>
          <option value="MATCH">Matchs</option>
        </select>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v)}
            style={{
              textAlign: "left",
              padding: 10,
              borderRadius: 12,
              border: selected?.id === v.id ? "2px solid #111" : "1px solid #eee",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 700 }}>{v.title}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {v.type}
              {v.type === "EXERCICE" ? ` • ${v.theme}` : ` • Set ${v.set_number}`} • {v.recorded_at}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ViewerPanel({ video }) {
  if (!video) {
    return (
      <div style={card()}>
        <h2 style={{ marginTop: 0 }}>Lecture</h2>
        <p style={{ opacity: 0.8 }}>Sélectionne une vidéo à gauche.</p>
      </div>
    );
  }
  return <VideoPlayer video={video} />;
}

function VideoPlayer({ video }) {
  const [url, setUrl] = useState(null);
  const vidRef = useRef(null);
  const [report, setReport] = useState(null); // Débrief coach (sans IA)

  // ===== MARKERS =====
  const [markers, setMarkers] = useState([]);
  const [markerTag, setMarkerTag] = useState(APP_CONFIG.coachTags[0]);
  const [shotType, setShotType] = useState("");
  const [serveType, setServeType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");

  // Charge markers quand on change de vidéo
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("markers")
        .select("*")
        .eq("video_id", video.id)
        .order("t_sec", { ascending: true });

      if (!error && alive) setMarkers(data || []);
    })();
    return () => {
      alive = false;
    };
  }, [video.id]);

  async function addMarker() {
    if (!vidRef.current) return;

    const t = vidRef.current.currentTime;

    const payload = {
      video_id: video.id,
      t_sec: t,
      tag: markerTag,
      shot_type: shotType || null,
      serve_type: serveType || null,
      outcome: outcome || null,
      note: note || null,
    };

    const { data, error } = await supabase.from("markers").insert(payload).select().single();
    if (error) return alert("Erreur marker: " + error.message);

    setMarkers((prev) => [...prev, data].sort((a, b) => a.t_sec - b.t_sec));
    setNote("");
  }

  async function deleteMarker(markerId) {
    const ok = window.confirm("Supprimer ce marker ?");
    if (!ok) return;

    const { error } = await supabase.from("markers").delete().eq("id", markerId);
    if (error) return alert("Erreur suppression: " + error.message);

    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
  }

  async function updateMarker(markerId, patch) {
    const { data, error } = await supabase.from("markers").update(patch).eq("id", markerId).select().single();
    if (error) return alert("Erreur update: " + error.message);

    setMarkers((prev) => prev.map((m) => (m.id === markerId ? data : m)).sort((a, b) => a.t_sec - b.t_sec));
  }

  function generateCoachReport() {
  const total = markers.length;

  const countBy = (arr, keyFn) => {
    const m = new Map();
    for (const x of arr) {
      const k = keyFn(x) ?? "—";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  };

  const outcomeCounts = countBy(markers, (m) => m.outcome || "Non renseigné");
  const lost = outcomeCounts.get("Perdu") || 0;
  const won = outcomeCounts.get("Gagné") || 0;

  const tagCounts = countBy(markers, (m) => m.tag || "Sans tag");
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const favorableTag = "Balle favorable non attaquée";
  const favorable = markers.filter((m) => m.tag === favorableTag);
  const favorableTotal = favorable.length;
  const favorableLost = favorable.filter((m) => m.outcome === "Perdu").length;

  const passiveTag = "Passif alors que possible";
  const passiveTotal = markers.filter((m) => m.tag === passiveTag).length;

  const transitionTag = "Mauvaise transition RV→CD";
  const transitionTotal = markers.filter((m) => m.tag === transitionTag).length;

  // Heuristiques “coach” (MODIFIABLE)
  const lostRate = total > 0 ? lost / total : 0;
  const favorableRate = total > 0 ? favorableTotal / total : 0;

  const priorities = [];
  if (favorableTotal >= 3 || favorableRate >= 0.2) {
    priorities.push("Prendre l’initiative sur balle favorable (mi-longue/molle/pas très coupée).");
  }
  if (transitionTotal >= 3) {
    priorities.push("Améliorer la transition RV→CD (replacement + déclenchement).");
  }
  if (passiveTotal >= 3 || lostRate >= 0.45) {
    priorities.push("Réduire le jeu passif : décider plus tôt (actif long / court court / flick si haut).");
  }
  if (priorities.length === 0) {
    priorities.push("Continuer : consolider service + 1er démarrage en rotation, et sécuriser le replacement.");
  }

  // Reco exercices en lien avec T1/T2/T3
  const drills = [
    {
      title: "T1 — Service coupé court + 1er démarrage rotation",
      why: "Tu joues rotation : objectif = déclencher dès qu’une remise longue coupée arrive.",
      how: [
        "10 min : 1 service court coupé / 1 remise longue coupée imposée / 1 top rotation CD (sécurisé).",
        "10 min : même chose mais placement alterné (diago puis ligne).",
        "Règle : si la remise est mi-longue/molle → top rotation obligatoire (pas de poussette).",
      ],
    },
    {
      title: "T2 — Service long → bloc RV milieu → accélération",
      why: "Tu bloques RV : objectif = bloc actif + replacer + accélérer sur balle suivante.",
      how: [
        "8 min : adversaire démarre CD, toi bloc RV milieu (objectif bas/placé).",
        "8 min : sur la balle suivante, accélération diago CD (sans forcer).",
        "Variante : 1 sur 2 tu bloques long ligne pour casser le rythme.",
      ],
    },
    {
      title: "T3 — Remise : long actif / court court / flick si haut",
      why: "Objectif = prendre le jeu quand tu peux, surtout si service sortant/long.",
      how: [
        "10 min : partenaire varie court/long. Si long ou sortant → remise active (poussette tendue/flip/top porté).",
        "Si court → remise courte obligatoire. Si haut → flick obligatoire.",
        "Score : 1 point si tu fais le bon choix, 0 sinon (et tu notes un marker).",
      ],
    },
  ];

  // Plan 2 semaines (3 séances)
  const plan = [
    { day: "Séance 1", focus: "T1 + décision sur balle favorable", blocks: ["T1 20 min", "Panier: top rotation sécurisé 10 min", "Match à thème: ‘top obligatoire sur mi-longue’ 2 sets"] },
    { day: "Séance 2", focus: "T3 remise active + qualité de placement", blocks: ["T3 20 min", "Service adverse: lecture + flick 10 min", "Match à thème: remise active sur long 2 sets"] },
    { day: "Séance 3", focus: "T2 bloc RV + replacement + accélération", blocks: ["T2 20 min", "Exo replacement RV→CD 10 min", "Match à thème: bloc milieu puis initiative 2 sets"] },
  ];

  // Petites règles de décision “coach” (MODIFIABLE)
  const rules = [
    "Balle mi-longue molle/pas très coupée → top rotation CD en priorité (sécurisé, pas de poussette).",
    "Service adverse long/sortant → action active (poussette tendue/flip/top porté), pas de remise molle.",
    "Après bloc RV : replacement immédiat (petit pas) pour être prêt à pivot ou contre-top.",
  ];

  setReport({
    total,
    won,
    lost,
    topTags,
    favorableTotal,
    favorableLost,
    transitionTotal,
    passiveTotal,
    priorities,
    rules,
    drills,
    plan,
  });
} 

  // Signed URL vidéo
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(video.file_path, 60 * 60);
      if (error) return alert("Erreur lien vidéo: " + error.message);
      if (alive) setUrl(data?.signedUrl || null);
    })();
    return () => {
      alive = false;
    };
  }, [video.file_path]);

  return (
    <div style={card()}>
      <h2 style={{ marginTop: 0 }}>{video.title}</h2>

      <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
        {video.type}
        {video.type === "EXERCICE" ? ` • ${video.theme}` : ` • Set ${video.set_number}`} • {video.recorded_at}
      </div>

      {/* ===== LAYOUT 2 COLONNES ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 12, alignItems: "start" }}>
        {/* GAUCHE : vidéo + ajout marker */}
        <div>
          {url ? (
            <video ref={vidRef} src={url} controls style={{ width: "100%", borderRadius: 12 }} />
          ) : (
            <p>Chargement…</p>
          )}

          {/* AJOUT MARKER */}
          <div style={{ marginTop: 12 }}>
            <h3 style={{ margin: "8px 0" }}>Ajouter un marker</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label>Tag coach</label>
                <select value={markerTag} onChange={(e) => setMarkerTag(e.target.value)} style={input()}>
                  {APP_CONFIG.coachTags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Point</label>
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={input()}>
                  <option value="">—</option>
                  {APP_CONFIG.pointOutcome.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Type de coup (optionnel)</label>
                <select value={shotType} onChange={(e) => setShotType(e.target.value)} style={input()}>
                  <option value="">—</option>
                  {APP_CONFIG.shotTypes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Type de service (optionnel)</label>
                <select value={serveType} onChange={(e) => setServeType(e.target.value)} style={input()}>
                  <option value="">—</option>
                  {APP_CONFIG.serveTypes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label>Note (optionnelle)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={input()}
                  placeholder="Ex: balle molle mi-longue, j’ai poussé"
                />
              </div>
            </div>

            <button onClick={addMarker} style={{ ...btn(true), marginTop: 10 }}>
              Ajouter un marker à l’instant actuel
            </button>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
  <button onClick={generateCoachReport} style={btn(true)}>
    Débrief coach (sans IA)
  </button>
  <button onClick={() => setReport(null)} style={btn(false)}>
    Effacer le débrief
  </button>
</div>

{report ? <CoachReport report={report} /> : null}

          {video.notes ? (
            <p style={{ marginTop: 10, opacity: 0.85 }}>
              <b>Notes:</b> {video.notes}
            </p>
          ) : null}
        </div>

        {/* DROITE : stats + timeline sticky */}
        <div
          style={{
            position: "sticky",
            top: 12,
            maxHeight: "calc(100vh - 40px)",
            overflow: "auto",
            border: "1px solid #eee",
            borderRadius: 14,
            padding: 12,
            background: "#fff",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>Stats</h3>
          <StatsPanel markers={markers} />

          <h3 style={{ margin: "14px 0 10px 0" }}>Timeline</h3>

          {markers.length === 0 ? (
            <p style={{ opacity: 0.75 }}>Aucun marker pour l’instant.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {markers.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "stretch",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid #eee",
                    background: "#fff",
                  }}
                >
                  <button
                    onClick={() => {
                      if (vidRef.current) {
                        vidRef.current.currentTime = m.t_sec;
                        vidRef.current.play();
                      }
                    }}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    title="Aller à ce moment"
                  >
                    <div style={{ fontWeight: 800 }}>
                      {formatTime(m.t_sec)} — {m.tag}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      {m.shot_type ? `Coup: ${m.shot_type} • ` : ""}
                      {m.serve_type ? `Service: ${m.serve_type} • ` : ""}
                      {m.outcome ? `Point: ${m.outcome}` : ""}
                    </div>
                    {m.note ? <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{m.note}</div> : null}
                  </button>

                  <button
                    onClick={() => {
                      const newTag = window.prompt("Nouveau tag coach :", m.tag || "");
                      if (newTag === null) return;

                      const newOutcome = window.prompt('Résultat ("Gagné" / "Perdu" / vide) :', m.outcome || "");
                      if (newOutcome === null) return;

                      const newNote = window.prompt("Note :", m.note || "");
                      if (newNote === null) return;

                      updateMarker(m.id, {
                        tag: newTag || m.tag,
                        outcome: newOutcome || null,
                        note: newNote || null,
                      });

                     
                    }}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      minWidth: 48,
                    }}
                    title="Modifier ce marker"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => deleteMarker(m.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      minWidth: 48,
                    }}
                    title="Supprimer ce marker"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== STATS ===== */
function StatsPanel({ markers }) {
  const total = markers.length;

  const won = markers.filter((m) => m.outcome === "Gagné").length;
  const lost = markers.filter((m) => m.outcome === "Perdu").length;

  const lostRate = total > 0 ? Math.round((lost / total) * 100) : 0;

  const tagCounts = {};
  for (const m of markers) {
    const k = m.tag || "Sans tag";
    tagCounts[k] = (tagCounts[k] || 0) + 1;
  }
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const favorableTag = "Balle favorable non attaquée";
  const favorable = markers.filter((m) => m.tag === favorableTag);
  const favorableTotal = favorable.length;
  const favorableLost = favorable.filter((m) => m.outcome === "Perdu").length;
  const favorableLostRate = favorableTotal > 0 ? Math.round((favorableLost / favorableTotal) * 100) : 0;

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Markers" value={total} />
        <Stat label="Perdus (sur markers)" value={`${lost} (${lostRate}%)`} />
        <Stat label="Gagnés (sur markers)" value={won} />
        <Stat label="Focus 'balle favorable' (nb)" value={favorableTotal} />
      </div>

      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
        <b>Focus :</b> sur <i>{favorableTag}</i>, tu perds {favorableLost} fois ({favorableLostRate}%).
      </div>

      <div style={{ marginTop: 10 }}>
        <b>Top tags</b>
        {topTags.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 6 }}>Aucun tag pour l’instant.</div>
        ) : (
          <ul style={{ marginTop: 6 }}>
            {topTags.map(([tag, c]) => (
              <li key={tag}>
                {tag} — {c}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function CoachReport({ report }) {
  return (
    <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fff" }}>
      <h3 style={{ margin: "0 0 10px 0" }}>Débrief coach (sans IA)</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Markers" value={report.total} />
        <Stat label="Gagnés / Perdus (sur markers)" value={`${report.won} / ${report.lost}`} />
        <Stat label="Balle favorable (nb)" value={report.favorableTotal} />
        <Stat label="Balle favorable → Perdu" value={report.favorableLost} />
      </div>

      <div style={{ marginTop: 10 }}>
        <b>Priorités (2–3 semaines)</b>
        <ul style={{ marginTop: 6 }}>
          {report.priorities.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 10 }}>
        <b>Règles de décision</b>
        <ul style={{ marginTop: 6 }}>
          {report.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: 10 }}>
        <b>Top tags observés</b>
        {report.topTags.length === 0 ? (
          <div style={{ opacity: 0.75, marginTop: 6 }}>Aucun tag.</div>
        ) : (
          <ul style={{ marginTop: 6 }}>
            {report.topTags.map(([tag, c]) => (
              <li key={tag}>
                {tag} — {c}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <b>Exercices recommandés</b>
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          {report.drills.map((d) => (
            <div key={d.title} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>{d.title}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{d.why}</div>
              <ul style={{ marginTop: 6 }}>
                {d.how.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <b>Plan 2 semaines (3 séances type)</b>
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          {report.plan.map((s) => (
            <div key={s.day} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>{s.day} — {s.focus}</div>
              <ul style={{ marginTop: 6 }}>
                {s.blocks.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Astuce: plus tu tags proprement (Gagné/Perdu + note courte), plus le debrief est pertinent.
      </div>
    </div>
  );
}

/* Utils */
function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/* Styles */
function btn(active) {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
  };
}
function card() {
  return {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
  };
}
function input() {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
  };
}
function textarea() {
  return { ...input(), minHeight: 80, resize: "vertical" };
}