const fs = require("fs");

async function main() {

  const result = {
    updated: new Date().toISOString(),
    status: "test"
  };

  fs.writeFileSync(
    "data/primeleague.json",
    JSON.stringify(result, null, 2)
  );
}

main();