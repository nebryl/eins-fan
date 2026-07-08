const CHANNELS = [
  "eintrachtspandau",
  "handofblood",
  "powerofevil"
];


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const CHANNEL_STORE = globalThis.__EINSFLIX_CHANNELS || (globalThis.__EINSFLIX_CHANNELS = []);

export default {

  async fetch(request, env) {

    const url = new URL(request.url);


    // CORS Preflight
    if (request.method === "OPTIONS") {

      return new Response(null, {
        headers: corsHeaders
      });

    }


    if (url.pathname === "/api/channels/resolve") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
      }

      try {
        const body = await request.json();
        const inputUrl = body?.url?.trim();

        if (!inputUrl) {
          return jsonResponse({ success: false, error: "Keine URL übergeben." }, 400);
        }

        const channelData = await resolveYouTubeChannel(inputUrl);

        return jsonResponse({
          success: true,
          channel_id: channelData.channelId,
          title: channelData.title
        });
      } catch (error) {
        console.error("Channel resolve error:", error);
        return jsonResponse({ success: false, error: error.message || "Kanal konnte nicht aufgelöst werden." }, 400);
      }
    }

    if (url.pathname === "/api/channels") {
      if (request.method === "GET") {
        const owner = url.searchParams.get("user")?.trim();
        const channels = owner
          ? CHANNEL_STORE.filter(channel => channel.requested_by === owner)
          : CHANNEL_STORE;
        return jsonResponse(channels);
      }

      if (request.method === "POST") {
        return jsonResponse({ success: false, error: "Use /api/channels/add for new entries." }, 400);
      }
    }

    if (url.pathname === "/api/channels/add") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
      }

      try {
        const body = await request.json();
        const title = body?.title?.trim() || "Neuer Kanal";
        const channelId = body?.channel_id?.trim();
        const requestedBy = body?.requested_by?.trim() || "anonymous";

        if (!channelId) {
          return jsonResponse({ success: false, error: "Keine Channel ID übergeben." }, 400);
        }

        const exists = CHANNEL_STORE.some(channel => channel.channel_id === channelId);
        if (!exists) {
          CHANNEL_STORE.push({
            title,
            channel_id: channelId,
            requested_by: requestedBy
          });
        }

        return jsonResponse({ success: true, channel_id: channelId });
      } catch (error) {
        console.error("Channel add error:", error);
        return jsonResponse({ success: false, error: error.message || "Kanal konnte nicht gespeichert werden." }, 400);
      }
    }

    if (url.pathname === "/api/channels/delete") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
      }

      try {
        const body = await request.json();
        const channelId = body?.channel_id?.trim();
        const requestedBy = body?.requested_by?.trim() || "anonymous";

        if (!channelId) {
          return jsonResponse({ success: false, error: "Keine Channel ID übergeben." }, 400);
        }

        const channel = CHANNEL_STORE.find(item => item.channel_id === channelId);
        if (!channel) {
          return jsonResponse({ success: false, error: "Kanal nicht gefunden." }, 404);
        }

        if (channel.requested_by && channel.requested_by !== requestedBy) {
          return jsonResponse({ success: false, error: "Löschen nicht erlaubt." }, 403);
        }

        const index = CHANNEL_STORE.findIndex(item => item.channel_id === channelId);
        if (index >= 0) {
          CHANNEL_STORE.splice(index, 1);
        }

        return jsonResponse({ success: true });
      } catch (error) {
        console.error("Channel delete error:", error);
        return jsonResponse({ success: false, error: error.message || "Kanal konnte nicht gelöscht werden." }, 400);
      }
    }

    if (
      url.pathname === "/api/twitch/channels"
    ) {

      try {

        const token = await getToken(env);


        const users = await twitchFetch(
          `https://api.twitch.tv/helix/users?login=${CHANNELS.join("&login=")}`,
          token,
          env
        );


        const streams = await twitchFetch(
          `https://api.twitch.tv/helix/streams?user_login=${CHANNELS.join("&user_login=")}`,
          token,
          env
        );


        const streamMap = new Map(
          (streams.data || []).map(stream => [
            stream.user_login,
            stream
          ])
        );


        const result = (users.data || []).map(user => {

          const live =
            streamMap.get(user.login);


          return {

            id: user.id,

            login: user.login,

            name: user.display_name,

            live: Boolean(live),

            viewers:
              live?.viewer_count || 0,

            title:
              live?.title || "",

            game:
              live?.game_name || "",

            thumbnail:
              live?.thumbnail_url
                ?.replace("{width}", "640")
                ?.replace("{height}", "360")
                || ""

          };

        });


        return jsonResponse(result);


      } catch(error) {


        console.error(
          "Twitch Worker Fehler:",
          error
        );


        return jsonResponse(
          {
            error: "Twitch API Fehler",
            message: error.message
          },
          500
        );


      }

    }


    return new Response(
      "OK",
      {
        headers: corsHeaders
      }
    );


  }

};



