export async function generateShoutoutAI(input: { username: string; personality?: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in environment');
  }
  
  const promptText = `${input.personality || 'You are a space-themed AI assistant.'}

Generate a shoutout for Twitch streamer ${input.username}. DO NOT include their URL in the message.

Requirements:
- NO emojis
- NO hashtags  
- Keep it space-themed
- Use the bot personality above
- Write 400-500 characters (about twice as long as usual)
- Be enthusiastic but follow the personality
- DO NOT include the URL in the response`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: promptText
        }]
      }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 200
      }
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Gemini API Error:', data);
    throw new Error('API failed');
  }
  
  console.log('Gemini API Response:', JSON.stringify(data, null, 2));
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return { shoutout: text || 'AI response failed' };
}