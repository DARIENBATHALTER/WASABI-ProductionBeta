import { Router, Request, Response } from 'express';

export const chatRouter = Router();

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: OpenAIMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

// POST /api/chat - Proxy to OpenAI
chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured on server'
      });
    }

    const {
      messages,
      model = 'gpt-4o',
      maxTokens = 2000,
      temperature = 0.7,
      stream = false
    }: ChatRequest = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required'
      });
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json().catch(() => null);
      console.error('OpenAI API error:', errorData);
      return res.status(openAIResponse.status).json({
        error: `OpenAI API error: ${openAIResponse.status}`,
        details: errorData?.error?.message || openAIResponse.statusText
      });
    }

    if (stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = openAIResponse.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: 'No response body from OpenAI' });
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      // Handle regular JSON response
      const data = await openAIResponse.json();
      res.json(data);
    }

  } catch (error) {
    console.error('Chat proxy error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/chat/test - Test the OpenAI connection
chatRouter.get('/test', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      res.json({ success: true, message: 'OpenAI API connection successful' });
    } else {
      res.json({ success: false, error: `API returned ${response.status}` });
    }
  } catch (error) {
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    });
  }
});
