import numpy as np

class PlaySynthesizer:
    """
    Simulation of players, ball, and officials.
    """
    def __init__(self, rng, start_x=50, start_y=26.6):
        self.rng = rng
        self.ball_pos = np.array([start_x, start_y, 0.0], dtype=np.float32)

        # 11 Offense, 11 Defense, 7 Officials
        self.players = []
        self.track_ids = []
        self.labels = [] # 'offense', 'defense', 'official', 'ball'

        # Setup initial positions
        self._setup_formation(start_x, start_y)
        self.velocities = np.zeros((len(self.players), 3), dtype=np.float32)

        # Set some initial movement directions
        for i, label in enumerate(self.labels):
            if label == 'offense':
                self.velocities[i, 0] = self.rng.uniform(1.0, 5.0)  # Move towards positive X
                self.velocities[i, 1] = self.rng.uniform(-2.0, 2.0)
            elif label == 'defense':
                self.velocities[i, 0] = self.rng.uniform(-5.0, -1.0) # Move towards negative X
                self.velocities[i, 1] = self.rng.uniform(-2.0, 2.0)
            elif label == 'official':
                self.velocities[i, 0] = self.rng.uniform(-1.0, 1.0)
                self.velocities[i, 1] = self.rng.uniform(-1.0, 1.0)

        self.ball_velocity = np.array([self.rng.uniform(5.0, 15.0), self.rng.uniform(-5.0, 5.0), self.rng.uniform(2.0, 8.0)], dtype=np.float32)

    def _setup_formation(self, los_x, los_y):
        track_id_counter = 1

        # Offense (Left side of LOS, x < los_x)
        # 5 Linemen
        for y_offset in [-2, -1, 0, 1, 2]:
            self.players.append([los_x - 0.5, los_y + y_offset, 0])
            self.track_ids.append(track_id_counter)
            self.labels.append('offense')
            track_id_counter += 1
        # QB
        self.players.append([los_x - 2, los_y, 0])
        self.track_ids.append(track_id_counter)
        self.labels.append('offense')
        track_id_counter += 1
        # RB
        self.players.append([los_x - 4, los_y, 0])
        self.track_ids.append(track_id_counter)
        self.labels.append('offense')
        track_id_counter += 1
        # WRs
        for y_offset in [-10, -5, 5, 10]:
            self.players.append([los_x - 0.5, los_y + y_offset, 0])
            self.track_ids.append(track_id_counter)
            self.labels.append('offense')
            track_id_counter += 1

        # Defense (Right side of LOS, x > los_x)
        # 4 DL
        for y_offset in [-1.5, -0.5, 0.5, 1.5]:
            self.players.append([los_x + 0.5, los_y + y_offset, 0])
            self.track_ids.append(track_id_counter)
            self.labels.append('defense')
            track_id_counter += 1
        # 3 LBs
        for y_offset in [-2, 0, 2]:
            self.players.append([los_x + 3, los_y + y_offset, 0])
            self.track_ids.append(track_id_counter)
            self.labels.append('defense')
            track_id_counter += 1
        # 4 DBs
        for y_offset in [-10, -5, 5, 10]:
            self.players.append([los_x + 5, los_y + y_offset, 0])
            self.track_ids.append(track_id_counter)
            self.labels.append('defense')
            track_id_counter += 1

        # Officials
        official_positions = [
            (los_x - 10, los_y - 20),
            (los_x - 10, los_y + 20),
            (los_x + 10, los_y - 20),
            (los_x + 10, los_y + 20),
            (los_x + 20, los_y - 5),
            (los_x + 20, los_y + 5),
            (los_x - 5, los_y),
        ]
        for ox, oy in official_positions:
            self.players.append([ox, oy, 0])
            self.track_ids.append(track_id_counter)
            self.labels.append('official')
            track_id_counter += 1

        self.players = np.array(self.players, dtype=np.float32)

    def step(self, dt=0.1):
        """Update positions based on velocities."""
        self.players += self.velocities * dt

        # Add some random noise to velocities to simulate non-linear movement
        noise = self.rng.normal(0, 0.5, self.velocities.shape)
        self.velocities += noise

        # Keep players on field (approximate bounds)
        self.players[:, 0] = np.clip(self.players[:, 0], 0, 120)
        self.players[:, 1] = np.clip(self.players[:, 1], 0, 53.3)

        # Ball movement (parabolic if passed)
        self.ball_pos += self.ball_velocity * dt
        self.ball_velocity[2] -= 9.8 * dt # Gravity

        # Bounce ball
        if self.ball_pos[2] < 0:
            self.ball_pos[2] = 0
            self.ball_velocity[2] = -0.5 * self.ball_velocity[2]
            self.ball_velocity[0] *= 0.8
            self.ball_velocity[1] *= 0.8
