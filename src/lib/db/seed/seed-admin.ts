import { db } from "@/lib/db/index";
import { user } from "@/lib/db/schema";
import { auth } from "@/lib/auth/auth";
import { eq } from "drizzle-orm";

/**
 * Crée (ou promeut) le premier compte admin, à partir des variables
 * d'environnement ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
 *
 * Idempotent : si l'utilisateur existe déjà, on se contente de s'assurer
 * que son role est bien "admin".
 *
 * Usage : pnpm db:seed:admin
 */
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.log(
      "ADMIN_EMAIL / ADMIN_PASSWORD non définis — seed admin ignoré.",
    );
    return;
  }

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db
        .update(user)
        .set({ role: "admin" })
        .where(eq(user.email, email));
      console.log(`✅ ${email} promu admin.`);
    } else {
      console.log(`✅ ${email} est déjà admin.`);
    }
    return;
  }

  await auth.api.signUpEmail({
    body: { email, password, name },
  });

  await db.update(user).set({ role: "admin" }).where(eq(user.email, email));

  console.log(`✅ Compte admin créé : ${email}`);
}

if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Erreur seed admin :", error);
      process.exit(1);
    });
}
