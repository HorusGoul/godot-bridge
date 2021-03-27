// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GodotBridgeMessages {}

export type GodotBridgeMessageType = keyof GodotBridgeMessages;

export type GodotBridgeMessage<
  T extends GodotBridgeMessageType = GodotBridgeMessageType
> = {
  id: string;
  type: T;
  payload: GodotBridgeMessages[T];
  replyTo?: string;
};

export function isOfEngineType<Type extends GodotBridgeMessageType>(
  message: GodotBridgeMessage<GodotBridgeMessageType>,
  type: Type
): message is GodotBridgeMessage<Type> {
  return message.type === type;
}

export function isGodotBridgeMessage(
  message: unknown
): message is GodotBridgeMessage {
  if (typeof message !== "object") {
    return false;
  }

  if (typeof (message as any)?.type !== "string") {
    return false;
  }

  return true;
}
