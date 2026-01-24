import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from 'ai';
import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import { getSession } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const maxDuration = 120; // Allow longer execution for complex multi-tool tasks

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
        
        // Create a Tool Router session for the user
        // Tool Router handles search, authentication, and execution internally
        const session = await composio.create(user.id);
        
        console.log("Session created. Fetching tools...");
        const tools = await session.tools();
        console.log(`Tools fetched successfully. Tool count: ${Object.keys(tools).length}`);

        const result = streamText({
            model: openai('gpt-4o'),
            system: `You are iSuiteAI, a helpful personal assistant. Use Composio tools to take action.

## CRITICAL RULES

1. **DOCUMENT THEN EMAIL WORKFLOW**:
   - When asked to create a document AND email a link:
   - Step 1: Create the document using the appropriate tool
   - Step 2: WAIT for the result - extract the ACTUAL URL (documentUrl, spreadsheetUrl, webViewLink)
   - Step 3: ONLY THEN send the email with the REAL URL
   - NEVER use placeholder text like "[Insert link]" or "[link to document]"

2. **NEVER RETRY TOOL CALLS**: Call each tool ONCE only.

3. **EMAIL CONTENT MUST BE COMPLETE**:
   - Include the FULL actual URL in the email body (e.g., https://docs.google.com/document/d/...)
   - NOT: "[Insert link here]" or "[link]" - this is WRONG

4. Be concise and friendly
5. Don't show technical IDs
6. Send exactly ONE email per request

User: ${user.name} (${user.email})`,
            messages: await convertToModelMessages(messages),
            tools,
            // Step limit
            stopWhen: stepCountIs(10),
            // Log each step for debugging
            onStepFinish: (event) => {
                console.log(`\n=== Step finished, reason: ${event.finishReason} ===`);
                
                // Log tool calls with their arguments
                if (event.toolCalls && event.toolCalls.length > 0) {
                    console.log(`Tool calls: ${event.toolCalls.map((tc: any) => tc.toolName).join(', ')}`);
                    event.toolCalls.forEach((tc: any, idx: number) => {
                        console.log(`  [${idx + 1}] ${tc.toolName}`);
                        // Try multiple ways to get args (Vercel AI SDK varies)
                        const args = tc.args || tc.arguments || tc.input || {};
                        if (Object.keys(args).length > 0) {
                            const argsStr = JSON.stringify(args, null, 2);
                            console.log(`    Args: ${argsStr.slice(0, 800)}`);
                        } else {
                            // Log the full tool call object if args is empty
                            console.log(`    Full TC:`, JSON.stringify(tc).slice(0, 500));
                        }
                    });
                }
                
                // Log tool results
                if (event.toolResults && event.toolResults.length > 0) {
                    console.log(`Results: ${event.toolResults.length}`);
                    event.toolResults.forEach((tr: any, idx: number) => {
                        const result = tr.result || tr.output || tr;
                        const resultStr = JSON.stringify(result, null, 2);
                        const success = result?.successful !== false && !result?.error;
                        const icon = success ? '✅' : '❌';
                        console.log(`  ${icon} [${tr.toolName}]: ${resultStr.slice(0, 1000)}`);
                        if (result?.error) {
                            console.log(`    ERROR: ${result.error}`);
                        }
                    });
                } else if (event.toolCalls && event.toolCalls.length > 0) {
                    console.log(`Results: PENDING (async execution)`);
                }
                
                console.log(`Tokens: ${event.usage?.totalTokens || '?'}\n`);
            },
            onError: (event) => {
                console.error('Stream error:', event.error);
            },
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
