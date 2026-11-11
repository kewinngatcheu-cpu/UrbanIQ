import { NextResponse } from "next/server";
import { z } from "zod";
import { api, readJson } from "@/lib/http";
import { createTask, listTasks } from "@/lib/tasks";

export const GET = api(async (req) => {
  const p = z.object({
    workspace: z.string().max(64).optional(),
    status: z.enum(["open", "done", "all"]).optional(),
    goal: z.string().uuid().optional(),
    course: z.string().uuid().optional(),
  }).parse(Object.fromEntries(req.nextUrl.searchParams));
  return NextResponse.json({ tasks: await listTasks({ workspaceId: p.workspace, status: p.status, goalId: p.goal, courseId: p.course }) });
});

export const POST = api(async (req) => {
  const task = await createTask((await readJson(req)) as never, "owner");
  return NextResponse.json({ task }, { status: 201 });
});
