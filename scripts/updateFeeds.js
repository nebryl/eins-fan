import fs from "fs";

const CHANNELS = [
  "UC5QM2OXKyZaNw13iLbuEpCg",
  "UCeM9ckIXeJFvdt4bKpXvTqw",
  "UCMQkXTIDVvVDh0ZuVB_0APg",
  "UCeuKtCc2Q0ySUxYX8yRZhcg",
  "UCwqmvII0gjw4Hakc0igdelA"
];

// bestehende Datei laden
function loadExisting() {
  if (!fs.existsSync("./videos.json")) {
    return { channels: {} };
  }

  try {
    return JSON.parse(fs.readFileSync("./videos.json", "utf-8"));
  } catch {
    return { channels: {} };
  }
}

async function loadFeed(id) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;

  const res = await fetch(url);
  const xml = await res.text();

  const entries = [...xml.matchAll(/<entry>(.*?)<\/entry>/gs)];

  return entries.map(e => {
    const block = e[1];

    return {
      title: block.match(/<title>(.*?)<\/title>/)?.[1] || "",
      link: block.match(/<link[^>]+href="([^"]+)"/)?.[1] || "",
      pubDate: block.match(/<published>(.*?)<\/published>/)?.[1] || ""
    };
  });
}

(async () => {
  const existing = loadExisting();

  const output = {
    updated: new Date().toISOString(),
    channels: existing.channels || {}
  };

  for (const id of CHANNELS) {
    try {
      const oldVideos = output.channels[id] || [];
      const existingLinks = new Set(oldVideos.map(v => v.link));

      const newVideos = await loadFeed(id);

      // nur neue hinzufügen
      const merged = [
        ...oldVideos,
        ...newVideos.filter(v => !existingLinks.has(v.link))
      ];

      // sortieren (neu → alt)
      merged.sort(
        (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
      );

      // 🔥 LIMIT AUF 50
      output.channels[id] = merged.slice(0, 50);

      console.log(
        "OK",
        id,
        `+${output.channels[id].length - oldVideos.length} new`
      );

    } catch {
      console.log("FAIL", id);
    }
  }

  fs.writeFileSync(
    "./videos.json",
    JSON.stringify(output, null, 2)
  );
})();