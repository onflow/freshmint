const fs = require("fs-extra");
const path = require("path");
const Handlebars = require("handlebars");
const { writeFile } = require("./file-helpers");

async function generateWebAssets(dir, name) {
  await fs.copy(path.resolve(__dirname, "templates/web"), dir);

  const packageJSON = await fs.readFile(
    path.resolve(__dirname, "templates/web/package.json"),
    "utf8"
  );

  const nextConfig = await fs.readFile(
    path.resolve(__dirname, "templates/web/next.config.js"),
    "utf8"
  );

  const fclConfig = await fs.readFile(
    path.resolve(__dirname, "templates/web/src/fcl.config.js"),
    "utf8"
  );

  const replaceImportsScript = await fs.readFile(
    path.resolve(__dirname, "templates/web/src/flow/replace-imports.js"),
    "utf8"
  );

  const packageJSONTemplate = Handlebars.compile(packageJSON);
  const nextConfigTemplate = Handlebars.compile(nextConfig);
  const fclConfigTemplate = Handlebars.compile(fclConfig);
  const replaceImportsScriptTemplate = Handlebars.compile(replaceImportsScript);

  await writeFile(
    path.resolve(dir, `package.json`),
    packageJSONTemplate({ dir })
  );

  await writeFile(
    path.resolve(dir, `next.config.js`),
    nextConfigTemplate({ name })
  );

  await writeFile(
    path.resolve(dir, `src/fcl.config.js`),
    fclConfigTemplate({ name })
  );

  await writeFile(
    path.resolve(dir, `src/flow/replace-imports.js`),
    replaceImportsScriptTemplate({ dir })
  );
}

module.exports = generateWebAssets;
