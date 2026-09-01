export default function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (!url || !key) {
    return res.status(500).json({ ok: false, error: 'Supabase environment variables missing' });
  }
  return res.status(200).json({ ok: true, url, key });
}
