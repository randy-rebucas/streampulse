import { AccessToken, EgressClient, StreamOutput, StreamProtocol } from "livekit-server-sdk";

function getLivekitHost() {
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL ?? "";
  return wsUrl.replace(/^wss?:\/\//, "");
}

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

/** Guest co-streamer — can publish audio/video but cannot manage the room */
export async function createGuestStreamerToken(
  roomName: string,
  identity: string,
  name: string
) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity, name, ttl: "6h" }
  );

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  return await token.toJwt();
}

export async function startYouTubeEgress(roomName: string, youtubeStreamKey: string) {
  const client = new EgressClient(
    `https://${getLivekitHost()}`,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );

  const streamOutput = new StreamOutput({
    protocol: StreamProtocol.RTMP,
    urls: [`rtmp://a.rtmp.youtube.com/live2/${youtubeStreamKey}`],
  });

  const info = await client.startRoomCompositeEgress(roomName, streamOutput);
  return info.egressId;
}

export async function stopEgress(egressId: string) {
  const client = new EgressClient(
    `https://${getLivekitHost()}`,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );
  await client.stopEgress(egressId);
}
