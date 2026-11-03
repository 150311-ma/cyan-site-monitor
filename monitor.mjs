#!/usr/bin/env node
/**
 * 李海鼎.top 站点监控执行器
 * ---------------------------------------------------------------
 * 唯一真相源是 checks.json —— 这里不硬编码任何 URL / 期望码。
 * 新增一个监控项 = 改 checks.json 加一条，不动这个文件。
 *
 * 用法：
 *   node monitor.mjs --tier core                 # 跑一遍只读探测
 *   node monitor.mjs --tier core --rounds 5 --interval 60   # 连跑 5 轮，每轮间隔 60 秒
 *   node monitor.mjs --tier deep                 # 深度巡检（含 POST 校验）
 *
 * 退出码：0 全绿 / 1 有失败（任意一轮）
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";

/* 本机到 Cloudflare 边缘的 IPv6 是黑洞，Node 17+ 默认优先 IPv6 会卡死。
   强制 IPv4 优先，GitHub runner 上无副作用。 */
dns.setDefaultResultOrder("ipv4first");

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "checks.json"), "utf8"));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}

const argTier = ["core", "deep", "all"].includes(arg("tier", "all")) ? arg("tier", "all") : "all";
const ROUNDS = Math.max(1, Number(arg("rounds", 1)) || 1);
const INTERVAL = Math.max(0, Number(arg("interval", 60)) || 0);

const IS_CI = !!process.env.GITHUB_ACTIONS;
const TIMEOUT_MS = Number(arg("timeout", IS_CI ? 15000 : 12000));
const ATTEMPTS = Number(arg("attempts", 2));
const CONCURRENCY = Number(arg("concurrency", 10));
const FAIL_THRESHOLD = Number(process.env.FAIL_THRESHOLD || 2);

/* ---------------- 断言工具 ---------------- */

const getPath = (obj, dotted) => dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const parseJson = (t) => {
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
};

function assert(check, res) {
  const problems = [];
  if (res.err) return [`请求失败：${res.err}`];
  if (!check.expectStatus.includes(res.status)) problems.push(`状态码 ${res.status}，期望 ${check.expectStatus.join("/")}`);
  /* 允许「多种状态都算正常」的项（比如文章可能被删导致 404），
     只对指定状态做内容断言 */
  if (check.onlyWhenStatus && !check.onlyWhenStatus.includes(res.status)) return problems;
  const low = res.text.toLowerCase();
  for (const n of check.bodyContains || []) if (!low.includes(n.toLowerCase())) problems.push(`响应体不含 "${n}"`);
  for (const n of check.bodyNotContains || []) if (low.includes(n.toLowerCase())) problems.push(`响应体含不应出现的 "${n}"`);

  const needJson =
    check.jsonEquals || check.jsonPathExists || check.jsonPath || check.jsonLength || check.jsonTruthy;
  if (needJson) {
    const j = parseJson(res.text);
    if (!j) problems.push("响应不是合法 JSON");
    else {
      for (const [k, want] of Object.entries(check.jsonEquals || {}))
        if (getPath(j, k) !== want) problems.push(`字段 ${k}=${JSON.stringify(getPath(j, k))}，期望 ${JSON.stringify(want)}`);
      for (const p of check.jsonPathExists || []) if (getPath(j, p) === undefined) problems.push(`缺字段 ${p}`);
      for (const [p, want] of Object.entries(check.jsonPath || {}))
        if (getPath(j, p) !== want) problems.push(`${p}=${JSON.stringify(getPath(j, p))}，期望 ${want}`);
      for (const [p, len] of Object.entries(check.jsonLength || {})) {
        const got = getPath(j, p);
        if (typeof got !== "string" || got.length !== len)
          problems.push(`${p} 长度 ${typeof got === "string" ? got.length : "N/A"}，期望 ${len}`);
      }
      for (const p of check.jsonTruthy || []) {
        const got = getPath(j, p);
        if (!got) problems.push(`${p} 为空/假值`);
      }
    }
  }
  return problems;
}

