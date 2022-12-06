// The current Freshmint version tag.
//
// This value is injected by tsup/esbuild at build time
// using this plugin: https://github.com/favware/esbuild-plugin-version-injector
//
// It needs to be explicitly typed as `string` so it is not
// delcared as a constant string in the type declaration file, e.g.:
//
//   declare const version = "[VI]{{inject}}[/VI]";
//
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const version: string = '[VI]{{inject}}[/VI]';
