import { $ } from "zx";
import chokidar from "chokidar";
import { basename } from "path";
import { existsSync, mkdirSync } from "fs";
import { copyFile, rm, readdir } from "fs/promises";
import "dotenv/config";

const { BUILD_ONLY, BUILD_SERVE, BUILD_WATCH } = process.env;
// Because default quoting does not work on windows cf https://github.com/google/zx/issues/298
$.quote = (s) => s;

const IS_SERVING = BUILD_SERVE === "true";
const IS_WATCHING = BUILD_WATCH === "true";

/**
 * Serve dist
 * */
async function serve() {
  if (IS_SERVING) {
    await $`browser-sync start --cors --no-open --no-ui --server dist --host 0.0.0.0 --port 8000 --files dist`;
  }
}

/**
 * Compiles HTML
 * */
async function staticFiles() {
  const copyFileAtPath = async (path) => {
    await $`cp -r "${path}" "dist/${basename(path)}"`
  };

  IS_SERVING || IS_WATCHING
    ? chokidar
        .watch("src/*.!(js,css)", { followSymlinks: false })
        .on("add", copyFileAtPath)
        .on("change", copyFileAtPath)
        .on("unlink", async (path) => {
          rm(`dist/${basename(path)}`);
        })
    : readdir("src/").then(async (filesNames) =>
        await Promise.all(filesNames
          .filter((fileName) => fileName.match(/.*(?!:css|js)$/))
          .map((fileName) => $`cp -r "src/${fileName}" "dist/${fileName}"`),
        ));
}

/**
 * Compiles CSS
 * */
async function css() {
  const buildFile = async (path) => {
    await $`esbuild ${path} --outfile="dist/${basename(path)}"`;
  }

  IS_SERVING || IS_WATCHING
    ? chokidar
    .watch("src/*.css", { followSymlinks: false })
    .on("add", buildFile)
    .on("change", buildFile)
    .on("unlink", async (path) => {
      rm(`dist/${basename(path)}`);
    })
    : await $`esbuild src/*.css --outdir=dist`
}

/**
 * Compiles JavaScript
 * */
async function javascript() {
  // Inject env variables 
  const injectedEnvs = Object.keys(process.env)
    .filter((key) => key.match(/^APP_/))
    .map((key) => `process.env.${key}=${JSON.stringify(process.env[key])}`);
  const serializedEnvs = injectedEnvs.map((env) => `--define:${JSON.stringify(env)}`);

  const buildFile = async (path) => {
    await $`esbuild ${path} --outfile="dist/${basename(path)}" ${serializedEnvs}`;
  }

  IS_SERVING || IS_WATCHING
    ? chokidar.watch("src/*.js", { followSymlinks: false })
    .on("add", buildFile)
    .on("change", buildFile)
    .on("unlink", async (path) => {
      rm(`dist/${basename(path)}`);
    })
    : await $`esbuild src/*.js --outdir=dist ${serializedEnvs}`;
}

/**
 * Initializes build
 * */
async function buildAll() {
  try {
    await Promise.all([serve(), staticFiles(), css(), javascript()]);
  } catch (err) {
    console.log(err);
  }
}

if (!existsSync("dist")) {
  mkdirSync("dist");
}

switch (BUILD_ONLY) {
  case "html":
    staticFiles();
    break;
  case "css":
    css();
    break;
  case "javascript":
    javascript();
    break;
  default:
    buildAll();
    break;
}
