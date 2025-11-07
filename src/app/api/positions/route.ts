import { Position } from "@/lib/types";
import { db } from "@/lib/db"; // 假设你有一个直接与数据库交互的模块

export async function POST(req: Request) {
  const position: Position = await req.json();

  try {
    // 直接调用数据库操作，而不是通过 Tauri 的 invoke
    await db.savePosition(position);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error saving position:", error);
    return new Response(JSON.stringify({ error: "Failed to save position" }), {
      status: 500,
    });
  }
}

export async function GET() {
  try {
    const positions = await getPositions();
    return NextResponse.json(positions);
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
