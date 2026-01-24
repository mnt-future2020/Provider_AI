import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/prisma/prisma';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// POST - Save message to session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { role, content, toolCalls } = await request.json();

    // Verify session belongs to user
    const session = await prisma.chatSession.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Save message
    const message = await prisma.message.create({
      data: {
        sessionId: id,
        role,
        content,
        toolCalls: toolCalls || null
      }
    });

    // Update session's updatedAt
    await prisma.chatSession.update({
      where: { id: id },
      data: { updatedAt: new Date() }
    });

    // Auto-generate descriptive title after AI responds
    const title = session.title || '';
    if (role === 'assistant' && (title === 'New Chat' || title.toLowerCase().includes('hello') || title.toLowerCase().includes('greeting') || title.toLowerCase().includes('hi'))) {
      try {
        // Get all messages in the conversation so far
        const allMessages = await prisma.message.findMany({
          where: {
            sessionId: id
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: 6 // Get first 6 messages to understand context
        });

        if (allMessages.length >= 2) {
          // Build conversation context
          const conversationContext = allMessages
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

          // Use AI to generate a concise, descriptive title based on the actual topic
          const { text: generatedTitle } = await generateText({
            model: openai('gpt-4o-mini'),
            prompt: `Based on this conversation, generate a very short, descriptive title (2-4 words) that captures the MAIN TOPIC or ACTION being discussed. Ignore greetings like "hello" or "hi" and focus on the actual task or question.

Conversation:
${conversationContext}

Respond with ONLY the title, no quotes or extra text. Focus on the main action or topic, not greetings. Examples: "Email sending task", "GitHub repository help", "Calendar event creation", "Document editing"`
          });

          const title = generatedTitle.trim().slice(0, 40);
          
          await prisma.chatSession.update({
            where: { id: id },
            data: { title }
          });
        }
      } catch (error) {
        console.error('Error generating title:', error);
        // Fallback to simple title if AI generation fails
        const messages = await prisma.message.findMany({
          where: { sessionId: id },
          orderBy: { createdAt: 'asc' },
          take: 3
        });
        
        // Find first non-greeting message
        const meaningfulMessage = messages.find(m => 
          m.role === 'user' && 
          !m.content.toLowerCase().match(/^(hi|hello|hey|greetings?)$/i)
        );
        
        if (meaningfulMessage) {
          let title = meaningfulMessage.content.trim();
          title = title.charAt(0).toUpperCase() + title.slice(1);
          if (title.length > 40) {
            title = title.slice(0, 40).trim() + '...';
          }
          await prisma.chatSession.update({
            where: { id: id },
            data: { title }
          });
        }
      }
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
