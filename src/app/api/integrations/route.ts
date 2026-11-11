import { NextResponse } from "next/server";
import { api } from "@/lib/http";
import { listConnectorStatus } from "@/lib/integrations";

export const GET = api(async () => NextResponse.json({ connectors: await listConnectorStatus() }));
