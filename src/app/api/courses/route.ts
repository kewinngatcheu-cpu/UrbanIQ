import { NextResponse } from "next/server";
import { api, readJson } from "@/lib/http";
import { createCourse, listCourses, weightedGrade } from "@/lib/lifestyle";

export const GET = api(async () => {
  const courses = await listCourses();
  return NextResponse.json({ courses, grade: weightedGrade(courses) });
});

export const POST = api(async (req) => NextResponse.json(await createCourse((await readJson(req)) as never), { status: 201 }));
