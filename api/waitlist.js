// Vercel serverless function — waitlist form handler
// Sends email via Resend when RESEND_API_KEY + NOTIFY_EMAIL env vars are set.
//
// Setup:
//   1. Create a free Resend account at https://resend.com
//   2. Verify your sending domain (or use onboarding@resend.dev for testing)
//   3. Add env vars in Vercel project settings:
//        RESEND_API_KEY  — your Resend API key
//        NOTIFY_EMAIL    — where to send notifications (e.g. andrew@lexenne.com)
//   4. Optional: set FROM_EMAIL (defaults to waitlist@lexenne.com)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first_name, last_name, email, interests } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'waitlist@lexenne.com';

  if (RESEND_API_KEY && NOTIFY_EMAIL) {
    const name = [first_name, last_name].filter(Boolean).join(' ') || '(name not provided)';
    const interestList = Array.isArray(interests)
      ? interests.join(', ')
      : (interests || 'not specified');

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Lexenne Waitlist <${FROM_EMAIL}>`,
        to: [NOTIFY_EMAIL],
        subject: `Waitlist signup: ${name} <${email}>`,
        text: [
          'New Lexenne waitlist signup',
          '',
          `Name:      ${name}`,
          `Email:     ${email}`,
          `Interests: ${interestList}`,
        ].join('\n'),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      // Still return 200 — don't surface infra errors to the user
    }
  } else {
    // Log to Vercel function logs as a fallback when env vars aren't set
    console.log('Waitlist signup (env vars not configured):', {
      name: [first_name, last_name].filter(Boolean).join(' '),
      email,
      interests,
    });
  }

  return res.status(200).json({ ok: true });
}
