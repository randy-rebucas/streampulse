import { AccessToken } from "livekit-server-sdk";

export async function createViewerToken(
  roomName: string,
  identity: string,
  name: string
) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity,
      name,
      ttl: "6h",
    }
  );

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: false,
    canPublishData: true,
    canSubscribe: true,
  });

  return await token.toJwt();
}

export async function createStreamerToken(
  roomName: string,
  identity: string,
  name: string
) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity,
      name,
      ttl: "12h",
    }
  );

  token.addGrant({
    room: roomName,
    roomJoin: true,
    roomCreate: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    roomAdmin: true,
  });

  return await token.toJwt();
}
