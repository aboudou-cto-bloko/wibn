import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const ROLE_LIMITS = {
  free: 3,
  pro: -1,
  agency: -1,
  enterprise: -1,
  admin: -1,
};

export async function checkQuota(
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const [userRecord] = await db.select().from(user).where(eq(user.id, userId));

  if (!userRecord) {
    return { allowed: false, remaining: 0 };
  }

  const limit = ROLE_LIMITS[userRecord.role as keyof typeof ROLE_LIMITS];

  // Plans illimités
  if (limit === -1) {
    return { allowed: true, remaining: -1 };
  }

  // Vérifie si le mois est passé
  const now = new Date();
  const resetDate = userRecord.quotaResetDate;

  if (resetDate && now > resetDate) {
    // Reset le quota
    await db
      .update(user)
      .set({
        ideasUsedThisMonth: 0,
        quotaResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      })
      .where(eq(user.id, userId));

    return { allowed: true, remaining: limit };
  }

  const used = userRecord.ideasUsedThisMonth || 0;
  const remaining = limit - used;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}

export async function incrementQuota(userId: string) {
  await db
    .update(user)
    .set({
      ideasUsedThisMonth: sql`${user.ideasUsedThisMonth} + 1`,
    })
    .where(eq(user.id, userId));
}
