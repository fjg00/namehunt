const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input, previousNames = [] } = req.body || {};

  if (!input || typeof input !== 'string' || input.trim().length < 3) {
    return res.status(400).json({ error: 'Input is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const safeInput = input.trim().slice(0, 600);
  const safePrev  = Array.isArray(previousNames)
    ? previousNames.filter(n => /^[a-z]{4,12}$/.test(n)).slice(0, 300)
    : [];

  const avoidClause = safePrev.length
    ? `\nDo NOT repeat any of these already-generated names: ${safePrev.join(', ')}.`
    : '';

  const prompt = `You are a startup naming expert. Generate exactly 35 creative, memorable startup names for this business idea:

"${safeInput}"

Rules:
- Each name must be 4–12 lowercase letters only — no spaces, hyphens, or numbers
- Names must feel semantically relevant to the business concept
- Mix styles: invented words, portmanteaus, evocative single words, prefix/suffix combos
- Think Stripe, Notion, Vercel, Linear, Figma — short, punchy, brandable
- Vary the style across all 35 names${avoidClause}

Return ONLY the 35 names, one per line, nothing else — no numbering, no explanations.`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content?.[0]?.text || '';
    const names = text
      .split('\n')
      .map(l => l.trim().toLowerCase().replace(/[^a-z]/g, ''))
      .filter(n => /^[a-z]{4,12}$/.test(n));

    return res.status(200).json({ names });
  } catch (err) {
    console.error('Anthropic error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate names' });
  }
};
