import { CreatePositionRequest } from "@/lib/types";
import { NextResponse } from 'next/server';
import { db } from "@/lib/db";

// 这个 API 路由主要用于开发时测试，生产环境使用 Tauri 的 invoke API

export async function POST(req: Request) {
  const request: CreatePositionRequest = await req.json();

  try {
    const position = await db.savePosition(request);
    return NextResponse.json(position);
  } catch (error) {
    console.error("Error saving position:", error);
    return NextResponse.json(
      { error: "Failed to save position" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const positions = await db.getPositions();
    return NextResponse.json(positions);
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
