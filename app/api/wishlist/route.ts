import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ wishlist: [] });
  await connectDB();
  const user = await User.findById(session.user.id).select("wishlist").lean();
  return NextResponse.json({ wishlist: user?.wishlist?.map((id: any) => id.toString()) ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { productId } = await req.json();
  await connectDB();
  const user = await User.findById(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const idx = user.wishlist?.indexOf(productId) ?? -1;
  if (idx === -1) {
    user.wishlist = [...(user.wishlist ?? []), productId];
  } else {
    user.wishlist.splice(idx, 1);
  }
  await user.save();
  return NextResponse.json({ wishlist: user.wishlist.map((id: any) => id.toString()) });
}