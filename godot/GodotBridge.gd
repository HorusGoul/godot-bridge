extends Node

const GodotBridgeMessage = preload("./GodotBridgeMessage.gd")
const GodotBridgeFilter = preload("./GodotBridgeFilter.gd")

var default_rpc_options = {
	"timeout_ms": 10000,
	"close_on_timeout": false,
}

var peer = WebRTCPeerConnection.new()
var channel = peer.create_data_channel("sendChannel", { "negotiated": true, "id": 1 })
var remoteIceCandidate
var guiSdp
var guiIceCandidate

var _id_series := 0

# Signal that carries a `GodotBridgeMessage`
signal message;

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
  # Connect all functions
	peer.connect("ice_candidate_created", self, "_on_ice_candidate")
	peer.connect("session_description_created", self, "_on_session")
  
	var guiIceCandidateJson = JSON.parse(JavaScript.eval("window.webrtcGuiIceCandidate"))
	var guiSdpJson = JSON.parse(JavaScript.eval("window.webrtcGuiSdp"))
  
	guiSdp = guiSdpJson.result
	guiIceCandidate = guiIceCandidateJson.result
  
	peer.set_remote_description(
		guiSdp.type,
		guiSdp.sdp
	)


func _on_ice_candidate(mid, index, candidate) -> void:
	JavaScript.eval(
		"window.setWebrtcGameIceCandidate(`{candidate}`, `{mid}`, {index})".format({ "candidate": candidate, "mid": mid, "index": index })
	)
  
	peer.add_ice_candidate(
		guiIceCandidate.sdpMid,
		guiIceCandidate.sdpMLineIndex,
		guiIceCandidate.candidate
	)
  
func _on_session(type, sdp) -> void:
	JavaScript.eval(
		"window.setWebrtcGameSdp(`{type}`, `{sdp}`)".format({ "type": type, "sdp": sdp })
	)
  
	peer.set_local_description(type, sdp)
  
func _process(_delta) -> void:
	peer.poll()
  
	if channel.get_ready_state() == WebRTCDataChannel.STATE_OPEN:
		while channel.get_available_packet_count() > 0:
			_on_data(channel.get_packet().get_string_from_utf8())


func _on_data(data: String) -> void:
	var parsed_data: Dictionary = JSON.parse(data).result
	var message := GodotBridgeMessage.new(parsed_data)

	emit_signal("message", message)

func send(partial: GodotBridgeMessage) -> void:
	_id_series += 1

	partial.id = str(_id_series)

	var json = JSON.print(partial).to_utf8()

	channel.put_packet(json)

func reply(parent: GodotBridgeMessage, partial: GodotBridgeMessage) -> void:
	partial.replyTo = parent.id

	send(partial)

func wait_for_message_of_type(type: String, custom_options: Dictionary = {}) -> GDScriptFunctionState:
	var filter = GodotBridgeFilter.new(type)

	return yield(wait_for_message(funcref(filter, "type_filter"), custom_options), "completed")

func wait_for_reply(message: GodotBridgeMessage, custom_options: Dictionary = {}) -> GDScriptFunctionState:
	var filter = GodotBridgeFilter.new(message)

	return yield(wait_for_message(funcref(filter, "reply_filter"), custom_options), "completed")

func wait_for_message(filter: FuncRef, custom_options: Dictionary = {}) -> GDScriptFunctionState:
	var options = {}

	_merge_rpc_options(options, default_rpc_options)
	_merge_rpc_options(options, custom_options)

	var exit = false
	var force_exit_at = OS.get_system_time_msecs() + options.timeout_ms

	while !exit:
		var message = yield(self, "message")

		if filter.call_func(message):
			return message
	
		if force_exit_at <= OS.get_system_time_msecs():
			exit = true
  
	return "TIMEOUT"

func _merge_rpc_options(target, patch):
	for key in patch:
		target[key] = patch[key]
