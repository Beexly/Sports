import cv2
import numpy as np

class Renderer:
    """
    Renders the football field, players, and crowd using OpenCV.
    Handles weather and lighting variations.
    """
    def __init__(self, width=1280, height=720, rng=None):
        self.width = width
        self.height = height
        self.rng = rng or np.random.default_rng()

        # Field colors
        self.grass_color = (40, 150, 40)
        self.line_color = (255, 255, 255)

        # Determine lighting variations
        self.brightness = self.rng.uniform(0.5, 1.2)
        self.noise_std = self.rng.uniform(0, 10)

    def draw_field(self, img, camera):
        """Draws the green field and white yard lines."""
        # Fill with grass color
        img[:] = self.grass_color

        # Draw yard lines
        # Field is 120 yards long (0 to 120, including endzones), 53.3 yards wide
        for yard in range(0, 121, 5):
            line_3d = np.array([
                [yard, 0, 0],
                [yard, 53.3, 0]
            ], dtype=np.float32)

            pts_2d, valid = camera.project_points(line_3d)
            if np.all(valid):
                pt1 = (int(pts_2d[0, 0]), int(pts_2d[0, 1]))
                pt2 = (int(pts_2d[1, 0]), int(pts_2d[1, 1]))
                cv2.line(img, pt1, pt2, self.line_color, 2)

    def draw_crowd(self, img):
        """Draws random colored dots in the upper part of the image."""
        num_dots = 500
        xs = self.rng.integers(0, self.width, num_dots)
        ys = self.rng.integers(0, self.height // 3, num_dots)
        colors = self.rng.integers(0, 256, (num_dots, 3))

        for x, y, c in zip(xs, ys, colors):
            cv2.circle(img, (x, y), 2, c.tolist(), -1)

    def apply_weather_lighting(self, img):
        """Applies brightness and noise."""
        img = img.astype(np.float32) * self.brightness
        noise = self.rng.normal(0, self.noise_std, img.shape)
        img = np.clip(img + noise, 0, 255).astype(np.uint8)
        return img

    def get_3d_bbox(self, pos, width=0.8, depth=0.8, height=2.0):
        """Generates 8 corners of a 3D bounding box around a position."""
        x, y, z = pos
        w2, d2 = width / 2, depth / 2
        corners = np.array([
            [x - w2, y - d2, z],
            [x + w2, y - d2, z],
            [x + w2, y + d2, z],
            [x - w2, y + d2, z],
            [x - w2, y - d2, z + height],
            [x + w2, y - d2, z + height],
            [x + w2, y + d2, z + height],
            [x - w2, y + d2, z + height]
        ], dtype=np.float32)
        return corners

    def render(self, camera, play):
        """
        Renders a frame and computes 2D bounding boxes for COCO.
        Returns the image and a list of annotation dicts.
        """
        img = np.zeros((self.height, self.width, 3), dtype=np.uint8)

        # Draw background
        self.draw_field(img, camera)
        self.draw_crowd(img)

        annotations = []

        # Render players and officials
        for pos, track_id, label in zip(play.players, play.track_ids, play.labels):
            corners_3d = self.get_3d_bbox(pos)
            pts_2d, valid = camera.project_points(corners_3d)

            if np.any(valid):
                valid_pts = pts_2d[valid]
                x_min, y_min = np.min(valid_pts, axis=0)
                x_max, y_max = np.max(valid_pts, axis=0)

                # Clip to image bounds
                x_min = max(0, int(x_min))
                y_min = max(0, int(y_min))
                x_max = min(self.width, int(x_max))
                y_max = min(self.height, int(y_max))

                if x_max > x_min and y_max > y_min:
                    # Draw a simple rectangle on the image
                    color = (255, 0, 0) if label == 'offense' else (0, 0, 255) if label == 'defense' else (0, 0, 0)
                    cv2.rectangle(img, (x_min, y_min), (x_max, y_max), color, 2)

                    bbox = [x_min, y_min, x_max - x_min, y_max - y_min]
                    category_id = 1 if label == 'offense' else 2 if label == 'defense' else 3

                    annotations.append({
                        "category_id": category_id,
                        "bbox": bbox,
                        "track_id": track_id
                    })

        # Render ball
        ball_corners = self.get_3d_bbox(play.ball_pos, width=0.3, depth=0.3, height=0.3)
        pts_2d, valid = camera.project_points(ball_corners)
        if np.any(valid):
            valid_pts = pts_2d[valid]
            x_min, y_min = np.min(valid_pts, axis=0)
            x_max, y_max = np.max(valid_pts, axis=0)

            x_min = max(0, int(x_min))
            y_min = max(0, int(y_min))
            x_max = min(self.width, int(x_max))
            y_max = min(self.height, int(y_max))

            if x_max > x_min and y_max > y_min:
                cv2.rectangle(img, (x_min, y_min), (x_max, y_max), (0, 255, 255), -1)
                annotations.append({
                    "category_id": 4, # Ball
                    "bbox": [x_min, y_min, x_max - x_min, y_max - y_min],
                    "track_id": 0 # Special ID for ball
                })

        img = self.apply_weather_lighting(img)
        return img, annotations
