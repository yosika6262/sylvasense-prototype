from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision.transforms import functional as F


def polygon_to_mask(polygon: list[float], height: int, width: int) -> np.ndarray:
    from PIL import ImageDraw

    points = list(zip(polygon[::2], polygon[1::2]))
    image = Image.new("L", (width, height), 0)
    ImageDraw.Draw(image).polygon(points, outline=1, fill=1)
    return np.asarray(image, dtype=np.uint8)


class ForestCrownDataset(Dataset):
    """Reads RGB/false-color GeoTIFF tiles and polygon crown labels."""

    def __init__(self, root: str | Path, transforms: Any = None):
        self.root = Path(root)
        self.image_dir = self.root / "images"
        self.annotation_dir = self.root / "annotations"
        self.images = sorted(self.image_dir.glob("*.tif"))
        self.transforms = transforms
        if not self.images:
            raise FileNotFoundError(f"No .tif tiles found under {self.image_dir}")

    def __len__(self) -> int:
        return len(self.images)

    def __getitem__(self, index: int):
        image_path = self.images[index]
        with rasterio.open(image_path) as src:
            array = src.read(out_dtype="float32")
        array = np.nan_to_num(array, nan=0.0)
        array = array[:3] if array.shape[0] >= 3 else np.repeat(array[:1], 3, axis=0)
        array = np.moveaxis(array, 0, -1)
        array = np.clip(array, 0, np.percentile(array, 99.5) or 1)
        array = (array / max(array.max(), 1e-6) * 255).astype(np.uint8)
        image = F.to_tensor(Image.fromarray(array))

        annotation_path = self.annotation_dir / f"{image_path.stem}.json"
        data = json.loads(annotation_path.read_text())
        height, width = image.shape[-2:]
        masks, boxes = [], []
        for item in data.get("annotations", []):
            mask = polygon_to_mask(item["segmentation"][0], height, width)
            ys, xs = np.where(mask > 0)
            if len(xs) < 4:
                continue
            masks.append(mask)
            boxes.append([xs.min(), ys.min(), xs.max(), ys.max()])

        masks_tensor = torch.as_tensor(np.asarray(masks), dtype=torch.uint8) if masks else torch.zeros((0, height, width), dtype=torch.uint8)
        boxes_tensor = torch.as_tensor(boxes, dtype=torch.float32).reshape(-1, 4)
        target = {
            "boxes": boxes_tensor,
            "labels": torch.ones((len(boxes),), dtype=torch.int64),
            "masks": masks_tensor,
            "image_id": torch.tensor([index]),
            "area": (boxes_tensor[:, 3] - boxes_tensor[:, 1]) * (boxes_tensor[:, 2] - boxes_tensor[:, 0]),
            "iscrowd": torch.zeros((len(boxes),), dtype=torch.int64),
        }
        return image, target
