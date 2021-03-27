extends Node2D

func _ready():
	GodotBridge.connect("message", self, "_on_message")

func _on_message(message: GodotBridgeMessage) -> void:
	if message.type == "set-color":
		$ColorRect.color = Color(message.payload)
