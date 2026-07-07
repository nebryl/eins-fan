const CHANNELS = [
 "eintrachtspandau",
 "handofblood",
 "powerofevil"
];


export default {

async fetch(request, env) {


const url = new URL(request.url);


if(
 url.pathname === "/api/twitch/channels"
){

const token =
await getToken(env);


const users =
await twitchFetch(
`https://api.twitch.tv/helix/users?login=${CHANNELS.join("&login=")}`,
token,
env
);


const streams =
await twitchFetch(
`https://api.twitch.tv/helix/streams?user_login=${CHANNELS.join("&user_login=")}`,
token,
env
);


const streamMap =
new Map(
streams.data.map(
x=>[
x.user_login,
x
]
)
);


return Response.json(
users.data.map(user=>{


const live =
streamMap.get(
user.login
);


return {

id:user.id,

login:user.login,

name:user.display_name,

live:!!live,

viewers:
live?.viewer_count || 0,

title:
live?.title || "",

game:
live?.game_name || "",

thumbnail:
live?.thumbnail_url
?.replace("{width}","640")
?.replace("{height}","360")

};


})
);


}


return new Response(
"OK"
);


}

};


async function getToken(env){


const res =
await fetch(
"https://id.twitch.tv/oauth2/token",
{

method:"POST",

headers:{
"Content-Type":
"application/x-www-form-urlencoded"
},

body:new URLSearchParams({

client_id:
env.TWITCH_CLIENT_ID,

client_secret:
env.TWITCH_CLIENT_SECRET,

grant_type:
"client_credentials"

})

});


const data =
await res.json();


return data.access_token;

}



async function twitchFetch(
url,
token,
env
){


const res =
await fetch(
url,
{

headers:{

"Client-ID":
env.TWITCH_CLIENT_ID,

Authorization:
`Bearer ${token}`

}

});


return await res.json();

}