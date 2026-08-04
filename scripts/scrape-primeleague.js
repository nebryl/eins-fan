import fs from "fs";

fs.writeFileSync(
  "primeleague.json",
  JSON.stringify(
    {
      updated: new Date().toISOString(),
      status: "ok"
    },
    null,
    2
  )
);