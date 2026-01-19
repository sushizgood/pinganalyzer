import { createClient } from "@supabase/supabase-js";

// Ces 2 valeurs viennent du fichier .env (modifiable plus tard)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bucket (modifiable plus tard si tu changes de nom)
export const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || "videos";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log("Bucket utilisé =", import.meta.env.VITE_SUPABASE_BUCKET);