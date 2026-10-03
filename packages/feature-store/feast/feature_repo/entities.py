from feast import Entity, ValueType

player = Entity(name="player", value_type=ValueType.STRING, description="Player entity")
game = Entity(name="game", value_type=ValueType.STRING, description="Game entity")
