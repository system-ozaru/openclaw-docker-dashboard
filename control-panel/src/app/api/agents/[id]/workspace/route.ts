import { NextRequest, NextResponse } from "next/server";
import {
  listWorkspaceFiles,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "@/lib/workspaceService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filePath = request.nextUrl.searchParams.get("file");

    if (filePath) {
      const content = await readWorkspaceFile(id, filePath);
      return NextResponse.json({ file: filePath, content });
    }

    const files = await listWorkspaceFiles(id);
    return NextResponse.json({ files });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { file, content } = body as { file: string; content: string };

    if (!file || typeof content !== "string") {
      return NextResponse.json({ error: "file and content required" }, { status: 400 });
    }

    await writeWorkspaceFile(id, file, content);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
