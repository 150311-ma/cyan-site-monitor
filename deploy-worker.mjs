#!/usr/bin/env node
/**
 * 把 cf-worker 部署到 Cloudflare（Workers + Cron + KV），全程走 REST API，不依赖 wrangler。
 *
 * 前置：本机已记住 Cloudflare Token（复用博客项目的 _lib-cf-token.cjs）。
 * 用法：node deploy-worker.mjs [--dry]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_NAME = "lihaiding-uptime";
const KV_TITLE = "lihaiding-uptime";
const CRON = "* * * * *";

const require = createRequire(import.meta.url);
const BLOG_SCRIPTS = "C:/Users/13044/WorkBuddy/2026-09-15-15-26-09/server/scripts";
const token = require(path.join(BLOG_SCRIPTS, "_lib-cf-token.cjs")).readToken();
if (!token) throw new Error("拿不到 Cloudflare Token");

const API = "https://api.cloudflare.com/client/v4";
const H = { authorization: `Bearer ${token}`, "content-type": "application/json" };

async function cf(pathname, init = {}) {
  const r = await fetch(API + pathname, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error(`${init.method || "GET"} ${pathname} -> ${r.status} ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.result;
}

/* 1. 账户 */
const accounts = await cf("/accounts");
const accountId = accounts[0].id;
console.log("account:", accountId, accounts[0].name);

/* 2. KV 命名空间（没有就建） */
let namespaces = await cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
let ns = namespaces.find((n) => n.title === KV_TITLE);
if (!ns) {
  ns = await cf(`/accounts/${accountId}/storage/kv/namespaces`, { method: "POST", body: JSON.stringify({ title: KV_TITLE }) });
  console.log("KV 新建:", ns.id);
} else {
  console.log("KV 复用:", ns.id);
}

/* 3. 合并成单文件（Worker 里不能带相对 import，除非一起上传模块） */
const workerSrc = fs.readFileSync(path.join(ROOT, "cf-worker", "worker.js"), "utf8").replace(/^import\s+\{\s*CHECKS\s*\}\s+from\s+["'][^"']+["'];?$/m, "");
const genSrc = fs.readFileSync(path.join(ROOT, "cf-worker", "checks.generated.mjs"), "utf8");
const checksBlock = genSrc
  .split("\n")
  .filter((l) => !l.startsWith("//"))
  .join("\n")
  .replace(/export\s+const\s+CHECKS/, "const CHECKS");
const bundle = `${checksBlock}\n\n${workerSrc}`;
fs.writeFileSync(path.join(ROOT, "cf-worker", "dist.mjs"), bundle);
console.log("bundle:", bundle.length, "bytes");

if (process.argv.includes("--dry")) {
  console.log("dry run，停止在上传前");
  process.exit(0);
}

/* 4. 上传 Worker（ES module） */
const metadata = {
  main_module: "worker.mjs",
  compatibility_date: "2026-01-01",
  bindings: [{ type: "kv_namespace", name: "MONITOR", namespace_id: ns.id }],
};
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
form.append("worker.mjs", new Blob([bundle], { type: "application/javascript+module" }), "worker.mjs");

const up = await fetch(`${API}/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}`, {
  method: "PUT",
  headers: { authorization: `Bearer ${token}` },
  body: form,
});
const upJson = await up.json().catch(() => ({}));
if (!upJson.success) throw new Error(`上传失败 ${up.status} ${JSON.stringify(upJson.errors || upJson).slice(0, 400)}`);
console.log("Worker 已上传");

/* 5. Cron（每分钟一次）
   ★ body 必须是「对象数组」[{"cron":"..."}] —— 传 {"crons":[...]} 会得到 10026 解析失败，
     传 ["..."] 也一样，只有对象数组能过。 */
await cf(`/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}/schedules`, {
  method: "PUT",
  body: JSON.stringify([{ cron: CRON }]),
});
console.log("Cron 已设置:", CRON);

/* 6. 允许调用（workers.dev 子域） */
try {
  const sub = await cf(`/accounts/${accountId}/workers/subdomain`);
  console.log("地址: https://" + SCRIPT_NAME + "." + sub.subdomain + ".workers.dev");
} catch {
  console.log("（未取得 workers.dev 子域，需要先在面板开一个）");
}
