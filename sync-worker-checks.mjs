#!/usr/bin/env node
/**
 * 从 checks.json 生成 Cloudflare Worker 用的 CHECKS 常量块。
 * 目的：监控清单只有一份真相源（checks.json），Worker 里的副本是「生成物」，不许手改。
 *
 * 用法：node sync-worker-checks.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "checks.json"), "utf8"));
const core = cfg.checks.filter((c) => c.tier === "core");

const body = core
  .map((c) =>
    JSON.stringify({
      id: c.id,
      group: c.group,
      groupName: c.groupName,
      name: c.name,
      method: c.method || "GET",
      url: c.url,
      expectStatus: c.expectStatus,
      jsonEquals: c.jsonEquals,
      jsonPathExists: c.jsonPathExists,
      jsonLength: c.jsonLength,
      bodyContains: c.bodyContains,
      onlyWhenStatus: c.onlyWhenStatus,
      jsonBody: c.jsonBody,
    })
  )
  .join(",\n  ");

const out = `// ⚠️ 本文件由 sync-worker-checks.mjs 自动生成，别手改。
// 真相源：仓库根目录 checks.json（tier=core 的项）
// 生成时间：${new Date().toISOString()}
// 检查项数：${core.length}
export const CHECKS = [
  ${body}
];
`;

fs.writeFileSync(path.join(ROOT, "cf-worker", "checks.generated.mjs"), out);
console.log(`已生成 cf-worker/checks.generated.mjs（${core.length} 项）`);
