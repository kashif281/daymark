import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-app-user";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAppUser();
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const count = await getDb().pushSubscription.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      configured: Boolean(publicKey && process.env.VAPID_PRIVATE_KEY),
      publicKey: publicKey ?? null,
      subscribed: count > 0,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
      return NextResponse.json(
        { error: "A valid push subscription is required." },
        { status: 400 },
      );
    }

    await getDb().pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        userId: user.id,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
      update: {
        userId: user.id,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
    });

    return NextResponse.json({ subscribed: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireAppUser();
    const body = (await request.json()) as { endpoint?: string };

    if (!body.endpoint) {
      return NextResponse.json({ error: "Endpoint is required." }, { status: 400 });
    }

    await getDb().pushSubscription.deleteMany({
      where: { endpoint: body.endpoint, userId: user.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
