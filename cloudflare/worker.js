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


export default {

  async fetch(request, env) {

    const url = new URL(request.url);


    // CORS Preflight
    if (request.method === "OPTIONS") {

      return new Response(null, {
        headers: corsHeaders
      });

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