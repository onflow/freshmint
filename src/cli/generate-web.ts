import * as fs from "fs-extra";
import * as path from "path";
import * as Handlebars from "handlebars";
import { writeFile } from "./helpers";

export default async function generateWebAssets(dir: string, name: string) {
  await fs.copy(path.resolve(__dirname, "templates/web"), dir);

  const packageJSON = await fs.readFile(
    path.resolve(__dirname, "templates/web/package.json"),
    "utf8"
  );

  const nextConfig = await fs.readFile(
    path.resolve(__dirname, "templates/web/next.config.js"),
    "utf8"
  );

  const replaceImportsScript = await fs.readFile(
    path.resolve(__dirname, "templates/web/src/flow/replace-imports.js"),
    "utf8"
  );

  const packageJSONTemplate = Handlebars.compile(packageJSON);
  const nextConfigTemplate = Handlebars.compile(nextConfig);
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
    path.resolve(dir, `src/flow/replace-imports.js`),
    replaceImportsScriptTemplate({ name })
  );
}
