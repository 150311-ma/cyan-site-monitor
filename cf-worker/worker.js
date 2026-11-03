/**
 * 李海鼎.top 站点监控 · Cloudflare Worker 版
 * ---------------------------------------------------------------
 * 为什么有这一份：
 *   GitHub Actions 的 schedule 最短 5 分钟，而且经常延迟甚至不触发。
 *   要做到「真的每分钟一次」，Cloudflare Cron Trigger 是唯一免费又准时的方式
 *   （最短 1 分钟），而且站点本来就跑在 Cloudflare 上。
 *
 * 检查清单不在这里手写 —— 由 sync-worker-checks.mjs 从 checks.json 生成
 * （cf-worker/checks.generated.mjs），保持单一真相源。
 *
 * 路由：
 *   GET /            → 状态页（HTML）
 *   GET /status.json → 最新结果（机器可读）
 */
import { CHECKS, DEEP_CHECKS } from "./checks.generated.mjs";

const TIMEOUT_MS = 10000;
const CONCURRENCY = 10;
const KV_KEY = "latest";
const KV_KEY_DEEP = "deep";
const HISTORY_PREFIX = "h:";

/* ---------- 断言（与 monitor.mjs 同口径） ---------- */
const getPath = (obj, p) => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
const parseJson = (t) => {
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
};

function judge(check, res) {
  const problems = [];
  if (res.err) return [`请求失败：${res.err}`];
  if (!check.expectStatus.includes(res.status)) problems.push(`状态码 ${res.status}，期望 ${check.expectStatus.join("/")}`);
  if (check.onlyWhenStatus && !check.onlyWhenStatus.includes(res.status)) return problems;

  const low = res.text.toLowerCase();
  for (const n of check.bodyContains || []) if (!low.includes(n.toLowerCase())) problems.push(`响应体不含 "${n}"`);

  if (check.jsonEquals || check.jsonPathExists || check.jsonLength) {
    const j = parseJson(res.text);
    if (!j) problems.push("响应不是合法 JSON");
    else {
      for (const [k, want] of Object.entries(check.jsonEquals || {}))
        if (getPath(j, k) !== want) problems.push(`字段 ${k}=${JSON.stringify(getPath(j, k))}，期望 ${JSON.stringify(want)}`);
      for (const p of check.jsonPathExists || []) if (getPath(j, p) === undefined) problems.push(`缺字段 ${p}`);
      for (const [p, len] of Object.entries(check.jsonLength || {})) {
        const got = getPath(j, p);
        if (typeof got !== "string" || got.length !== len) problems.push(`${p} 长度不符`);
      }
    }
  }
  return problems;
}

async function probe(check, attempts = 2) {
  const t0 = Date.now();
  let res = { status: 0, text: "", err: "未执行" };
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const init = {
        method: check.method || "GET",
        redirect: "manual",
        headers: { "user-agent": "lihaiding-cf-monitor/1.0", accept: "*/*" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      };
      if (check.jsonBody) {
        init.headers["content-type"] = "application/json";
        init.body = JSON.stringify(check.jsonBody);
      }
      const r = await fetch(check.url, init);
      res = { status: r.status, text: (await r.text()).slice(0, 100000), err: undefined };
    } catch (e) {
      res = { status: 0, text: "", err: e.name === "TimeoutError" ? `超时 ${TIMEOUT_MS}ms` : String(e.message || e) };
    }
    const problems = judge(check, res);
    if (!problems.length) return { id: check.id, name: check.name, ok: true, status: res.status, ms: Date.now() - t0, problems: [] };
    if (attempt === attempts) return { id: check.id, name: check.name, ok: false, status: res.status, ms: Date.now() - t0, problems };
    await new Promise((r) => setTimeout(r, 800));
  }
}

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

/* ---------- 主流程 ---------- */
async function runChecks(env, list, kvKey, historyPrefix = null, attempts = 2) {
  const at = new Date().toISOString();
  const results = await pool(list, CONCURRENCY, (c) => probe(c, attempts));

  const prevRaw = await env.MONITOR.get(kvKey);
  const prev = prevRaw ? JSON.parse(prevRaw) : null;
  const prevMap = new Map((prev?.results || []).map((r) => [r.id, r]));

  const events = [];
  for (const r of results) {
    const p = prevMap.get(r.id);
    if (p && p.ok !== r.ok) events.push({ at, id: r.id, name: r.name, from: p.ok ? "up" : "down", to: r.ok ? "up" : "down" });
  }

  const failed = results.filter((r) => !r.ok);
  const snapshot = {
    at,
    total: results.length,
    ok: results.length - failed.length,
    failed: failed.length,
    events,
    results,
  };

  await env.MONITOR.put(kvKey, JSON.stringify(snapshot));
  if (historyPrefix) {
    await env.MONITOR.put(
      `${HISTORY_PREFIX}${historyPrefix}:${at.slice(0, 10)}:${at.slice(11, 16)}`,
      JSON.stringify({ at, ok: snapshot.ok, total: snapshot.total, failed: failed.map((f) => f.id) }),
      { expirationTtl: 60 * 60 * 24 * 14 }
    );
  }

  return snapshot;
}

/* 每分钟跑 CORE；UTC 分钟数 % 10 == 4 那一轮顺带跑 DEEP */
function shouldRunDeep(now) {
  return now.getUTCMinutes() % 10 === 4;
}

/* ---------- 页面 ---------- */
const GROUP_NAMES = { a: "网站服务", b: "密钥校验", c: "博客服务", d: "管理员平台", e: "密码校验", f: "各平台" };
const ALL_CHECKS = [...CHECKS, ...DEEP_CHECKS];

