import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Verify caller is authenticated
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { invite_id, timetable_name, invite_url } = await req.json()
    if (!invite_id || !timetable_name || !invite_url) {
      return json({ error: 'Missing required fields' }, 400)
    }

    // Fetch the invite using service role (bypasses RLS for safe lookup)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: invite } = await admin
      .from('timetable_invites')
      .select('invited_email')
      .eq('id', invite_id)
      .eq('invited_by', user.id)
      .eq('status', 'pending')
      .single()

    if (!invite) return json({ error: 'Invite not found' }, 404)

    const inviterName =
      user.user_metadata?.full_name ||
      user.user_metadata?.first_name ||
      user.email

    // Send via Resend — set RESEND_API_KEY in Supabase Dashboard → Edge Functions → Secrets
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('EMAIL_FROM') ?? 'Timetable Planner <noreply@timetableplanner.app>',
        to: invite.invited_email,
        subject: `${inviterName} invited you to "${timetable_name}"`,
        html: emailHtml(inviterName, timetable_name, invite_url),
      }),
    })

    if (!res.ok) {
      console.error('Resend error:', await res.text())
      return json({ error: 'Failed to send email' }, 500)
    }

    return json({ ok: true })
  } catch (err) {
    console.error(err)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function emailHtml(inviter: string, timetableName: string, inviteUrl: string) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f5f2ee;margin:0;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;
              border-top:4px solid #2a5c4e;padding:36px 32px;">
    <h2 style="margin:0 0 8px;color:#2a5c4e;font-size:1.3rem;">You've been invited!</h2>
    <p style="color:#3a4a44;margin:0 0 24px;">
      <strong>${inviter}</strong> has invited you to view the timetable
      <strong>"${timetableName}"</strong> on Timetable Planner.
    </p>
    <a href="${inviteUrl}"
       style="display:inline-block;background:#2a5c4e;color:#fff;padding:13px 28px;
              border-radius:8px;text-decoration:none;font-weight:600;font-size:0.95rem;">
      Accept Invite →
    </a>
    <p style="margin:28px 0 0;color:#8a9a92;font-size:0.8rem;line-height:1.5;">
      This invite expires in 72 hours. You need an existing Timetable Planner
      account to accept it — make sure you're signed in with
      <strong>${inviteUrl.includes('token=') ? 'the invited email address' : 'your account'}</strong>.
    </p>
  </div>
</body>
</html>`
}
