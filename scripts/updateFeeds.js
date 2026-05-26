import fs from "fs";

const CHANNELS = [
  "UC5QM2OXKyZaNw13iLbuEpCg",
  "UCeM9ckIXeJFvdt4bKpXvTqw",
  "UCMQkXTIDVvVDh0ZuVB_0APg",
  "UCeuKtCc2Q0ySUxYX8yRZhcg",
  "UCwqmvII0gjw4Hakc0igdelA"
];

async function loadFeed(id) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

  const res = await fetch(url);
  const xml = await res.text();

  const entries = [...xml.matchAll(/<entry>(.*?)<\/entry>/gs)];

  return entries.map(e => {
    const block = e[1];

    return {
      title: block.match(/<title>(.*?)<\/title>/)?.[1] || "",
      link: block.match(/href="([^"]+)"/)?.[1] || "",
      pubDate: block.match(/<published>(.*?)<\/published>/)?.[1] || ""
    };
  });
}

(async () => {
  const output = {
    updated: new Date().toISOString(),
    channels: {}
  };

  for (const id of CHANNELS) {
    try {
      output.channels[id] = await loadFeed(id);
      console.log("OK", id);
    } catch {
      console.log("FAIL", id);
    }
  }

  fs.writeFileSync("./videos.json", JSON.stringify(output, null, 2));
})();