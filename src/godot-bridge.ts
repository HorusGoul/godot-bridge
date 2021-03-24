import {
  GodotBridgeMessage,
  GodotBridgeMessageType,
  isGodotBridgeMessage,
} from './godot-bridge-messages';
import { EventEmitter } from 'eventemitter3';
import { uid } from 'uid';
import { boundClass } from 'autobind-decorator';

export interface RPCOptions {
  waitForReply?: boolean;
  timeoutMs?: number;
  closeOnTimeout?: boolean;
}

export const RPC_DEFAULT_TIMEOUT_MS = 10000;

interface CreateGodotBridgeOptions {
  name?: string;
  debug?: boolean;
}

export interface GodotBridgeEvents {
  message: (message: GodotBridgeMessage) => void;
}

interface GodotBridgeOptions {
  peer: RTCPeerConnection;
  dataChannel: RTCDataChannel;
}

@boundClass
export class GodotBridge extends EventEmitter<GodotBridgeEvents> {
  public internal: {
    peer: RTCPeerConnection;
    dataChannel: RTCDataChannel;
  };

  constructor({ peer, dataChannel }: GodotBridgeOptions) {
    super();

    this.internal = {
      peer,
      dataChannel,
    };
  }

  setup() {
    this.internal.dataChannel.addEventListener('message', this.onMessage);
  }

  teardown() {
    this.internal.dataChannel.removeEventListener('message', this.onMessage);
  }

  send<T extends GodotBridgeMessageType>(
    partial: Omit<GodotBridgeMessage<T>, 'id'>
  ) {
    const message: GodotBridgeMessage<T> = {
      ...partial,
      id: uid(),
    };

    this.internal.dataChannel.send(JSON.stringify(message));
  }

  reply<T extends GodotBridgeMessageType>(
    parent: GodotBridgeMessage | string,
    partial: Omit<GodotBridgeMessage<T>, 'id'>
  ) {
    this.send({
      ...partial,
      replyTo: isGodotBridgeMessage(parent) ? parent.replyTo : parent,
    });
  }

  waitForMessageOfType(type: GodotBridgeMessageType, options?: RPCOptions) {
    return this.waitForMessage(
      incomingMessage => incomingMessage.type === type,
      options
    );
  }

  waitForReply(message: GodotBridgeMessage, options?: RPCOptions) {
    return this.waitForMessage(
      incomingMessage => incomingMessage.replyTo === message.id,
      options
    );
  }

  waitForMessage(
    filter: (incomingMessage: GodotBridgeMessage) => boolean,
    {
      timeoutMs = RPC_DEFAULT_TIMEOUT_MS,
      closeOnTimeout = false,
    }: RPCOptions = {}
  ): Promise<GodotBridgeMessage> {
    return new Promise((resolve, reject) => {
      this.on('message', onMessage);

      if (closeOnTimeout) {
        setTimeout(() => {
          this.off('message', onMessage);
          reject('Timed out.');
        }, timeoutMs);
      }

      function onMessage(incomingMessage: GodotBridgeMessage) {
        if (filter(incomingMessage)) {
          resolve(incomingMessage);
        }
      }
    });
  }

  private onMessage(event: MessageEvent<unknown>) {
    const data = event.data;

    if (!isGodotBridgeMessage(data)) {
      return;
    }

    this.emit('message', data);
  }
}

export async function createGodotBridge({
  name = 'sendChannel',
}: CreateGodotBridgeOptions = {}) {
  const log = createLogger(`ℹ️ [${name}]`);
  const error = createLogger(`❌ [${name}]`);

  try {
    const peer = new RTCPeerConnection();
    const dataChannel = peer.createDataChannel(name, {
      negotiated: true,
      id: 1,
    });

    dataChannel.addEventListener('open', () => {
      log('DataChannel open');
    });

    dataChannel.addEventListener('close', () => {
      log('DataChannel closed');
    });

    const offer = await peer.createOffer();
    peer.setLocalDescription(offer);

    setOfferGlobals(offer, (type, sdp) =>
      peer.setRemoteDescription({
        type,
        sdp,
      })
    );

    const iceCandidates = await listenForIceCandidates(peer);

    if (!iceCandidates.length) {
      throw new Error(`No ICE candidates found.`);
    }

    setIceCandidateGlobals(
      iceCandidates[0],
      (candidate, sdpMid, sdpMLineIndex) => {
        peer.addIceCandidate(
          new RTCIceCandidate({
            candidate,
            sdpMid,
            sdpMLineIndex,
          })
        );
      }
    );

    return new GodotBridge({
      peer,
      dataChannel,
    });
  } catch (e) {
    error(e.message);
    throw new Error(`Couldn't connect with Godot. ${e.message}`);
  }
}

function setOfferGlobals(
  offer: RTCSessionDescriptionInit,
  setRemoteDescriptionCallback: typeof window['setWebrtcGameSdp']
) {
  window.webrtcGuiSdp = JSON.stringify(offer);
  window.setWebrtcGameSdp = setRemoteDescriptionCallback;
}

function listenForIceCandidates(
  peer: RTCPeerConnection,
  time = 100
): Promise<RTCIceCandidate[]> {
  return new Promise(resolve => {
    const candidates: RTCIceCandidate[] = [];

    peer.addEventListener('icecandidate', onIceCandidate);

    function onIceCandidate(event: RTCPeerConnectionIceEvent) {
      if (!event.candidate) {
        return;
      }

      candidates.push(event.candidate);
    }

    setTimeout(() => {
      if (!candidates.length) {
        return;
      }

      peer.removeEventListener('icecandidate', onIceCandidate);

      resolve(candidates);
    }, time);
  });
}

function setIceCandidateGlobals(
  iceCandidate: RTCIceCandidate,
  addIceCandidateCallback: typeof window['setWebrtcGameIceCandidate']
) {
  const { candidate, sdpMLineIndex, sdpMid } = iceCandidate;

  window.webrtcGuiIceCandidate = JSON.stringify({
    candidate,
    sdpMid,
    sdpMLineIndex,
  });

  window.setWebrtcGameIceCandidate = addIceCandidateCallback;
}

function createLogger(
  prefix: string,
  func: (...args: unknown[]) => void = console.log
) {
  return (...args: unknown[]) => func(prefix, ...args);
}
