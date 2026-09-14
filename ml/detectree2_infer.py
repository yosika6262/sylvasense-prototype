from __future__ import annotations

import argparse
import json
from pathlib import Path

CHECKPOINT_URL = "https://zenodo.org/records/10522461/files/230103_randresize_full.pth"


def main():
    parser = argparse.ArgumentParser(description="Run detectree2 pretrained Mask R-CNN crown delineation.")
    parser.add_argument("--image", required=True, help="High-resolution aerial/UAV RGB image or orthomosaic tile")
    parser.add_argument("--checkpoint", default="ml/artifacts/230103_randresize_full.pth")
    parser.add_argument("--output", default="artifacts/detectree2_predictions.geojson")
    parser.add_argument("--tile-size-m", type=int, default=100)
    args = parser.parse_args()

    try:
        import geopandas as gpd
        from detectree2.models.predict import predict_on_data
        from detectree2.models.train import setup_cfg
    except ImportError as error:
        raise SystemExit(
            "Install detectree2, detectron2, geopandas, rasterio, and their compatible PyTorch build first. "
            f"Missing dependency: {error}"
        ) from error

    checkpoint = Path(args.checkpoint)
    if not checkpoint.exists():
        raise SystemExit(
            f"Checkpoint not found: {checkpoint}\nDownload the open checkpoint from {CHECKPOINT_URL} "
            f"and save it as {checkpoint}."
        )

    # The package handles tiling, model configuration, and geospatial output.
    cfg = setup_cfg(update_model=str(checkpoint))
    predictions = predict_on_data(
        cfg,
        args.image,
        tile_width=args.tile_size_m,
        tile_height=args.tile_size_m,
    )
    result = predictions if isinstance(predictions, gpd.GeoDataFrame) else gpd.GeoDataFrame(predictions)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    result.to_file(output, driver="GeoJSON")
    summary = {"model": "detectree2 tropical random-resize Mask R-CNN", "checkpoint": str(checkpoint), "image": args.image, "crown_count": len(result), "output": str(output)}
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
