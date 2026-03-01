const SUPABASE_URL = "https://pefwhckdkwsjyhibzdgo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LZGOH7ysNNNHV2Mq-MzMvQ_lY_UCI7U";

if (typeof window.supabase === "undefined") {
  console.error("[KAREBE:SUPABASE] SDK not loaded; client not initialized.");
} else if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[KAREBE:SUPABASE] Missing URL or anon key; client not initialized.");
} else {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.info("[KAREBE:SUPABASE] Client initialized.", { url: SUPABASE_URL });
}
