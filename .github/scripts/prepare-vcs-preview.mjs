import fs from "node:fs";

const configPath = "src-tauri/tauri.conf.json";
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
config.productName = "DBX VCS Preview";
config.identifier = "io.github.code-new-bie.dbx-vcs-preview";
config.mainBinaryName = "dbx-vcs-preview";
config.app.windows[0].title = "DBX VCS Preview";
config.bundle.targets = ["nsis"];
config.bundle.createUpdaterArtifacts = false;
config.bundle.fileAssociations = [];
delete config.bundle.windows.nsis.template;
config.plugins["deep-link"].desktop.schemes = ["dbx-vcs-preview"];
config.plugins.updater.endpoints = [];
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

// The application also has native update commands independent of Tauri's
// configured endpoint list. Disable them only in this unsigned preview build.
const updatePath = "src-tauri/src/commands/update.rs";
let source = fs.readFileSync(updatePath, "utf8");
const guards = [
  ["pub async fn check_for_updates(", "return Err(\"Automatic updates are disabled in DBX VCS Preview.\".into());"],
  ["pub async fn download_update(", "return Err(\"Automatic updates are disabled in DBX VCS Preview.\".into());"],
  ["pub fn install_downloaded_update(", "return Err(\"Automatic updates are disabled in DBX VCS Preview.\".into());"],
  ["pub fn get_downloaded_update(", "return Ok(None);"],
];
for (const [name, guard] of guards) {
  const start = source.indexOf(name);
  if (start < 0) throw new Error("Missing update entry point: " + name);
  const body = source.indexOf(" {", start);
  if (body < 0 || body - start > 1000) throw new Error("Cannot locate update entry point body: " + name);
  const pos = body + 2;
  source = source.slice(0, pos) + "\n    if option_env!(\"DBX_VCS_PREVIEW\").is_some() { " + guard + " }" + source.slice(pos);
}
fs.writeFileSync(updatePath, source);
console.log("Prepared isolated unsigned DBX VCS Preview configuration.");
