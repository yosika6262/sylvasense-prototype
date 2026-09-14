import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const evidenceSnapshot = {
  project: "SylvaSense Western Ghats pilot",
  polygon: "Western Ghats test area",
  areaHa: 124.8,
  center: { lat: 11.105, lon: 76.405 },
  source: "Sentinel-2 L2A + Sentinel-1 GRD demonstration stack",
  opticalDate: "13 Dec 2025",
  baselineDate: "19 Dec 2024",
  resolutionM: 10,
  cloudCover: 0.26,
  validPixels: 97.05,
  ndviMean: 0.71,
  ndviChange: -0.08,
  sarVV: -10.8,
  sarVH: -16.4,
  treeCount: 184,
  crownConfidence: 0.82,
  crownDensity: 147.4,
  agb: 126.4,
  carbon: 59.4,
  co2e: 218.0,
  changeAreaHa: 6.7,
  changePercent: 5.4,
  changeConfidence: 0.76,
  risk: "moderate",
  warnings: [
    "Tree crowns are a deterministic demonstration layer and require high-resolution imagery for scientific enumeration.",
    "Biomass is a baseline estimate and is not a verified carbon-credit measurement.",
    "Possible change may include seasonal or phenological variation and needs independent review.",
  ],
  layerDescriptions: {
    optical: "NDVI composite from Sentinel-2 red and near-infrared bands",
    sar: "Sentinel-1 VV/VH backscatter structure proxy",
    crowns: "Prototype crown instances with confidence attributes",
    biomass: "AGB estimate derived from evidence features",
    change: "Temporal NDVI and structure difference signal",
  },
} as const;

function responseText(response: Awaited<ReturnType<typeof invokeLLM>>) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }
  return "I could not generate an explanation from the verified evidence.";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  analysis: router({
    snapshot: publicProcedure.query(() => evidenceSnapshot),
    askAssistant: publicProcedure
      .input(z.object({ question: z.string().min(2).max(600) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are SylvaSense Evidence Guide. Answer in plain, calm language using ONLY the verified analysis JSON supplied below. Never invent or recalculate a value. Label observations, estimates, and possible change clearly. Always mention a relevant limitation when discussing tree counts, biomass, carbon, or change. If the evidence does not answer the question, say so.\n\nVERIFIED ANALYSIS JSON:\n" +
                JSON.stringify(evidenceSnapshot),
            },
            { role: "user", content: input.question },
          ],
        });
        return { answer: responseText(response), groundedIn: ["analysis-snapshot"] };
      }),
  }),
});

export type AppRouter = typeof appRouter;
export type EvidenceSnapshot = typeof evidenceSnapshot;
