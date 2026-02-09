import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/db";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  try {
    await prisma.waitlist.create({
      data: { email: parsed.data.email },
    });
  } catch (err: unknown) {
    // Prisma unique constraint violation
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "This email is already on the waitlist" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json(
    { message: "You're on the list!" },
    { status: 201 },
  );
}
