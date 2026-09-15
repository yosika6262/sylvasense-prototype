# SylvaSense Forest Intelligence

SylvaSense is a web-based prototype for evidence-led forest monitoring. It combines remote-sensing indicators, tree-crown detection, biomass and carbon estimation, temporal change analysis, and a grounded generative AI assistant.

The system is designed around a strict separation between **evidence generation** and **evidence explanation**. Remote-sensing and computer-vision components produce measurable outputs. The generative AI assistant explains those outputs and their limitations. It does not independently estimate tree counts, biomass, carbon, or forest loss.

> **Current status:** The web interface and grounded AI workflow are implemented. The ten-area dashboard currently uses demonstration analysis snapshots. Real crown predictions require high-resolution RGB imagery and execution of the included detectree2 or Mask R-CNN inference pipeline.

## Capabilities

The current prototype provides the following capabilities:

| Capability | Description | Current implementation status |
|---|---|---|
| Forest-area selection | Select among ten predefined monitoring areas | Implemented |
| Analysis dashboard | Display NDVI, crown, biomass, carbon, and change indicators | Implemented with demonstration snapshots |
| Evidence layers | Toggle optical, SAR, crown, biomass, and change layers | Implemented as area-aware visual layers |
| Dynamic navigation | Overview, evidence layers, crown inventory, change watch, areas, exports, and methodology views | Implemented |
| Grounded AI assistant | Explain the selected area using a verified analysis snapshot | Implemented |
| JSON export | Download the selected area analysis snapshot | Implemented |
| NDVI processing foundation | Rasterio-based GeoTIFF inspection and NDVI calculation | Available in the project pipeline |
| Crown detection | detectree2 runner and custom Mask R-CNN training/inference scripts | Integration-ready; real area predictions not yet executed |
| Biomass estimation | AGB, carbon, and CO₂-equivalent fields | Demonstration baseline only |
| Change detection | Baseline/latest possible-change indicators | Demonstration signal; real temporal processing remains to be connected |

## System architecture

```text
React and TypeScript dashboard
            |
            v
Node.js, Express, and tRPC API
            |
            +--> Forest-area catalog
            +--> Analysis snapshot generation
            +--> Grounded AI assistant
            +--> Export procedures
            |
            v
Remote-sensing and machine-learning pipeline
            |
            +--> Sentinel-2 optical processing
            +--> Sentinel-1 SAR processing
            +--> High-resolution RGB crown detection
            +--> Biomass estimation
            +--> Temporal change detection
```

The current prototype uses a server-generated analysis snapshot as the contract between the scientific pipeline, the dashboard, exports, and the AI assistant.

## GenAI implementation

The AI assistant is exposed through the `analysis.askAssistant` tRPC procedure in `server/routers.ts`.

For each request, the backend:

1. Receives the selected forest-area identifier and user question.
2. Creates the corresponding analysis snapshot.
3. Supplies the snapshot to the language model as verified context.
4. Instructs the model to use only the supplied evidence.
5. Returns a natural-language explanation to the dashboard.

The assistant is instructed to distinguish between observations, estimates, possible change, and limitations. When the user changes the forest area, the frontend resets the conversation context and sends the new area identifier to the backend.

The assistant should be treated as an **evidence explanation layer**, not as the source of scientific measurements.

## Forest-area catalog

The prototype contains ten predefined areas:

| Identifier | Area | Region |
|---|---|---|
| `western-ghats` | Western Ghats pilot | India, Kerala |
| `amazon-manaus` | Amazon basin | Brazil, Amazonas |
| `congo-basin` | Congo basin | Democratic Republic of Congo |
| `borneo-heart` | Borneo Heart | Indonesia, Kalimantan |
| `new-guinea` | New Guinea highlands | Papua New Guinea, Morobe |
| `carpathians` | Carpathian forest | Romania, Maramures |
| `pacific-northwest` | Pacific Northwest | United States, Washington |
| `tasmania` | Tasmanian wilderness | Australia, Tasmania |
| `atlantic-forest` | Atlantic Forest | Brazil, Bahia |
| `sundarbans` | Sundarbans edge | Bangladesh, Khulna |

The current catalog is intended for demonstration and interface testing. It is not a substitute for real polygon ingestion and imagery acquisition.

## Remote-sensing indicators

