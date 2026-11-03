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
import { CHECKS } from "./checks.generated.mjs";

const TIMEOUT_MS = 10000;
const CONCURRENCY = 10;
const KV_KEY = "latest";
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

async function probe(check) {
  const t0 = Date.now();
  let res = { status: 0, text: "", err: "未执行" };
  for (let attempt = 1; attempt <= 2; attempt++) {
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
    if (attempt === 2) return { id: check.id, name: check.name, ok: false, status: res.status, ms: Date.now() - t0, problems };
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
async function runChecks(env) {
  const at = new Date().toISOString();
  const results = await pool(CHECKS, CONCURRENCY, probe);

  const prevRaw = await env.MONITOR.get(KV_KEY);
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

  await env.MONITOR.put(KV_KEY, JSON.stringify(snapshot));
  /* 历史：只保留当天，粒度 1 分钟，够画曲线又不撑爆 KV */
  await env.MONITOR.put(`${HISTORY_PREFIX}${at.slice(0, 10)}:${at.slice(11, 16)}`, JSON.stringify({ at, ok: snapshot.ok, total: snapshot.total, failed: failed.map((f) => f.id) }), {
    expirationTtl: 60 * 60 * 24 * 14,
  });

  return snapshot;
}

/* ---------- 页面 ---------- */
const GROUP_NAMES = { a: "网站服务", b: "密钥校验", c: "博客服务", d: "管理员平台", e: "密码校验", f: "各平台" };

function renderHtml(snap) {
  if (!snap) return "<h1>还没有数据</h1><p>Cron 尚未跑第一轮。</p>";
  const groups = {};
  for (const c of CHECKS) (groups[c.group] ||= []).push(c.id);
  const byId = new Map(snap.results.map((r) => [r.id, r]));

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

  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>李海鼎.top 状态</title>
<style>
:root{color-scheme:light}
body{font:15px/1.6 -apple-system,"Segoe UI",system-ui,sans-serif;margin:0;padding:28px;background:#f7f8fa;color:#1a1a1a}
h1{font-size:20px;margin:0 0 6px}
.sum{font-size:14px;color:#555;margin-bottom:18px}
table{border-collapse:collapse;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.07);margin-bottom:20px}
th,td{padding:7px 10px;text-align:left;border-bottom:1px solid #eee;font-size:13.5px;vertical-align:top}
th{background:#fafbfc;font-weight:600;color:#444}
td.p{color:#b42318;font-size:12.5px}
h2{font-size:14px;margin:22px 0 8px;color:#444}
.ok{color:#067647}.bad{color:#b42318}
</style></head><body>
<h1>李海鼎.top · 站点状态</h1>
<div class="sum">最近一次检测：${snap.at}　|　
${snap.failed === 0 ? `<span class="ok">全部 ${snap.total} 项正常</span>` : `<span class="bad">${snap.failed}/${snap.total} 项异常</span>`}
　|　每分钟一次（Cloudflare Cron）</div>
${snap.events?.length ? `<p class="bad">最近变化：${snap.events.map((e) => `${e.name} ${e.from}→${e.to}`).join("；")}</p>` : ""}
${rows}
</body></html>`;
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runChecks(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/status.json") {
      const raw = await env.MONITOR.get(KV_KEY);
      return new Response(raw || '{"error":"no data yet"}', {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" },
      });
    }
    if (url.pathname === "/run") {
      /* 手动催一轮，方便调试 */
      const snap = await runChecks(env);
      return new Response(JSON.stringify({ ok: snap.failed === 0, failed: snap.failed, total: snap.total }), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }
    const raw = await env.MONITOR.get(KV_KEY);
    return new Response(renderHtml(raw ? JSON.parse(raw) : null), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  },
};
