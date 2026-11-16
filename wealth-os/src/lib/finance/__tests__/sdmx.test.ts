import { describe, expect, it } from "vitest";
import { parseSdmxCsv } from "../sdmx";

describe("EZB SDMX-CSV", () => {
  it("liest TIME_PERIOD/OBS_VALUE chronologisch", () => {
    const csv = `KEY,FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE,OBS_STATUS\nMIR.M.DE.B.A2C.P.R.A.2250.EUR.N,M,DE,2026-08,4.04,A\nMIR.M.DE.B.A2C.P.R.A.2250.EUR.N,M,DE,2026-07,3.92,A\nMIR.M.DE.B.A2C.P.R.A.2250.EUR.N,M,DE,2026-09,,A`;
    expect(parseSdmxCsv(csv)).toEqual([{ period: "2026-07", value: 3.92 }, { period: "2026-08", value: 4.04 }]);
  });
  it("ungültige Antwort → leer", () => {
    expect(parseSdmxCsv("<html>error</html>")).toEqual([]);
  });
});
