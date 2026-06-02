export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'JStip Auth <onboarding@resend.dev>',
        to: email,
        subject: 'Your JStip Login Code',
        html: `
          <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h2>Welcome to JStip!</h2>
            <p>Your one-time password to login or register is:</p>
            <h1 style="font-size: 32px; letter-spacing: 4px; color: #0D1B2E; background: #f2f5f7; padding: 20px; border-radius: 8px;">${otp}</h1>
            <p>This code is valid for 5 minutes.</p>
          </div>
        `
      })
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      return res.status(response.status).json({ error: data });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
