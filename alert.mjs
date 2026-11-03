#!/usr/bin/env node
/**
 * 告警器：把 monitor.mjs 算出来的 alerts / recoveries 变成 GitHub Issue。
 * 只在「连续 N 次失败」和「恢复」这两个时刻动，不做逐次刷屏。
 */
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const API = "https://api.github.com";
const LABEL = "uptime";

const alerts = JSON.parse(process.env.ALERTS_JSON || "[]");
const recoveries = JSON.parse(process.env.RECOVERIES_JSON || "[]");
if (!TOKEN || !REPO) {
  console.log("缺少 GITHUB_TOKEN / GITHUB_REPOSITORY，跳过告警（本地运行属正常）");
  process.exit(0);
}
if (!alerts.length && !recoveries.length) {
  console.log("无状态变化，不告警");
  process.exit(0);
}

const headers = {
  authorization: `Bearer ${TOKEN}`,
  accept: "application/vnd.github+json",
  "content-type": "application/json",
  "user-agent": "lihaiding-uptime-monitor",
};

const titleOf = (id) => `[监控] ${id} `;

async function api(pathname, init = {}) {
  const r = await fetch(API + pathname, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${init.method || "GET"} ${pathname} -> ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
}

async function ensureLabel() {
  try {
    await api(`/repos/${REPO}/labels`, {
      method: "POST",
      body: JSON.stringify({ name: LABEL, color: "d93f0b", description: "站点巡检自动开单" }),
    });
  } catch (e) {
    if (!/422/.test(String(e.message))) console.log("label 检查跳过：", String(e.message).slice(0, 120));
  }
}

async function openIssues() {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await api(`/repos/${REPO}/issues?state=open&labels=${LABEL}&per_page=100&page=${page}`);
    all.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
  }
  return all;
}

await ensureLabel();
const existing = await openIssues();
const findIssue = (id) => existing.find((i) => i.title.startsWith(titleOf(id)));

for (const a of alerts) {
  const found = findIssue(a.id);
  const body = [
    `**检查项**：${a.name}（\`${a.id}\`，分组 ${a.group} ${a.groupName}）`,
    `**地址**：${a.url}`,
    `**状态码**：${a.status || "无响应"}`,
    "",
    "**失败原因**",
    ...a.problems.map((p) => `- ${p}`),
    "",
    `_由每分钟巡检自动开单，恢复后自动关闭。时间：${new Date().toISOString()}_`,
  ].join("\n");

  if (found) {
    await api(`/repos/${REPO}/issues/${found.number}/comments`, { method: "POST", body: JSON.stringify({ body: `仍在异常：\n${body}` }) });
    console.log(`issue #${found.number} 已存在，追加评论`);
  } else {
    const created = await api(`/repos/${REPO}/issues`, {
      method: "POST",
      body: JSON.stringify({ title: `${titleOf(a.id)}${a.name} 异常`, body, labels: [LABEL] }),
    });
    console.log(`新建 issue #${created.number}：${a.name}`);
  }
}

for (const rec of recoveries) {
  const found = findIssue(rec.id);
  if (!found) {
    console.log(`恢复项 ${rec.id} 没有对应 issue，跳过`);
    continue;
  }
  await api(`/repos/${REPO}/issues/${found.number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: `已恢复 ✅（${new Date().toISOString()}）` }),
  });
  await api(`/repos/${REPO}/issues/${found.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
  console.log(`关闭 issue #${found.number}：${rec.name}`);
}
