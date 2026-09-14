from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import rasterio
import torch
from torchvision.models.detection import maskrcnn_resnet50_fpn

from train import build_model


def load_image(path: Path):
    with rasterio.open(path) as src:
        array = src.read(out_dtype="float32")[:3]
        metadata = {"crs": str(src.crs), "resolution_m": list(src.res), "bounds": list(src.bounds)}
    array = np.moveaxis(np.nan_to_num(array), 0, -1)
    array = np.clip(array, 0, np.percentile(array, 99.5) or 1)
    tensor = torch.from_numpy((array / max(array.max(), 1e-6)).transpose(2, 0, 1)).float()
    return tensor, metadata


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--score-threshold", type=float, default=0.70)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = build_model().to(device)
    checkpoint = torch.load(args.weights, map_location=device)
    model.load_state_dict(checkpoint["model"])
    model.eval()
    image, metadata = load_image(Path(args.image))
    with torch.inference_mode():
        prediction = model([image.to(device)])[0]

    keep = prediction["scores"].detach().cpu().numpy() >= args.score_threshold
    boxes = prediction["boxes"].detach().cpu().numpy()[keep].round(2).tolist()
    scores = prediction["scores"].detach().cpu().numpy()[keep].round(4).tolist()
    output = {
        "model": "Mask R-CNN ResNet-50 FPN",
        "weights": str(args.weights),
        "image": str(args.image),
        "score_threshold": args.score_threshold,
        "crown_count": len(scores),
        "mean_confidence": round(float(np.mean(scores)) if scores else 0.0, 4),
        "boxes_xyxy": boxes,
        "scores": scores,
        "raster": metadata,
    }
    Path(args.output).write_text(json.dumps(output, indent=2))
    print(json.dumps({"crown_count": len(scores), "mean_confidence": output["mean_confidence"], "output": args.output}))


if __name__ == "__main__":
    main()