### Optical data

The planned optical workflow uses Sentinel-2 imagery. The principal vegetation indicator is the Normalized Difference Vegetation Index (NDVI):

```text
NDVI = (NIR - Red) / (NIR + Red)
```

The optical layer is intended to support vegetation-condition analysis and temporal comparison.

### SAR data

The planned radar workflow uses Sentinel-1 imagery. VV and VH backscatter are intended to provide complementary information about canopy structure and surface conditions, including circumstances in which optical imagery is affected by cloud cover.

Sentinel-1 and Sentinel-2 are complementary. Neither dataset should be used alone as a complete description of forest condition.

### Spatial-resolution limitation

Sentinel-2 imagery is appropriate for area-level vegetation analysis. It is not sufficiently detailed for reliable individual tree-crown segmentation in dense forest. Crown detection requires high-resolution RGB imagery, such as UAV imagery or aerial orthomosaics.

## Tree-crown detection

The repository contains two model routes.

### Pretrained detectree2 baseline

The project includes a runner for the open detectree2 tropical random-resize Mask R-CNN checkpoint:

```text
ml/detectree2_infer.py
```

The runner expects a high-resolution RGB image and produces a GeoJSON prediction output.

```bash
python ml/detectree2_infer.py \\
  --checkpoint ml/artifacts/230103_randresize_full.pth \\
  --image path/to/high_resolution_rgb_tile.tif \\
  --output artifacts/detectree2_predictions.geojson
```

The checkpoint is available from Zenodo [1]. Its transferability to all SylvaSense areas is not assumed. Predictions require area-specific review and validation.

### Custom Mask R-CNN route

The custom model uses Torchvision Mask R-CNN with a ResNet-50 Feature Pyramid Network backbone. It has two classes:

```text
0: background
1: tree crown
```

Training is implemented in:

```text
ml/train.py
```

Inference is implemented in:

```text
ml/infer.py
```

The expected annotation structure is:

```text
ml/data/forest-crowns/
├── train/images/
├── train/annotations/
├── val/images/
├── val/annotations/
├── test/images/
└── test/annotations/
```

Training command:

```bash
python ml/train.py \\
  --data-root ml/data/forest-crowns \\
  --epochs 20 \\
  --batch-size 2 \\
  --output ml/artifacts/maskrcnn_forest.pth
```

Inference command:

```bash
python ml/infer.py \\
  --weights ml/artifacts/maskrcnn_forest.pth \\
  --image path/to/high_resolution_tile.tif \\
  --output artifacts/crowns.json \\
  --score-threshold 0.70
```

A production implementation should extend the custom inference output to serialize predicted masks as geospatial polygons and write a GeoJSON FeatureCollection.

## Biomass and carbon

The current dashboard contains aboveground biomass, carbon, and CO₂-equivalent fields for demonstration purposes. The prototype uses the following simplified relationships:

```text
Carbon = AGB × 0.47
CO₂e = Carbon × 44 / 12
```

These calculations are not field-validated carbon accounting and must not be used as carbon-credit measurements. A production biomass model requires field plots, calibration data, uncertainty estimates, and geographically separate evaluation data.

## Change monitoring

The change-monitoring interface compares a baseline period with a latest period and displays a possible-change signal. The correct interpretation is:

> The system identifies a possible vegetation or structural change that requires further review.

The signal should not be described as confirmed deforestation without image-quality checks, temporal alignment, cloud masking, independent review, and supporting evidence.

## Data status and limitations

The current ten-area dashboard values are demonstration snapshots. The following outputs have not yet been generated and validated for all ten areas:

- Real Sentinel-1 and Sentinel-2 analysis outputs.
- Real high-resolution RGB crown predictions.
- Real per-area crown GeoJSON files.
- Field-calibrated biomass estimates.
- Verified carbon measurements.
- Confirmed forest-loss classifications.

The per-area status is recorded in:

```text
ml/area_manifest.json
```

The next credible milestone is one complete real-data vertical slice:

```text
Forest polygon
→ real Sentinel-2 NDVI
→ real high-resolution RGB imagery
→ detectree2 prediction
→ crown GeoJSON
→ analysis snapshot
→ grounded AI explanation
```

## Local development

### Requirements

The web application requires:

