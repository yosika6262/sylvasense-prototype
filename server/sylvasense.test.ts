import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("analysis.snapshot", () => {
  it("returns a reproducible evidence snapshot with provenance and limitations", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const snapshot = await caller.analysis.snapshot();

    expect(snapshot.project).toContain("Western Ghats");
    expect(snapshot.areaHa).toBeGreaterThan(0);
    expect(snapshot.resolutionM).toBe(10);
    expect(snapshot.cloudCover).toBeLessThan(1);
    expect(snapshot.validPixels).toBeGreaterThan(95);
    expect(snapshot.treeCount).toBe(184);
    expect(snapshot.layerDescriptions.optical).toContain("Sentinel-2");
    expect(snapshot.warnings).toHaveLength(3);
    expect(snapshot.warnings.join(" ")).toContain("not a verified carbon-credit measurement");
  });
});
