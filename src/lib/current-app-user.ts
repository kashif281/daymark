import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";

export async function requireAppUser() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("UNAUTHORIZED");
    }

    return getDb().user.upsert({
      where: { id: "local-development-user" },
      create: {
        id: "local-development-user",
        email: "developer@localhost",
        name: "Local Developer",
      },
      update: {},
    });
  }

  const { userId } = await auth();

  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Clerk user does not have an email address.");
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  const db = getDb();
  return db.user.upsert({
    where: { id: userId },
    create: { id: userId, email, name },
    update: { email, name },
  });
}
