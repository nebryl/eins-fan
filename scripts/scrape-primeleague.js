import fs from "fs";

fs.writeFileSync(
  "data/primeleague.json",
  JSON.stringify(
    {
      updated: new Date().toISOString(),
      status: "ok"
    },
    null,
    2
  )
);