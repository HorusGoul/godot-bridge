class_name GodotBridgeMessage

# Unique identifier for each message, Godot use numbers when
# creating messages.
var id: String

# Type of the message, check out the `GodotBridgeMessageType` type in TypeScript
# to know which values can appear here.
var type: String

# ID of the parent message
# @optional
var replyTo: String

# Payload of the message, if there's any
var payload

func _init(partial: Dictionary = {}):
	for key in partial:
		self[key] = partial[key]
