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
    { key: "T3", label: "T3 : remise sur service adverse long → démarrage juste" },
    { key: "T4", label: "T4 : remise sur service adverse court et haut → flick" },
    { key: "T5", label: "T5 : remise sur service adverse court coupé → poussette longue" },
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
    "Action passive",
    "Mauvaise transition RV→CD",
    "Recule trop",
    "Mauvais déplacement",
    "Coup forcé",
    "Mauvaise remise de service",
    "Bon démarrage rotation",
    "Bien servi",
    "Bloc actif",
    "Trop en régu",
  ],

  pointOutcome: ["Gagné", "Perdu"],
};

const BRAND = {
  appName: "Ping Video Analyse — V3 TEST_By_Sushizgood",
  logoUrl: "/logo.png",
  bgUrl: "/bg.png",
};

/* =========================
   Helpers URL (Google Drive / liens)
   ========================= */

function normalizeDriveUrl(url) {
  if (!url) return null;
  const u = url.trim();

  // 1) https://drive.google.com/file/d/<ID>/view?...
  const m1 = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (m1?.[1]) return `https://drive.google.com/uc?export=download&id=${m1[1]}`;

  // 2) https://drive.google.com/open?id=<ID>  ou ...?id=<ID>
  const m2 = u.match(/[?&]id=([^&]+)/);
  if (m2?.[1] && u.includes("drive.google.com")) {
    return `https://drive.google.com/uc?export=download&id=${m2[1]}`;
  }

  // sinon on renvoie tel quel
  return u;
}

function isProbablyUrl(url) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isExternalPath(p) {
  return typeof p === "string" && /^https?:\/\//i.test(p.trim());
}

/* =========================
   App
   ========================= */

