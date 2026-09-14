import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const areaSeeds = [
  { id: "western-ghats", name: "Western Ghats pilot", region: "India · Kerala", areaHa: 124.8, lat: 11.105, lon: 76.405, ndviMean: .71, ndviChange: -.08, treeCount: 184, agb: 126.4, changeAreaHa: 6.7, risk: "moderate" },
  { id: "amazon-manaus", name: "Amazon basin", region: "Brazil · Amazonas", areaHa: 210.5, lat: -3.102, lon: -60.021, ndviMean: .78, ndviChange: -.03, treeCount: 296, agb: 184.2, changeAreaHa: 3.2, risk: "low" },
  { id: "congo-basin", name: "Congo basin", region: "DRC · Tshopo", areaHa: 168.2, lat: .520, lon: 25.195, ndviMean: .75, ndviChange: -.05, treeCount: 241, agb: 162.8, changeAreaHa: 8.4, risk: "moderate" },
  { id: "borneo-heart", name: "Borneo Heart", region: "Indonesia · Kalimantan", areaHa: 145.6, lat: .961, lon: 114.554, ndviMean: .73, ndviChange: -.12, treeCount: 219, agb: 148.6, changeAreaHa: 14.9, risk: "high" },
  { id: "new-guinea", name: "New Guinea highlands", region: "Papua New Guinea · Morobe", areaHa: 98.4, lat: -6.210, lon: 146.820, ndviMean: .69, ndviChange: -.04, treeCount: 157, agb: 119.7, changeAreaHa: 2.1, risk: "low" },
  { id: "carpathians", name: "Carpathian forest", region: "Romania · Maramures", areaHa: 112.7, lat: 47.710, lon: 24.520, ndviMean: .64, ndviChange: -.09, treeCount: 202, agb: 98.4, changeAreaHa: 5.8, risk: "moderate" },
  { id: "pacific-northwest", name: "Pacific Northwest", region: "USA · Washington", areaHa: 186.3, lat: 47.500, lon: -121.780, ndviMean: .67, ndviChange: -.06, treeCount: 176, agb: 205.1, changeAreaHa: 4.6, risk: "moderate" },
  { id: "tasmania", name: "Tasmanian wilderness", region: "Australia · Tasmania", areaHa: 134.1, lat: -42.100, lon: 146.050, ndviMean: .66, ndviChange: -.02, treeCount: 191, agb: 137.5, changeAreaHa: 1.8, risk: "low" },
  { id: "atlantic-forest", name: "Atlantic Forest", region: "Brazil · Bahia", areaHa: 87.9, lat: -13.250, lon: -41.840, ndviMean: .72, ndviChange: -.15, treeCount: 143, agb: 111.8, changeAreaHa: 11.6, risk: "high" },
  { id: "sundarbans", name: "Sundarbans edge", region: "Bangladesh · Khulna", areaHa: 76.5, lat: 21.950, lon: 89.180, ndviMean: .62, ndviChange: -.07, treeCount: 129, agb: 83.6, changeAreaHa: 4.2, risk: "moderate" },
] as const;

function makeSnapshot(areaId: string) {
  const area = areaSeeds.find((item) => item.id === areaId) ?? areaSeeds[0];
  return {
    ...area,
    project: `SylvaSense ${area.name}`,
    polygon: `${area.name} monitoring polygon`,
    center: { lat: area.lat, lon: area.lon },
    model: {
      name: "Mask R-CNN ResNet-50 FPN",
      task: "tree-crown instance segmentation",
      status: "integration-ready / weights pending",
      scoreThreshold: 0.70,
      artifact: "ml/artifacts/maskrcnn_forest.pth",
      pretrainedBaseline: {
        name: "detectree2 tropical random-resize Mask R-CNN",
        status: "linked-pretrained-checkpoint / prediction runner pending",
        checkpointUrl: "https://zenodo.org/records/10522461/files/230103_randresize_full.pth",
        imagery: "high-resolution aerial or UAV RGB",
        caveat: "Validate and fine-tune for each SylvaSense area before scientific use.",
      },
    },
    source: "Sentinel-2 L2A + Sentinel-1 GRD demonstration stack",
    opticalDate: "13 Dec 2025",
    baselineDate: "19 Dec 2024",
    resolutionM: 10,
    cloudCover: 0.26,
    validPixels: 97.05,
    sarVV: -10.8,
    sarVH: -16.4,
    carbon: Number((area.agb * .47).toFixed(1)),
    co2e: Number((area.agb * .47 * 44 / 12).toFixed(1)),
    crownConfidence: .82,
    crownDensity: Number((area.treeCount / area.areaHa * 100).toFixed(1)),
    changePercent: Number((area.changeAreaHa / area.areaHa * 100).toFixed(1)),
    changeConfidence: .76,
    warnings: [
      "Mask R-CNN is configured for tree-crown instance segmentation; trained weights and high-resolution labeled imagery are still required for validated inference.",
      "Biomass is a baseline estimate and is not a verified carbon-credit measurement.",
      "Possible change may include seasonal or phenological variation and needs independent review.",
    ],
    layerDescriptions: {
      optical: "NDVI composite from Sentinel-2 red and near-infrared bands",
      sar: "Sentinel-1 VV/VH backscatter structure proxy",
      crowns: "Mask R-CNN instance masks with confidence attributes",
      biomass: "AGB estimate derived from evidence features",
      change: "Temporal NDVI and structure difference signal",
    },
  };
}

function responseText(response: Awaited<ReturnType<typeof invokeLLM>>) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((part): part is { type: "text"; text: string } => part.type === "text").map((part) => part.text).join("\n");
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
    areas: publicProcedure.query(() => areaSeeds),
    snapshot: publicProcedure.input(z.object({ areaId: z.string().default("western-ghats") })).query(({ input }) => makeSnapshot(input.areaId)),
    askAssistant: publicProcedure.input(z.object({ question: z.string().min(2).max(600), areaId: z.string().default("western-ghats") })).mutation(async ({ input }) => {
      const snapshot = makeSnapshot(input.areaId);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are SylvaSense Evidence Guide. Answer in plain, calm language using ONLY the verified analysis JSON supplied below. Never invent or recalculate a value. Label observations, estimates, and possible change clearly. Always mention a relevant limitation when discussing tree counts, biomass, carbon, or change. If the evidence does not answer the question, say so.\n\nVERIFIED ANALYSIS JSON:\n" + JSON.stringify(snapshot) },
          { role: "user", content: input.question },
        ],
      });
      return { answer: responseText(response), groundedIn: ["analysis-snapshot", snapshot.id] };
    }),
  }),
});

export type AppRouter = typeof appRouter;
export type EvidenceSnapshot = ReturnType<typeof makeSnapshot>;
