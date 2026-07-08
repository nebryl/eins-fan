import fs from "fs";

const CHANNEL_API =
  "https://einsflixworker.nebryl.workers.dev/api/channels";


// Kanäle aus Cloudflare D1 laden
async function loadChannels() {

  const res = await fetch(CHANNEL_API);

  if (!res.ok) {
    throw new Error(
      "Kanalliste konnte nicht geladen werden"
    );
  }

  return await res.json();

}


// bestehende Datei laden
function loadExisting() {

  if (!fs.existsSync("./videos.json")) {
    return { channels: {} };
  }

  try {

    return JSON.parse(
      fs.readFileSync("./videos.json", "utf-8")
    );

  } catch {

    return { channels: {} };

  }

}


async function loadFeed(id) {

  const url =
    `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;


  const res =
    await fetch(url);


  const xml =
    await res.text();


  const entries =
    [
      ...xml.matchAll(
        /<entry>(.*?)<\/entry>/gs
      )
    ];


  return entries.map(e => {

    const block = e[1];


    return {

      title:
        block.match(
          /<title>(.*?)<\/title>/
        )?.[1] || "",


      link:
        block.match(
          /<link[^>]+href="([^"]+)"/
        )?.[1] || "",


      pubDate:
        block.match(
          /<published>(.*?)<\/published>/
        )?.[1] || ""

    };

  });

}


(async () => {

  const channels =
    await loadChannels();


  console.log(
    "Geladene Kanäle:",
    channels.length
  );


  const existing =
    loadExisting();


  const output = {

    updated:
      new Date().toISOString(),

    channels:
      existing.channels || {}

  };


  for (const channel of channels) {


    const id =
      channel.channel_id;


    try {


      const oldVideos =
        output.channels[id] || [];


      const existingLinks =
        new Set(
          oldVideos.map(v => v.link)
        );


      const newVideos =
        await loadFeed(id);



      const merged = [

        ...oldVideos,

        ...newVideos.filter(
          v => !existingLinks.has(v.link)
        )

      ];



      merged.sort(
        (a, b) =>
          new Date(b.pubDate) -
          new Date(a.pubDate)
      );



      output.channels[id] =
        merged.slice(0, 50);



      console.log(
        "OK",
        channel.title,
        id,
        `Videos: ${output.channels[id].length}`
      );


    } catch(error) {


      console.log(
        "FAIL",
        channel.title,
        error.message
      );


    }

  }



  fs.writeFileSync(
    "./videos.json",
    JSON.stringify(output, null, 2)
  );


})();