export default function App() {
  const [tab, setTab] = useState("UPLOAD"); // UPLOAD | LIBRARY
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);

  // ===== Auth (uniquement pour upload sur Supabase Storage) =====
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) alert("Erreur login: " + error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

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
    <div
      style={{
        minHeight: "100vh",
        backgroundImage: `url('${BRAND.bgUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui",
          background: "rgba(246,247,249,0.92)",
          minHeight: "100vh",
          overflowX: "hidden",
        }}
      >
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          input, select, textarea, button { font: inherit; }
          input, select, textarea { width: 100%; max-width: 100%; }
          img, video { max-width: 100%; height: auto; display: block; }
          html, body { margin: 0; overflow-x: hidden; }
        `}</style>

        <style>{`
          .layout {
            display: grid;
            gap: 16px;
            grid-template-columns: 1fr;
          }
          @media (min-width: 980px) {
            .layout {
              grid-template-columns: 380px 1fr;
              align-items: start;
            }
          }
        `}</style>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <img src={BRAND.logoUrl} alt="Logo" style={{ height: 44, width: "auto" }} />
          <div>
            <h1 style={{ margin: "0 0 2px 0" }}>{BRAND.appName}</h1>
            <div style={{ fontSize: 13, opacity: 0.75 }}>Upload (fichier ou lien) • bibliothèque • markers • stats</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "14px 0 12px 0" }}>
          <button onClick={() => setTab("UPLOAD")} style={btn(tab === "UPLOAD")}>
            Déposer
          </button>
          <button onClick={() => setTab("LIBRARY")} style={btn(tab === "LIBRARY")}>
            Médias
          </button>
        </div>

        {tab === "UPLOAD" && (
          <UploadPanel
            themes={APP_CONFIG.themes}
            session={session}
            onSignIn={signInWithGoogle}
            onSignOut={signOut}
            onUploaded={() => {
              loadVideos();
              setTab("LIBRARY");
            }}
          />
        )}

        {tab === "LIBRARY" && (
          <div className="layout">
            <LibraryPanel
              videos={videos}
              selected={selected}
              onSelect={setSelected}
              onDeleted={(deletedId) => {
                setVideos((prev) => prev.filter((v) => v.id !== deletedId));
                setSelected((prev) => (prev?.id === deletedId ? null : prev));
              }}
            />
            <ViewerPanel video={selected} />
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   Upload
   ========================= */

function UploadPanel({ themes, onUploaded, session, onSignIn, onSignOut }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("EXERCICE"); // EXERCICE | MATCH
  const [theme, setTheme] = useState("T1");
  const [setNumber, setSetNumber] = useState(1);
  const [notes, setNotes] = useState("");
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  // Mode dépôt: LINK (lien) ou FILE (upload Supabase)
  const [sourceMode, setSourceMode] = useState("LINK");

  // Lien vidéo
  const [videoUrl, setVideoUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  // Fichier vidéo
  const [file, setFile] = useState(null);

  async function handleUpload() {
    if (!title.trim()) return alert("Donne un titre.");
    setBusy(true);

    try {
      let file_path = null;

      if (sourceMode === "LINK") {
        const raw = (videoUrl || "").trim();
        if (!raw) {
          setUrlError("Colle un lien.");
          throw new Error("Lien manquant");
        }
        if (!isProbablyUrl(raw)) {
          setUrlError("Le lien ne ressemble pas à une URL valide.");
          throw new Error("URL invalide");
        }
        file_path = normalizeDriveUrl(raw);
      } else {
        // FILE
        if (!session) throw new Error("Connexion Google obligatoire pour uploader un fichier.");
        if (!file) throw new Error("Choisis une vidéo.");

        const ext = file.name.split(".").pop() || "mp4";
        const filename = `${crypto.randomUUID()}.${ext}`;
        const path = `${type.toLowerCase()}/${filename}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type || "video/mp4" });
        if (upErr) throw upErr;

        file_path = path;
      }

      const payload = {
        title,
        type,
        theme: type === "EXERCICE" ? theme : null,
        set_number: type === "MATCH" ? setNumber : null,
        recorded_at: recordedAt,
        notes,
        file_path, // ✅ path storage OU URL externe
      };

      const { error: dbErr } = await supabase.from("videos").insert(payload);
      if (dbErr) throw dbErr;

      setTitle("");
      setNotes("");
      setFile(null);
      setVideoUrl("");
      setPreviewUrl(null);
      setUrlError("");

      onUploaded?.();
    } catch (e) {
      if (e?.message && e.message !== "Lien manquant" && e.message !== "URL invalide") {
        alert("Erreur: " + e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const canUpload =
    !busy &&
    !!title.trim() &&
    (sourceMode === "LINK" ? !!videoUrl.trim() : !!file && !!session);

  return (
    <div style={card()}>
      <style>{`
        .uploadGrid { display: grid; gap: 10px; grid-template-columns: 1fr; }
        @media (min-width: 760px) {
          .uploadGrid { grid-template-columns: 1fr 1fr; }
        }
        .spanAll { grid-column: 1 / -1; }
        .fileBox {
          border: 1px dashed #cfcfcf;
          border-radius: 12px;
          padding: 12px;
          background: #fafafa;
        }
        .pill {
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid #ddd;
          background: #fff;
          cursor: pointer;
        }
        .pillActive {
          background: #111;
          color: #fff;
          border-color: #111;
        }
      `}</style>

      <h2 style={{ marginTop: 0 }}>Déposer une vidéo</h2>

      {/* Choix source */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button
          type="button"
          className={`pill ${sourceMode === "LINK" ? "pillActive" : ""}`}
          onClick={() => setSourceMode("LINK")}
        >
          Lien (Drive / URL)
        </button>
        <button
          type="button"
          className={`pill ${sourceMode === "FILE" ? "pillActive" : ""}`}
          onClick={() => setSourceMode("FILE")}
        >
          Fichier (Supabase)
        </button>
      </div>

      <div className="uploadGrid">
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

        <div className="spanAll">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={textarea()} placeholder='Ex: "être plus actif sur balle favorable"' />
        </div>

        {/* MODE LIEN */}
        {sourceMode === "LINK" ? (
          <div className="spanAll">
            <label>Lien vidéo (Google Drive / autre)</label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setUrlError("");
                  setPreviewUrl(null);
                }}
                style={{ ...input(), flex: 1, minWidth: 260 }}
                placeholder="Colle ici ton lien partageable Google Drive"
              />

              <button
                type="button"
                onClick={() => {
                  const raw = videoUrl.trim();
                  if (!raw) return setUrlError("Colle un lien.");
                  if (!isProbablyUrl(raw)) return setUrlError("Le lien ne ressemble pas à une URL valide.");
                  const normalized = normalizeDriveUrl(raw);
                  setPreviewUrl(normalized);
                  setUrlError("");
                }}
                style={btn(false)}
              >
                Vérifier
              </button>
            </div>

            {urlError ? <div style={{ marginTop: 8, fontSize: 13, color: "#b00020" }}>{urlError}</div> : null}

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
              Google Drive : Partager → “Toute personne avec le lien” → Lecteur
            </div>

            {previewUrl ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Aperçu :</div>
                <video src={previewUrl} controls style={{ width: "100%", borderRadius: 12, border: "1px solid #eee" }} />
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                  Si l’aperçu ne marche pas : droits Drive (pas “toute personne avec le lien”), ou Drive bloque le streaming direct.
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* MODE FICHIER */
          <div className="spanAll">
            <label>Fichier vidéo</label>
            <div className="fileBox">
              <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ width: "100%" }} />
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{file ? `Sélectionné : ${file.name}` : "Aucun fichier sélectionné"}</div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {session ? (
                <>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    Connecté : <b>{session.user.email}</b>
                  </div>
                  <button onClick={onSignOut} style={btn(false)}>
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>Pour uploader un fichier, connecte-toi avec Google.</div>
                  <button onClick={onSignIn} style={btn(true)}>
                    Se connecter (Google)
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <button onClick={handleUpload} disabled={!canUpload} style={{ ...btn(true), marginTop: 12, opacity: canUpload ? 1 : 0.6 }}>
        {busy ? "Envoi..." : "Enregistrer"}
      </button>
    </div>
  );
}

/* =========================
   Library + delete video
   ========================= */

function LibraryPanel({ videos, selected, onSelect, onDeleted }) {
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    return (videos || [])
      .filter((v) => (filterType === "ALL" ? true : v.type === filterType))
      .filter((v) => (q.trim() ? (v.title || "").toLowerCase().includes(q.toLowerCase()) : true));
  }, [videos, q, filterType]);

  async function deleteVideo(v) {
    const ok = window.confirm(
      `Supprimer "${v.title}" ?\n\n- Supprime la ligne en base\n- Supprime aussi les markers liés\n- Supprime le fichier storage si c'est un upload Supabase`
    );
    if (!ok) return;

    setBusyId(v.id);
    try {
      const { error: mErr } = await supabase.from("markers").delete().eq("video_id", v.id);
      if (mErr) throw mErr;

      const { error: vErr } = await supabase.from("videos").delete().eq("id", v.id);
      if (vErr) throw vErr;

      if (v.file_path && !isExternalPath(v.file_path)) {
        const { error: sErr } = await supabase.storage.from(BUCKET).remove([v.file_path]);
        if (sErr) console.warn("Storage remove error:", sErr.message);
      }

      onDeleted?.(v.id);
    } catch (e) {
      alert("Erreur suppression vidéo: " + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={card()}>
      <h2 style={{ marginTop: 0 }}>Vidéos</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} style={{ ...input(), flex: 1, minWidth: 220 }} placeholder="Rechercher..." />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...input(), width: 160 }}>
          <option value="ALL">Tous</option>
          <option value="EXERCICE">Exercices</option>
          <option value="MATCH">Matchs</option>
        </select>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((v) => (
          <div
            key={v.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "stretch",
              padding: 10,
              borderRadius: 12,
              border: selected?.id === v.id ? "2px solid #111" : "1px solid #eee",
              background: "#fff",
            }}
          >
            <button
              onClick={() => onSelect(v)}
              style={{
                flex: 1,
                textAlign: "left",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <div style={{ fontWeight: 800 }}>{v.title}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {v.type}
                {v.type === "EXERCICE" ? ` • ${v.theme}` : ` • Set ${v.set_number}`} • {v.recorded_at}
                {isExternalPath(v.file_path) ? " • lien" : " • upload"}
              </div>
            </button>

            <button
              onClick={() => deleteVideo(v)}
              disabled={busyId === v.id}
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: busyId === v.id ? "not-allowed" : "pointer",
                minWidth: 44,
                opacity: busyId === v.id ? 0.6 : 1,
              }}
              title="Supprimer la vidéo"
            >
              🗑
            </button>
          </div>
        ))}

        {filtered.length === 0 ? <div style={{ opacity: 0.75, padding: 10 }}>Aucun résultat.</div> : null}
      </div>
    </div>
  );
}

/* =========================
   Viewer
   ========================= */

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
  const [report, setReport] = useState(null);

  const [markers, setMarkers] = useState([]);
  const [markerTag, setMarkerTag] = useState(APP_CONFIG.coachTags[0]);
  const [shotType, setShotType] = useState("");
  const [serveType, setServeType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");

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

    const passiveTag = "Action passive";
    const passiveTotal = markers.filter((m) => m.tag === passiveTag).length;

    const transitionTag = "Mauvaise transition RV→CD";
    const transitionTotal = markers.filter((m) => m.tag === transitionTag).length;

    const lostRate = total > 0 ? lost / total : 0;
    const favorableRate = total > 0 ? favorableTotal / total : 0;

    const priorities = [];
    if (favorableTotal >= 3 || favorableRate >= 0.2) priorities.push("Prendre l’initiative sur balle favorable (mi-longue/molle/pas très coupée).");
    if (transitionTotal >= 3) priorities.push("Améliorer la transition RV→CD (replacement + déclenchement).");
    if (passiveTotal >= 3 || lostRate >= 0.45) priorities.push("Réduire le jeu passif : décider plus tôt (actif long / court court / flick si haut).");
    if (priorities.length === 0) priorities.push("Continuer : consolider service + 1er démarrage en rotation, et sécuriser le replacement.");

    const drills = [
      { title: "T1 — Service coupé court + démarrage rotation", why: "Déclencher dès qu’une remise longue coupée arrive.", how: ["Service court coupé, remise longue coupée imposée, top rotation CD sécurisé", "Varier placement : diago / ligne", "Interdiction de poussette sur balle mi-longue"] },
      { title: "T2 — Service long + bloc RV + accélération", why: "Exploiter ton point fort en bloc RV puis finir le point.", how: ["Bloc RV actif milieu", "Replacement immédiat", "Accélération CD sur balle suivante"] },
      { title: "T3 — Remise longue active", why: "Prendre l’initiative dès que le service adverse est long.", how: ["Top rotation CD ou RV selon placement", "Objectif sécurité avant vitesse"] },
      { title: "T4 — Remise courte haute → flick", why: "Punir immédiatement les services courts mal dosés.", how: ["Lecture hauteur avant effet", "Flick sécurité avant vitesse"] },
      { title: "T5 — Remise courte coupée → poussette longue", why: "Éviter le jeu passif court-court.", how: ["Poussette longue tendue", "Variation milieu / coude"] },
    ];

    const plan = [
      { day: "Séance 1", focus: "T1 + décision sur balle favorable", blocks: ["T1 20 min", "Panier: top rotation sécurisé 10 min", "Match à thème: ‘top obligatoire sur mi-longue’ 2 sets"] },
      { day: "Séance 2", focus: "T3/T4/T5 remises + qualité", blocks: ["T3 10 min", "T4 10 min", "T5 10 min", "Match à thème: remise active dès que possible 2 sets"] },
      { day: "Séance 3", focus: "T2 bloc RV + replacement + accélération", blocks: ["T2 20 min", "Exo replacement RV→CD 10 min", "Match à thème: bloc milieu puis initiative 2 sets"] },
    ];

    const rules = [
      "Balle mi-longue molle/pas très coupée → top rotation CD en priorité (sécurisé, pas de poussette).",
      "Service adverse long/sortant → action active (poussette tendue/flip/top porté), pas de remise molle.",
      "Après bloc RV : replacement immédiat (petit pas) pour être prêt à pivot ou contre-top.",
    ];

    setReport({ total, won, lost, topTags, favorableTotal, favorableLost, transitionTotal, passiveTotal, priorities, rules, drills, plan });
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      const p = video.file_path;

      if (isExternalPath(p)) {
        if (alive) setUrl(p);
        return;
      }

      if (p) {
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(p, 60 * 60);
        if (error) return alert("Erreur lien vidéo: " + error.message);
        if (alive) setUrl(data?.signedUrl || null);
        return;
      }

      if (alive) setUrl(null);
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

      <style>{`
        .playerGrid { display: grid; gap: 12px; grid-template-columns: 1fr; }
        @media (min-width: 980px) {
          .playerGrid { grid-template-columns: 1fr 420px; }
        }
      `}</style>

      <div className="playerGrid">
        {/* GAUCHE */}
        <div>
          {url ? <video ref={vidRef} src={url} controls style={{ width: "100%", borderRadius: 12 }} /> : <p>Chargement…</p>}

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
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={input()} placeholder="Ex: balle molle mi-longue, j’ai poussé" />
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

        {/* DROITE */}
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
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer", minWidth: 48 }}
                    title="Modifier ce marker"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => deleteMarker(m.id)}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer", minWidth: 48 }}
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

/* =========================
   Stats / Coach report
   ========================= */

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
              <div style={{ fontWeight: 800 }}>
                {s.day} — {s.focus}
              </div>
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

/* =========================
   Utils + styles
   ========================= */

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

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
    border: "1px solid #e6e8eb",
    borderRadius: 16,
    padding: 16,
    background: "#fff",
    boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
    overflow: "hidden",
  };
}

function input() {
  return {
    width: "100%",
    maxWidth: "100%",
    display: "block",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textarea() {
  return {
    ...input(),
    minHeight: 60,
    resize: "vertical",
    lineHeight: "1.4",
  };
}
