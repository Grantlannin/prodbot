import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './orchestrator-prompt';

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { messages, context } = (await req.json()) as {
      messages: Array<{ role: 'user' | 'agent'; content: string; variant?: string }>;
      context?: {
        workStatus?: string;
        accomplishments?: string[];
        currentDate?: string;
      };
    };

    const contextBlock = context
      ? `

[REFERENCE — use only when helpful]
Current date/time (from client): ${context.currentDate ?? 'unknown'}
Work timer status: ${context.workStatus ?? 'unknown'}
Accomplishments logged today (${context.accomplishments?.length ?? 0}):${
          context.accomplishments && context.accomplishments.length > 0
            ? '\n' + context.accomplishments.map(a => `  - ${a}`).join('\n')
            : '\n  (none)'
        }`
      : '';

    const apiMessages = messages
      .filter(m => m.variant !== 'seed')
      .filter(m => m.content && m.content.trim().length > 0)
      .slice(-24)
      .map(m => ({
        role: m.role === 'agent' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

    if (apiMessages.length === 0) {
      return NextResponse.json({
        content: 'Understood. Send a message when you are ready to continue.',
      });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: ORCHESTRATOR_SYSTEM_PROMPT + contextBlock,
      messages: apiMessages,
    });

    const text =
      response.content[0]?.type === 'text'
        ? response.content[0].text
        : 'I did not get a clear response. Please send that again.';

    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('[agent-chat]', error);
    return NextResponse.json(
      { content: 'Something went wrong reaching the model. Check your connection and API key, then try again.' },
      { status: 500 }
    );
  }
}