// =====================
// Twitch Token
// =====================

async function getToken(env) {


  // Cache prüfen
  const cache =
    caches.default;


  const cacheKey =
    new Request(
      "https://token.local/twitch"
    );


  const cached =
    await cache.match(cacheKey);


  if (cached) {

    const data =
      await cached.json();

    return data.access_token;

  }



  const res =
    await fetch(
      "https://id.twitch.tv/oauth2/token",
      {

        method:"POST",

        headers:{
          "Content-Type":
          "application/x-www-form-urlencoded"
        },

        body:
          new URLSearchParams({

            client_id:
              env.TWITCH_CLIENT_ID,

            client_secret:
              env.TWITCH_CLIENT_SECRET,

            grant_type:
              "client_credentials"

          })

      }
    );



  if (!res.ok) {

    throw new Error(
      "Token konnte nicht erstellt werden"
    );

  }



  const data =
    await res.json();



  await cache.put(
    cacheKey,
    new Response(
      JSON.stringify(data),
      {
        headers:{
          "Content-Type":
          "application/json",

          // ungefähr Token-Lebensdauer
          "Cache-Control":
          "max-age=3600"
        }
      }
    )
  );


  return data.access_token;

}



// =====================
// Twitch API Request
// =====================

async function twitchFetch(
  url,
  token,
  env
) {


  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      8000
    );



  try {


    const res =
      await fetch(
        url,
        {

          headers:{

            "Client-ID":
              env.TWITCH_CLIENT_ID,

            "Authorization":
              `Bearer ${token}`

          },

          signal:
            controller.signal

        }
      );



    if (!res.ok) {

      throw new Error(
        `Twitch API Fehler ${res.status}`
      );

    }



    return await res.json();



  } finally {

    clearTimeout(timeout);

  }

}



// =====================
// JSON Response Helper
// =====================

async function resolveYouTubeChannel(inputUrl) {
  const url = new URL(inputUrl);
  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname === "youtu.be") {
    const id = url.pathname.replace(/^\//, "");
    if (!id) {
      throw new Error("Ungültige YouTube URL.");
    }
    return { channelId: id, title: "YouTube Kanal" };
  }

  if (hostname === "youtube.com" || hostname === "m.youtube.com") {
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts[0] === "channel" && pathParts[1]) {
      return { channelId: pathParts[1], title: "YouTube Kanal" };
    }

    if (pathParts[0] === "user" && pathParts[1]) {
      const response = await fetch(`https://www.youtube.com/${pathParts[0]}/${pathParts[1]}`);
      const text = await response.text();
      const match = text.match(/"channelId":"([A-Za-z0-9_-]+)"/);
      if (match?.[1]) {
        return { channelId: match[1], title: "YouTube Kanal" };
      }
    }

    if (pathParts[0] === "@" && pathParts[1]) {
      const response = await fetch(`https://www.youtube.com/${pathParts[0]}${pathParts[1]}`);
      const text = await response.text();
      const match = text.match(/"channelId":"([A-Za-z0-9_-]+)"/);
      if (match?.[1]) {
        return { channelId: match[1], title: "YouTube Kanal" };
      }
    }
  }

  throw new Error("Die URL konnte nicht als YouTube Kanal erkannt werden.");
}

function jsonResponse(
  data,
  status = 200
) {


  return new Response(
    JSON.stringify(data),
    {

      status,

      headers:{

        ...corsHeaders,

        "Content-Type":
          "application/json"

      }

    }
  );

}