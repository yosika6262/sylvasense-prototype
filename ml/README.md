# SylvaSense Mask R-CNN crown model

This folder is the model track for **individual tree-crown instance segmentation**. It uses the torchvision Mask R-CNN implementation with a two-class label space:

- `0`: background
- `1`: tree crown

The model is intentionally separated from the WebDev server. The server consumes a compact JSON artifact produced by `infer.py`; it never invents crown counts.

## Data format

Prepare one folder per image tile:

```text
ml/data/forest-crowns/
  train/images/tile_001.tif
  train/annotations/tile_001.json
  val/images/tile_101.tif
  val/annotations/tile_101.json
```

Each annotation JSON contains a `width`, `height`, and `annotations` array. Each annotation has a `segmentation` polygon as pixel coordinates, for example:

```json
{"width": 1024, "height": 1024, "annotations": [{"segmentation": [[120,90,145,92,151,118,130,130,112,111]], "iscrowd": 0}]}
```

Use high-resolution aerial or drone imagery with field-reviewed crown polygons. Sentinel-2 at 10 m is suitable for vegetation signals, not individual crown labels.

## Install and train

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt
python ml/train.py --data-root ml/data/forest-crowns --epochs 20 --output ml/artifacts/maskrcnn_forest.pth
```

## Run inference

```bash
python ml/infer.py \
  --weights ml/artifacts/maskrcnn_forest.pth \
  --image path/to/high_resolution_tile.tif \
  --output artifacts/crowns.json \
  --score-threshold 0.70
```

The output contains one record per crown with its confidence, bounding box, binary mask polygon, and a count summary. Importantly, confidence and image provenance travel with the count.

## Scientific gate before production

Do not label the prototype as field-validated until the holdout set reports crown precision, recall, mask IoU, and count error. A good first acceptance gate is mask IoU ≥ 0.50, crown F1 ≥ 0.70, and median count error ≤ 15% on a geographically separate holdout area. These are project gates, not universal scientific standards.

## Open pretrained predictions

For an immediate pretrained baseline, use the open **detectree2 tropical random-resize Mask R-CNN** checkpoint:

```bash
wget -O ml/artifacts/230103_randresize_full.pth \
  https://zenodo.org/records/10522461/files/230103_randresize_full.pth
pip install -r ml/detectree2-requirements.txt
python ml/detectree2_infer.py \
  --checkpoint ml/artifacts/230103_randresize_full.pth \
  --image path/to/high_resolution_rgb_tile.tif \
  --output artifacts/detectree2_predictions.geojson
```

This checkpoint was trained on tropical forest sites and is the best open starting point for the forest-crown use case. It is **not** a guarantee of accuracy for all ten SylvaSense areas. Validate predictions on each area and fine-tune with local crown annotations before using counts for biomass or carbon decisions. The dashboard records the checkpoint as linked, but it will not claim that predictions were executed until this runner produces a GeoJSON output.
