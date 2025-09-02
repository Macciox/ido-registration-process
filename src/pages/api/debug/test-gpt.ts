import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing GPT API...');
    console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
    console.log('API Key length:', process.env.OPENAI_API_KEY?.length || 0);

    const testPrompt = `You are a test. Respond with exactly this JSON:
[
  {
    "status": "FOUND",
    "coverage_score": 85,
    "reasoning": "Test successful",
    "evidence_snippets": ["This is a test"]
  }
]`;

    console.log('📤 Sending test request to GPT...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: testPrompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    console.log('📥 GPT Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      console.log('✅ GPT Response received:', content);
      
      res.status(200).json({
        success: true,
        gptStatus: response.status,
        gptResponse: content,
        apiKeyConfigured: !!process.env.OPENAI_API_KEY,
        message: 'GPT test successful'
      });
    } else {
      const errorText = await response.text();
      console.log('❌ GPT Error:', response.status, errorText);
      
      res.status(200).json({
        success: false,
        gptStatus: response.status,
        gptError: errorText,
        apiKeyConfigured: !!process.env.OPENAI_API_KEY,
        message: 'GPT test failed'
      });
    }

  } catch (error: any) {
    console.error('🚨 Test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Test failed with exception'
    });
  }
}