#!/usr/bin/env node
/**
 * 从 checks.json 生成 UptimeFlare 的 uptime.config.ts
 * 目的：monitors 清单还是 checks.json 那一份真相源，这里只做格式转换。
 *
 * 用法：node gen-uptimeflare-config.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "checks.json"), "utf8"));

const GROUP_LABEL = {
  a: "🌐 A 网站服务",
  b: "🔑 B 密钥校验",
  c: "📝 C 博客服务",
  d: "🛠️ D 管理员平台",
  e: "🔒 E 密码校验",
  f: "☁️ F 各平台",
};

/* UptimeFlare 的 monitor 一个 URL 一条，所以这里按 checks 逐条映射 */
const monitors = [];
const groups = {};

for (const c of cfg.checks) {
  const m = {
    id: c.id.replace(/-/g, "_"),
    name: `${c.id} ${c.name}`,
    method: c.method || "GET",
    target: c.url,
    expectedCodes: c.expectStatus,
    timeout: 10000,
    tooltip: `${c.groupName}｜${c.id}｜tier=${c.tier}`,
  };
  if (c.jsonBody) m.body = JSON.stringify(c.jsonBody);
  if (c.jsonBody) m.headers = { "Content-Type": "application/json" };

  /* UptimeFlare 只支持「响应体含某个关键词」这种粗断言，挑一条最有信息量的搬过去；
     精确的 JSON 字段断言仍由 Cloudflare Worker 那套负责。 */
  const kw =
    (c.bodyContains && c.bodyContains[0]) ||
    (c.jsonEquals && Object.keys(c.jsonEquals).length ? `"${Object.keys(c.jsonEquals)[0]}"` : null);
  if (kw) m.responseKeyword = kw;

  monitors.push(m);
  (groups[GROUP_LABEL[c.group]] ||= []).push(m.id);
}

const groupLiteral = Object.entries(groups)
  .map(([k, ids]) => `    ${JSON.stringify(k)}: [${ids.map((i) => `'${i}'`).join(", ")}],`)
  .join("\n");

const monitorLiteral = monitors
  .map((m) => {
    const lines = [
      `      id: '${m.id}',`,
      `      name: ${JSON.stringify(m.name)},`,
      `      method: '${m.method}',`,
      `      target: ${JSON.stringify(m.target)},`,
      `      expectedCodes: [${m.expectedCodes.join(", ")}],`,
      `      timeout: ${m.timeout},`,
      `      tooltip: ${JSON.stringify(m.tooltip)},`,
    ];
    if (m.body) lines.push(`      body: ${JSON.stringify(m.body)},`);
    if (m.headers) lines.push(`      headers: ${JSON.stringify(m.headers)},`);
    if (m.responseKeyword) lines.push(`      responseKeyword: ${JSON.stringify(m.responseKeyword)},`);
    return `    {\n${lines.join("\n")}\n    },`;
  })
  .join("\n");

const out = `import { MaintenanceConfig, PageConfig, WorkerConfig } from './types/config'

/* ⚠️ 本文件由 gen-uptimeflare-config.mjs 从 checks.json 生成，别手改。
   生成时间：${new Date().toISOString()}
   监控项：${monitors.length} 条 */

const pageConfig: PageConfig = {
  title: '李海鼎.top · 站点状态',
  links: [
    { link: 'https://xn--7qv00lf62c.top', label: '入口站', highlight: true },
    { link: 'https://blog.xn--7qv00lf62c.top', label: '博客' },
    { link: 'https://pan.xn--7qv00lf62c.top', label: '网盘' },
  ],
  group: {
${groupLiteral}
  },
  maintenances: {
    upcomingColor: 'gray',
  },
}

const workerConfig: WorkerConfig = {
  kvWriteCooldownMinutes: 1,
  monitors: [
${monitorLiteral}
  ],
}

const maintenances: MaintenanceConfig[] = []

export { pageConfig, workerConfig, maintenances }
`;

fs.writeFileSync(path.join(ROOT, "uptimeflare.config.ts"), out);
console.log(`已生成 uptimeflare.config.ts：${monitors.length} 条 monitor，${Object.keys(groups).length} 个分组`);
