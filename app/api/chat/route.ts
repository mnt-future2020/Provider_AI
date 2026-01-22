import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow longer execution for tools

export async function POST(req: Request) {
    try {
        // Check authentication
        const user = await getSession();
        
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized. Please login first.' },
                { status: 401 }
            );
        }

        const { messages }: { messages: UIMessage[] } = await req.json();

        // Initialize Composio with Vercel provider
        const composio = new Composio({
            provider: new VercelProvider(),
            apiKey: process.env.COMPOSIO_API_KEY
        });

        console.log(`Creating session for user: ${user.id}`);
        // Create a session for the authenticated user
        const session = await composio.create(user.id);
        console.log("Session created. Fetching tools...");
        const tools = await session.tools();
        console.log(`Tools fetched successfully.`);

        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: `You are iSuiteAI, a professional productivity assistant. You have access to external tools via Composio. Help users automate their workflows efficiently. User: ${user.name} (${user.email})`,
            messages: await convertToModelMessages(messages),
            tools,
            stopWhen: stepCountIs(5),
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { error: 'Failed to process chat request' },
            { status: 500 }
        );
    }
}
