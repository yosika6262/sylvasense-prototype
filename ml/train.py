from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch.utils.data import DataLoader
from torchvision.models.detection import MaskRCNN_ResNet50_FPN_Weights, maskrcnn_resnet50_fpn

from dataset import ForestCrownDataset


def collate(batch):
    return tuple(zip(*batch))


def build_model(num_classes: int = 2):
    model = maskrcnn_resnet50_fpn(weights=MaskRCNN_ResNet50_FPN_Weights.DEFAULT)
    # Recreate only the prediction heads while retaining the pretrained backbone.
    from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
    from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
    mask_features = model.roi_heads.mask_predictor.conv5_mask.in_channels
    model.roi_heads.mask_predictor = MaskRCNNPredictor(mask_features, 256, num_classes)
    return model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", required=True)
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--output", default="ml/artifacts/maskrcnn_forest.pth")
    parser.add_argument("--batch-size", type=int, default=2)
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    dataset = ForestCrownDataset(Path(args.data_root) / "train")
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, collate_fn=collate, num_workers=0)
    model = build_model().to(device)
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=0.0002, weight_decay=0.0001)

    model.train()
    for epoch in range(args.epochs):
        running = 0.0
        for images, targets in loader:
            images = [image.to(device) for image in images]
            targets = [{key: value.to(device) for key, value in target.items()} for target in targets]
            losses = model(images, targets)
            loss = sum(losses.values())
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()
            running += float(loss.detach().cpu())
        print(f"epoch={epoch + 1}/{args.epochs} loss={running / max(len(loader), 1):.4f}")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model": model.state_dict(), "classes": ["background", "tree_crown"], "epochs": args.epochs}, output)
    print(f"saved={output}")


if __name__ == "__main__":
    main()