- Node.js 22 or compatible recent Node.js release.
- pnpm.
- Python 3.11 or compatible Python release for the machine-learning pipeline.

### Install web dependencies

```bash
pnpm install
```

### Run the development server

```bash
pnpm dev
```

### Type-check the project

```bash
pnpm check
```

### Run tests

```bash
pnpm test -- --run
```

### Create a production build

```bash
pnpm build
```

The production build creates the frontend output under:

```text
dist/public
```

## Vercel deployment

For a frontend-only demonstration deployment on Vercel, use the following settings:

| Vercel setting | Value |
|---|---|
| Application preset | Vite |
| Root directory | `./` |
| Install command | `pnpm install` |
| Build command | `pnpm build` |
| Output directory | `dist/public` |

The current project also contains an Express and tRPC backend. A Vite-only Vercel deployment serves the frontend but does not automatically provide the complete backend runtime. For a fully operational GenAI deployment, deploy the backend as a separate Node.js service or adapt the server procedures to Vercel-compatible serverless functions.

Server-side API keys must not be exposed through frontend `VITE_` variables. Store language-model credentials only in the backend environment.

## Recommended production implementation sequence

1. Add explicit `demo` and `real` data modes to the analysis snapshot.
2. Select one small test polygon.
3. Connect a Sentinel-2 data provider and generate a real NDVI product.
4. Connect Sentinel-1 processing and record SAR metadata.
5. Obtain one high-resolution RGB forest tile.
6. Execute the detectree2 baseline.
7. Review the output and render real crown polygons.
8. Replace one demonstration crown count with a prediction artifact.
9. Add real baseline/latest change detection.
10. Train and validate a biomass model with field-linked data.
11. Move long-running processing to asynchronous jobs.
12. Expand the validated workflow to the remaining areas.

## Validation requirements

Before scientific use, evaluate crown detection using:

- Crown precision.
- Crown recall.
- F1 score.
- Mask Intersection over Union (IoU).
- Median crown-count error.

Evaluate biomass using:

- Mean absolute error.
- Root mean squared error.
- Coefficient of determination.
- Bias.
- Prediction uncertainty.

Evaluate change detection using:

- Registration quality.
- Cloud and no-data masking.
- Seasonal comparability.
- False-change rate.
- Independent review samples.

Training, validation, and test data should be separated geographically to avoid overestimating model performance.

## Repository structure

```text
client/                 React and TypeScript frontend
server/                 Express, tRPC, authentication, and backend procedures
shared/                 Shared application types and constants
drizzle/                Database schema and migrations
ml/                     Raster, crown-model, and prediction pipeline
  dataset.py            Crown annotation dataset adapter
  train.py              Custom Mask R-CNN training script
  infer.py              Custom Mask R-CNN inference script
  detectree2_infer.py   Pretrained detectree2 inference runner
  area_manifest.json    Per-area imagery and prediction readiness
```

## License and data responsibility

The project source code and any third-party model checkpoints, imagery, annotations, and derived products may have separate licensing conditions. Review the applicable license before redistribution or commercial use. Model outputs should be retained with their source imagery, model version, parameters, and processing metadata.

## References

[1]: https://zenodo.org/records/10522461 "detectree2 tropical random-resize Mask R-CNN checkpoint"
[2]: https://github.com/PatBall1/detectree2 "detectree2 source repository"
[3]: https://sentinel.esa.int/web/sentinel/missions/sentinel-2 "European Space Agency Sentinel-2 mission"
[4]: https://sentinel.esa.int/web/sentinel/missions/sentinel-1 "European Space Agency Sentinel-1 mission"
[5]: https://pytorch.org/vision/stable/models/mask_rcnn.html "Torchvision Mask R-CNN documentation"

## Project status

SylvaSense is a research and demonstration prototype. It provides a functional dashboard, dynamic area selection, grounded GenAI explanations, model runners, and a defined route to real remote-sensing and crown-detection outputs. It should not be presented as a field-validated forest inventory, biomass assessment, deforestation-detection service, or carbon-credit verification system until the real-data and validation phases are complete.

The intended progression is:

```text
Reliable data
→ reproducible processing
→ validated model outputs
→ auditable analysis snapshot
→ grounded AI explanation
```

This order is required to maintain scientific traceability and prevent synthetic demonstration values from being presented as measured observations.

## Author

SylvaSense project team.
