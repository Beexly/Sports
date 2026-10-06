import argparse
import json
import os
import cv2
import numpy as np

from .camera import Camera
from .play import PlaySynthesizer
from .renderer import Renderer

def main():
    parser = argparse.ArgumentParser(description="Synthetic football-scene generator")
    parser.add_argument("--num-frames", type=int, required=True, help="Number of frames to generate")
    parser.add_argument("--out", type=str, required=True, help="Output directory")
    parser.add_argument("--seed", type=int, required=True, help="Random seed for determinism")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    rng = np.random.default_rng(args.seed)

    width = 1280
    height = 720

    play = PlaySynthesizer(rng)
    renderer = Renderer(width=width, height=height, rng=rng)

    coco_data = {
        "images": [],
        "annotations": [],
        "categories": [
            {"id": 1, "name": "offense"},
            {"id": 2, "name": "defense"},
            {"id": 3, "name": "official"},
            {"id": 4, "name": "ball"}
        ]
    }

    ann_id = 1

    # Camera moves over time
    cam_pos = np.array([50, -30, 20], dtype=np.float32)

    for frame_idx in range(args.num_frames):
        # Update camera target to follow ball, with some lag/noise
        target = play.ball_pos.copy()
        target[0] += rng.uniform(-2, 2)
        target[1] += rng.uniform(-2, 2)

        # Slowly pan camera position
        cam_pos[0] += 0.5

        camera = Camera(position=cam_pos, look_at_target=target, width=width, height=height)

        img, annotations = renderer.render(camera, play)

        filename = f"frame_{frame_idx:04d}.jpg"
        filepath = os.path.join(args.out, filename)
        cv2.imwrite(filepath, img)

        image_info = {
            "id": frame_idx + 1,
            "file_name": filename,
            "width": width,
            "height": height,
            "camera": {
                "K": camera.K.tolist(),
                "R": camera.R.tolist(),
                "t": camera.t.tolist(),
                "H": camera.H.tolist()
            }
        }
        coco_data["images"].append(image_info)

        for ann in annotations:
            ann["id"] = ann_id
            ann["image_id"] = frame_idx + 1
            ann["iscrowd"] = 0
            ann["area"] = ann["bbox"][2] * ann["bbox"][3]
            coco_data["annotations"].append(ann)
            ann_id += 1

        play.step(dt=0.1)

    with open(os.path.join(args.out, "annotations.json"), "w") as f:
        json.dump(coco_data, f, indent=4)

if __name__ == "__main__":
    main()
