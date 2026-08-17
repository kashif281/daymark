import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Clerk setup required</h1>
          <p className="mt-2 text-sm text-[#777671]">
            Add your Clerk keys to .env to enable sign in.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f7f5] p-6">
      <SignIn />
    </main>
  );
}
