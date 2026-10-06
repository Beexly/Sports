import numpy as np

class Camera:
    """
    Broadcast camera model.
    Project 3D primitives to 2D image coordinates.
    Computes field homography matrix per frame.
    """
    def __init__(self, position, look_at_target, fov=60, width=1280, height=720):
        self.position = np.array(position, dtype=np.float32)
        self.target = np.array(look_at_target, dtype=np.float32)
        self.fov = fov
        self.width = width
        self.height = height

        # Intrinsics
        f = (self.height / 2.0) / np.tan(np.radians(self.fov / 2.0))
        self.K = np.array([
            [f, 0, self.width / 2.0],
            [0, f, self.height / 2.0],
            [0, 0, 1.0]
        ], dtype=np.float32)

        self.update_extrinsics()

    def update_extrinsics(self):
        """Update the extrinsic matrix based on current position and target."""
        # Forward vector
        forward = self.target - self.position
        norm = np.linalg.norm(forward)
        if norm > 1e-6:
            forward = forward / norm
        else:
            forward = np.array([0, 1, 0], dtype=np.float32)

        # Up vector (world up is Z, but we'll assume Y is up in 3D world for standard graphics,
        # or Z is up for football field. Let's use Z as up).
        world_up = np.array([0, 0, 1], dtype=np.float32)

        # Right vector
        right = np.cross(forward, world_up)
        norm = np.linalg.norm(right)
        if norm > 1e-6:
            right = right / norm
        else:
            # Look straight up or down
            right = np.array([1, 0, 0], dtype=np.float32)

        # True up vector
        up = np.cross(right, forward)

        # Rotation matrix (R)
        # OpenCV convention: z is forward, x is right, y is down.
        # But wait, standard lookAt: -forward is z.
        # Let's map world to OpenCV camera coords:
        # Camera X = right
        # Camera Y = -up (because y goes down in image)
        # Camera Z = forward
        R = np.zeros((3, 3), dtype=np.float32)
        R[0, :] = right
        R[1, :] = -up
        R[2, :] = forward

        # Translation vector (t)
        t = -R @ self.position

        # Extrinsics matrix [R | t]
        self.R = R
        self.t = t
        self.RT = np.hstack((self.R, self.t.reshape(3, 1)))

        # Projection matrix P = K [R | t]
        self.P = self.K @ self.RT

        # Field homography (Z=0 plane to image)
        # Points on field are (X, Y, 0, 1)^T
        # P * [X, Y, 0, 1]^T = P_col0 * X + P_col1 * Y + P_col3 * 1
        # H = [P_col0, P_col1, P_col3]
        self.H = np.zeros((3, 3), dtype=np.float32)
        self.H[:, 0] = self.P[:, 0]
        self.H[:, 1] = self.P[:, 1]
        self.H[:, 2] = self.P[:, 3]

    def project_points(self, points_3d):
        """
        Projects an array of 3D points (N, 3) to 2D image coordinates (N, 2).
        Returns only valid points (z > 0 in camera frame).
        """
        N = points_3d.shape[0]
        points_homo = np.hstack((points_3d, np.ones((N, 1), dtype=np.float32)))
        proj_points = (self.P @ points_homo.T).T  # (N, 3)

        # Avoid division by zero
        z = proj_points[:, 2]
        valid = z > 1e-6

        u = proj_points[valid, 0] / z[valid]
        v = proj_points[valid, 1] / z[valid]

        res = np.zeros((N, 2), dtype=np.float32)
        res[valid, 0] = u
        res[valid, 1] = v

        # For invalid points, set to some out-of-bounds value
        res[~valid, :] = -1000.0

        return res, valid
