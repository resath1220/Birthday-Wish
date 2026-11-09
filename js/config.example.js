/**
 * Public browser config. The publishable (anon) key is designed to be exposed;
 * security comes from Row Level Security policies (see supabase/schema.sql).
 * NEVER put a service_role / secret key here.
 */
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "YOUR_SUPABASE_PUBLISHABLE_KEY",
};