async function runCheck(check) {
  const started = Date.now();
  let last = { status: 0, text: "", err: "未执行" };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const init = {
        method: check.method || "GET",
        redirect: check.follow ? "follow" : "manual",
        headers: {
          "user-agent": "lihaiding-uptime-monitor/1.0 (+https://github.com/150311-ma/cyan-site-monitor)",
          accept: "*/*",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      };
      if (check.jsonBody) {
        init.headers["content-type"] = "application/json";
        init.body = JSON.stringify(check.jsonBody);
      }
      if (check.headers) Object.assign(init.headers, check.headers);
      const r = await fetch(check.url, init);
      last = { status: r.status, text: (await r.text()).slice(0, 200000), err: undefined };
    } catch (e) {
      last = { status: 0, text: "", err: e.name === "TimeoutError" ? `超时 ${TIMEOUT_MS}ms` : String(e.message || e) };
    }
    const problems = assert(check, last);
    if (!problems.length) return { ...check, ok: true, status: last.status, ms: Date.now() - started, problems: [] };
    if (attempt >= ATTEMPTS) return { ...check, ok: false, status: last.status, ms: Date.now() - started, problems };
    await new Promise((r) => setTimeout(r, 1200));
  }
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let idx = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (idx < items.length) {
        const i = idx++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

/* ---------------- 一轮 ---------------- */

const stateDir = path.join(ROOT, "state");
const stateFile = path.join(stateDir, `status-${argTier}.json`);
const histDir = path.join(ROOT, "history");
fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(histDir, { recursive: true });

let state = fs.existsSync(stateFile) ? parseJson(fs.readFileSync(stateFile, "utf8")) || { checks: {} } : { checks: {} };
state.checks = state.checks || {};

const allAlerts = [];
const allRecoveries = [];
const allChanges = [];
let everFailed = 0;
let lastMd = "";

const selected = CFG.checks.filter((c) => argTier === "all" || c.tier === argTier);

for (let round = 0; round < ROUNDS; round++) {
  const t0 = Date.now();
  const results = await pool(selected, CONCURRENCY, runCheck);
  const now = new Date();
  const failed = results.filter((r) => !r.ok);
  everFailed += failed.length;

  for (const r of results) {
    const before = state.checks[r.id] || {};
    const fails = r.ok ? 0 : (before.fails || 0) + 1;
    const entry = { ok: r.ok, fails, alerted: before.alerted || false, since: before.ok === r.ok ? before.since || now.toISOString() : now.toISOString() };

    if (before.ok !== undefined && before.ok !== r.ok)
      allChanges.push({ id: r.id, name: r.name, from: before.ok ? "up" : "down", to: r.ok ? "up" : "down" });

    if (!r.ok && fails >= FAIL_THRESHOLD && !entry.alerted) {
      allAlerts.push({ id: r.id, group: r.group, groupName: r.groupName, name: r.name, url: r.url, problems: r.problems, status: r.status });
      entry.alerted = true;
    }
    if (r.ok && entry.alerted) {
      allRecoveries.push({ id: r.id, name: r.name });
      entry.alerted = false;
    }
    state.checks[r.id] = entry;
  }

  state.updatedAt = now.toISOString();
  state.round = round + 1;
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));

  fs.appendFileSync(
    path.join(histDir, `${now.toISOString().slice(0, 10)}.jsonl`),
    JSON.stringify({
      at: now.toISOString(),
      tier: argTier,
      round: round + 1,
      total: results.length,
      failed: failed.length,
      checks: results.map((r) => ({ id: r.id, ok: r.ok, status: r.status, ms: r.ms })),
    }) + "\n"
  );

  const groups = [...new Set(results.map((r) => r.group))].sort();
  const stamp = now.toISOString().replace("T", " ").slice(0, 19) + "Z";
  let md = `## 李海鼎.top 站点监控 · ${argTier}${ROUNDS > 1 ? ` · 第 ${round + 1}/${ROUNDS} 轮` : ""}\n\n`;
  md += `**时间**：${stamp}　**结果**：${results.length - failed.length}/${results.length} 正常`;
  md += failed.length ? `　❌ **${failed.length} 项异常**` : `　✅ 全绿`;
  md += `\n\n`;
  for (const g of groups) {
    const rows = results.filter((r) => r.group === g);
    md += `### ${g.toUpperCase()}. ${rows[0].groupName}\n\n| 状态 | 项目 | 方法 | 状态码 | 耗时 | 说明 |\n|---|---|---|---|---|---|\n`;
    for (const r of rows) {
      md += `| ${r.ok ? "✅" : "❌"} | ${r.name} | ${r.method || "GET"} | ${r.status || "-"} | ${r.ms}ms | ${r.ok ? "" : r.problems.join("；").replace(/\|/g, "\\|")} |\n`;
    }
    md += `\n`;
  }
  if (allAlerts.length) md += `> ⚠️ 本轮新开告警：${allAlerts.map((a) => a.name).join("、")}\n\n`;
  lastMd = md;

  console.log(`[round ${round + 1}/${ROUNDS}] ${results.length - failed.length}/${results.length} ok, ${failed.length} fail, ${Date.now() - t0}ms`);
  if (failed.length) console.log(failed.map((f) => `  ✗ ${f.id} ${f.name}: ${f.problems.join("；")}`).join("\n"));

  if (round < ROUNDS - 1 && INTERVAL > 0) {
    const elapsed = Date.now() - t0;
    const wait = Math.max(1000, INTERVAL * 1000 - elapsed);
    await new Promise((r) => setTimeout(r, wait));
  }
}

/* ---------------- 输出 ---------------- */

fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "reports", `latest-${argTier}.md`), lastMd);

const payload = {
  failed: everFailed,
  total: selected.length,
  stateChanged: allChanges.length || allAlerts.length || allRecoveries.length ? "1" : "0",
  changed: allChanges.map((c) => `${c.id}:${c.to}`).join(","),
  alertsJson: JSON.stringify(allAlerts),
  recoveriesJson: JSON.stringify(allRecoveries),
  report: lastMd,
};

if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lastMd);
if (process.env.GITHUB_OUTPUT)
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(payload)
      .map(([k, v]) => `${k}<<__EOF__\n${v}\n__EOF__`)
      .join("\n") + "\n"
  );

if (allChanges.length) console.log("状态翻转：", JSON.stringify(allChanges));
process.exit(everFailed ? 1 : 0);
