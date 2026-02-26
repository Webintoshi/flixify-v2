/**
 * STREAM SESSION END
 * 
 * Kullanıcı video player'ı kapattığında veya stream bittiğinde
 * session'ı sonlandırır.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required' });
    }

    // Session'ı sonlandır
    const { error } = await supabase
      .from('stream_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
      })
      .eq('session_token', sessionToken);

    if (error) {
      console.error('[STREAM END] Error:', error);
      return res.status(500).json({ error: 'Failed to end session' });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('[STREAM END ERROR]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
