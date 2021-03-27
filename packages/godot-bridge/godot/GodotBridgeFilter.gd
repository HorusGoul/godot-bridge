class_name GodotBridgeFilter

var data

func _init(_data):
  data = _data

func reply_filter(message: GodotBridgeMessage) -> bool:
  return message.replyTo == data.replyTo

func type_filter(message: GodotBridgeMessage) -> bool:
  return message.type == data
