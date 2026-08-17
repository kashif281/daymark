import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import webPush from "web-push";

const envPath = new URL("../.env", import.meta.url);
let env = await readFile(envPath, "utf8");
const keys = webPush.generateVAPIDKeys();

env = setVariable(env, "NEXT_PUBLIC_VAPID_PUBLIC_KEY", keys.publicKey);
env = setVariable(env, "VAPID_PRIVATE_KEY", keys.privateKey);
env = setVariable(env, "VAPID_SUBJECT", "mailto:developer@localhost");
if (!/^CRON_SECRET=(?!["']?(?:long-random-secret)?["']?$).+/m.test(env)) {
  env = setVariable(env, "CRON_SECRET", randomBytes(32).toString("hex"));
}
if (!/^APP_URL=.+/m.test(env)) {
  env = setVariable(env, "APP_URL", "http://localhost:3000");
}
await writeFile(envPath, env);

console.log("Generated VAPID keys and saved them to .env.");

function setVariable(contents, name, value) {
  const line = `${name}="${value}"`;
  const pattern = new RegExp(`^#?\\s*${name}=.*$`, "m");
  return pattern.test(contents)
    ? contents.replace(pattern, line)
    : `${contents.trimEnd()}\n${line}\n`;
}
