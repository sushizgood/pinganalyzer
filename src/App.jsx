import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

/* =========================
   CONFIG
========================= */
const APP_CONFIG = {
  themes: [
    { key: "T1", label: "Service coupé court + démarrage" },
    { key: "T2", label: "Service long → bloc → accélération" },
    { key: "T3", label: "Remise longue → démarrage" },
    { key: "T4", label: "Remise courte haute → flick" },
    { key: "T5", label: "Remise courte coupée → poussette longue" },
  ],
  coachTags: [
    "Balle favorable non attaquée",
    "Action passive",
    "Mauvaise transition RV→CD",
    "Mauvais déplacement",
    "Bon démarrage rotation",
  ],
  pointOutcome: ["Gagné", "Perdu"],
};

/* =========================
   UTILS
========================= */
function normalizeDriveUrl(url) {
  if (!url) return null;
  const m = url.match(/file\/d\/([^/]+)/);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : url;
}

/* =========================
   APP
========================= */
export default function App() {
  const [videos, setVideos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    loadVideos();
  }, []);

  async function loadVideos() {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });
    setVideos(data || []);
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <h1>🏓 Ping Video Analyzer</h1>

      {!session && (
        <button onClick={signIn}>Connexion Google (upload)</button>
      )}

      <UploadPanel session={session} onUploaded={loadVideos} />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        <div>
          <h3>Vidéos</h3>
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v)}
              style={{ display: "block", width: "100%", marginBottom: 6 }}
            >
              {v.title}
            </button>
          ))}
        </div>

        <div>{selected && <VideoPlayer video={selected} />}</div>
      </div>
    </div>
  );
}

/* =========================
   UPLOAD (LIEN)
========================= */
function UploadPanel({ session, onUploaded }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  async function save() {
    if (!session) return alert("Connexion requise");
    if (!title || !url) return alert("Titre + lien requis");

    await supabase.from("videos").insert({
      title,
      video_url: normalizeDriveUrl(url),
      type: "EXERCICE",
      recorded_at: new Date().toISOString().slice(0, 10),
    });

    setTitle("");
    setUrl("");
    onUploaded();
  }

  return (
    <div style={{ margin: "20px 0" }}>
      <h3>Ajouter une vidéo (lien Google Drive)</h3>
      <input
        placeholder="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", marginBottom: 6 }}
      />
      <input
        placeholder="Lien partageable Google Drive"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "100%", marginBottom: 6 }}
      />
      <button onClick={save}>Enregistrer</button>
    </div>
  );
}

/* =========================
   PLAYER
========================= */
function VideoPlayer({ video }) {
  return (
    <div>
      <h2>{video.title}</h2>

      <video
        src={video.video_url}
        controls
        style={{ width: "100%", maxHeight: 500 }}
      />

      <p style={{ fontSize: 13 }}>
        Si la vidéo ne se lit pas :
        <br />
        <a href={video.video_url} target="_blank" rel="noreferrer">
          Ouvrir dans Google Drive
        </a>
      </p>
    </div>
  );
}