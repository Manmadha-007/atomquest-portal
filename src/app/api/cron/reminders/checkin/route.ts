import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify, NotificationEvent } from '@/lib/notifications';
import { GoalStatus } from '@prisma/client';

// Keep this route dynamic so it is never cached
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Authenticate the cron request (Vercel uses an Auth header)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  console.log('[Cron] Starting check-in reminder batch execution');

  try {
    // 2. Query goals requiring reminders
    // We assume an active review cycle and goals that are APPROVED.
    const goalsRequiringReminder = await prisma.goal.findMany({
      where: {
        isArchived: false,
        status: GoalStatus.APPROVED,
        reviewCycle: {
          isActive: true,
        },
      },
      select: {
        id: true,
        title: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    console.log(`[Cron] Found ${goalsRequiringReminder.length} goals requiring reminders`);

    let sentCount = 0;
    let failedCount = 0;

    // 3. Trigger notifications
    // Await them sequentially for safety, or use Promise.all for speed.
    for (const goal of goalsRequiringReminder) {
      if (!goal.owner.email) {
        failedCount++;
        continue;
      }

      try {
        await notify({
          event: NotificationEvent.CHECKIN_REMINDER,
          actor: {
            id: 'SYSTEM',
            name: 'AtomQuest System',
          },
          recipient: {
            id: goal.owner.id,
            name: `${goal.owner.firstName} ${goal.owner.lastName}`.trim(),
            email: goal.owner.email,
          },
          metadata: {
            goalId: goal.id,
            goalTitle: goal.title,
            message: 'It is time for your regular goal check-in. Please take a moment to update your progress.',
          },
        });
        sentCount++;
      } catch (err) {
        console.error(`[Cron] Failed to process reminder for goal ${goal.id}`, err);
        failedCount++;
      }
    }

    const durationMs = Date.now() - startTime;

    // 4. Structured logging
    console.log('[Cron] Check-in reminder batch execution completed', {
      durationMs,
      totalProcessed: goalsRequiringReminder.length,
      sentCount,
      failedCount,
    });

    return NextResponse.json({
      success: true,
      processed: goalsRequiringReminder.length,
      sent: sentCount,
      failed: failedCount,
      durationMs,
    });

  } catch (error) {
    console.error('[Cron] Fatal error during check-in reminder execution', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