function renderHtml(snap, deepSnap) {
  if (!snap) return "<h1>还没有数据</h1><p>Cron 尚未跑第一轮。</p>";
  const all = [...(snap.results || []), ...((deepSnap && deepSnap.results) || [])];
  const byId = new Map(all.map((r) => [r.id, r]));

  const groups = {};
  for (const c of ALL_CHECKS) (groups[c.group] ||= []).push(c.id);

  const rows = Object.entries(groups)
    .map(([g, ids]) => {
      const cells = ids
        .map((id) => {
          const r = byId.get(id);
          if (!r) return "";
          return `<tr><td>${r.ok ? "✅" : "❌"}</td><td>${r.name}</td><td>${r.status || "-"}</td><td>${r.ms}ms</td><td class="p">${(r.problems || []).join("；")}</td></tr>`;
        })
        .join("");
      return `<h2>${g.toUpperCase()}. ${GROUP_NAMES[g] || g}</h2><table><thead><tr><th></th><th>项目</th><th>状态码</th><th>耗时</th><th>问题</th></tr></thead><tbody>${cells}</tbody></table>`;
    })
    .join("");

  const deepLine = deepSnap
    ? `深度巡检（每 10 分钟）：${deepSnap.at}　${deepSnap.failed === 0 ? `<span class="ok">全部 ${deepSnap.total} 项正常</span>` : `<span class="bad">${deepSnap.failed}/${deepSnap.total} 异常</span>`}`
    : "深度巡检：还没跑过";

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>李海鼎.top 状态</title>
<style>
:root{color-scheme:light}
body{font:15px/1.6 -apple-system,"Segoe UI",system-ui,sans-serif;margin:0;padding:28px;background:#f7f8fa;color:#1a1a1a}
h1{font-size:20px;margin:0 0 6px}
.sum{font-size:14px;color:#555;margin-bottom:4px}
table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.07);margin-bottom:20px}
th,td{padding:7px 10px;text-align:left;border-bottom:1px solid #eee;font-size:13.5px;vertical-align:top}
th{background:#fafbfc;font-weight:600;color:#444}
td.p{color:#b42318;font-size:12.5px}
h2{font-size:14px;margin:22px 0 8px;color:#444}
.ok{color:#067647}.bad{color:#b42318}
</style></head><body>
<h1>李海鼎.top · 站点状态</h1>
<div class="sum">核心巡检（每分钟）：${snap.at}　|　
${snap.failed === 0 ? `<span class="ok">全部 ${snap.total} 项正常</span>` : `<span class="bad">${snap.failed}/${snap.total} 项异常</span>`}</div>
<div class="sum">${deepLine}</div>
${[...(snap.events || []), ...((deepSnap && deepSnap.events) || [])].length
      ? `<p class="bad">最近变化：${[...(snap.events || []), ...((deepSnap && deepSnap.events) || [])].map((e) => `${e.name} ${e.from}→${e.to}`).join("；")}</p>`
      : ""}
${rows}
</body></html>`;
}

/* ★ Cloudflare 免费版单次 invocation 最多 50 个 subrequest。
   core 31 + deep 28 = 59 会直接撞墙（实测报 "Too many subrequests by single Worker invocation"）。
   所以 deep 那一轮只跑 deep（28）+ 4 项核心可用性 = 32，并且不重试。 */
const CRITICAL_IDS = ["a-01", "a-03", "c-01", "d-01"];

export default {
  async scheduled(event, env, ctx) {
    const now = new Date();
    ctx.waitUntil(
      (async () => {
        if (shouldRunDeep(now)) {
          /* deep 轮：跑深度 28 项 + 4 项核心，然后把核心那 4 项合并回 latest */
          const critical = CHECKS.filter((c) => CRITICAL_IDS.includes(c.id));
          const r = await runChecks(env, [...critical, ...DEEP_CHECKS], KV_KEY_DEEP, "deep", 1);

          const prevRaw = await env.MONITOR.get(KV_KEY);
          const base = prevRaw ? JSON.parse(prevRaw) : { results: [] };
          const ids = new Set(critical.map((c) => c.id));
          const merged = [...(base.results || []).filter((x) => !ids.has(x.id)), ...r.results.filter((x) => ids.has(x.id))];
          await env.MONITOR.put(
            KV_KEY,
            JSON.stringify({
              at: r.at,
              total: merged.length,
              ok: merged.filter((x) => x.ok).length,
              failed: merged.filter((x) => !x.ok).length,
              events: [],
              results: merged,
            })
          );
        } else {
          await runChecks(env, CHECKS, KV_KEY, "core");
        }
      })()
    );
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/status.json") {
      const [coreRaw, deepRaw] = await Promise.all([env.MONITOR.get(KV_KEY), env.MONITOR.get(KV_KEY_DEEP)]);
      return new Response(JSON.stringify({ core: coreRaw ? JSON.parse(coreRaw) : null, deep: deepRaw ? JSON.parse(deepRaw) : null }), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" },
      });
    }
    if (url.pathname === "/run") {
      /* 手动催一轮，方便调试；?deep=1 连深度一起跑 */
      const deep = url.searchParams.get("deep") === "1";
      const core = await runChecks(env, CHECKS, KV_KEY, "core");
      const deepSnap = deep ? await runChecks(env, DEEP_CHECKS, KV_KEY_DEEP, "deep") : null;
      return new Response(JSON.stringify({ core: { ok: core.ok, total: core.total, failed: core.failed }, deep: deepSnap && { ok: deepSnap.ok, total: deepSnap.total, failed: deepSnap.failed } }), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }
    const [coreRaw, deepRaw] = await Promise.all([env.MONITOR.get(KV_KEY), env.MONITOR.get(KV_KEY_DEEP)]);
    return new Response(renderHtml(coreRaw ? JSON.parse(coreRaw) : null, deepRaw ? JSON.parse(deepRaw) : null), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  },
};
