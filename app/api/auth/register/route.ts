import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string; email?: string; password?: string };
    const { name, email, password } = body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedName = name?.trim() || null;

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      if (!existing.password) {
        const hashed = await bcrypt.hash(password, 12);
        const updatedUser = await prisma.user.update({
          where: { id: existing.id },
          data: {
            password: hashed,
            ...(normalizedName && !existing.name ? { name: normalizedName } : {}),
          },
          select: { id: true, email: true, name: true },
        });

        return NextResponse.json({ user: updatedUser }, { status: 200 });
      }

      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: normalizedName, email: normalizedEmail, password: hashed },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
