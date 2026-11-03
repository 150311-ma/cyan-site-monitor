const CHECKS = [
  {"id":"a-01","group":"a","groupName":"网站服务状态","name":"入口站首页（根域）","method":"GET","url":"https://xn--7qv00lf62c.top/","expectStatus":[200],"bodyContains":["李海鼎"]},
  {"id":"a-02","group":"a","groupName":"网站服务状态","name":"博客首页 HTML","method":"GET","url":"https://blog.xn--7qv00lf62c.top/","expectStatus":[200],"bodyContains":["<!doctype html"]},
  {"id":"a-03","group":"a","groupName":"网站服务状态","name":"健康检查 /api/health","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/health","expectStatus":[200],"jsonEquals":{"ok":true,"service":"blog-api"}},
  {"id":"a-04","group":"a","groupName":"网站服务状态","name":"接口总表 /api/ai","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/ai","expectStatus":[200],"jsonEquals":{"ok":true,"service":"cyan-blog"}},
  {"id":"b-01","group":"b","groupName":"密钥校验状态","name":"激活码公钥 /api/license/pubkey","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/license/pubkey","expectStatus":[200],"jsonEquals":{"ok":true,"algo":"Ed25519"},"jsonLength":{"pubkey":64}},
  {"id":"b-02","group":"b","groupName":"密钥校验状态","name":"吊销名单鉴权 /api/license/revoked（未登录应 401/403）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/license/revoked","expectStatus":[401,403],"jsonEquals":{"ok":false}},
  {"id":"c-01","group":"c","groupName":"博客服务状态","name":"文章列表 /api/posts","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/posts","expectStatus":[200],"jsonEquals":{"ok":true},"jsonPathExists":["posts"]},
  {"id":"c-02","group":"c","groupName":"博客服务状态","name":"标签清单 /api/tags","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/tags","expectStatus":[200],"jsonEquals":{"ok":true},"jsonPathExists":["tags","total"]},
  {"id":"c-03","group":"c","groupName":"博客服务状态","name":"搜索 /api/search","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/search?q=%E5%8D%9A%E5%AE%A2","expectStatus":[200],"jsonEquals":{"ok":true},"jsonPathExists":["results"]},
  {"id":"c-04","group":"c","groupName":"博客服务状态","name":"关于页 /api/about","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/about","expectStatus":[200],"jsonEquals":{"ok":true},"jsonPathExists":["content"]},
  {"id":"c-05","group":"c","groupName":"博客服务状态","name":"站点配置 /api/site-config（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/site-config","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"c-06","group":"c","groupName":"博客服务状态","name":"构建版本 /version.json","method":"GET","url":"https://blog.xn--7qv00lf62c.top/version.json","expectStatus":[200],"jsonPathExists":["version","contentHash"]},
  {"id":"d-01","group":"d","groupName":"管理员平台状态","name":"管理后台 /_admin/","method":"GET","url":"https://blog.xn--7qv00lf62c.top/_admin/","expectStatus":[200],"bodyContains":["<!doctype html"]},
  {"id":"d-02","group":"d","groupName":"管理员平台状态","name":"/_admin 短路径重定向","method":"GET","url":"https://blog.xn--7qv00lf62c.top/_admin","expectStatus":[301,302,307,308]},
  {"id":"d-03","group":"d","groupName":"管理员平台状态","name":"用户列表鉴权 /api/users（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/users","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"e-01","group":"e","groupName":"密码校验状态","name":"账号规则 /api/auth/rules","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/auth/rules","expectStatus":[200],"jsonEquals":{"ok":true},"jsonPathExists":["username","password"]},
  {"id":"e-03","group":"e","groupName":"密码校验状态","name":"访问密码配置 /api/access-config（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/access-config","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"f-01","group":"f","groupName":"网站各平台状态","name":"网盘站 pan.李海鼎.top","method":"GET","url":"https://pan.xn--7qv00lf62c.top/","expectStatus":[200],"bodyContains":["<!doctype html"]},
  {"id":"f-02","group":"f","groupName":"网站各平台状态","name":"网盘 Pages 源站 cyan-repo.pages.dev","method":"GET","url":"https://cyan-repo.pages.dev/","expectStatus":[200],"bodyContains":["<!doctype html"]},
  {"id":"f-03","group":"f","groupName":"网站各平台状态","name":"博客 Pages 源站 cyan-blog-2fk.pages.dev","method":"GET","url":"https://cyan-blog-2fk.pages.dev/","expectStatus":[200],"bodyContains":["<!doctype html"]},
  {"id":"b-05","group":"b","groupName":"密钥校验状态","name":"吊销接口鉴权 /api/license/revoke（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/license/revoke","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"c-10","group":"c","groupName":"博客服务状态","name":"单篇正文 /api/posts/<slug>","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/posts/%E4%B8%8B%E5%8D%8A%E9%83%A8%E5%88%86","expectStatus":[200,404],"jsonPathExists":["post","post.slug"],"onlyWhenStatus":[200]},
  {"id":"c-11","group":"c","groupName":"博客服务状态","name":"留言列表鉴权 /api/mail-forward/list（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/mail-forward/list","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"d-06","group":"d","groupName":"管理员平台状态","name":"账号状态接口鉴权 /api/user-status（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/user-status","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"e-05","group":"e","groupName":"密码校验状态","name":"当前用户 /api/auth/me（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/auth/me","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"e-06","group":"e","groupName":"密码校验状态","name":"SSO 票据 /api/sso/ticket（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/sso/ticket","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"e-07","group":"e","groupName":"密码校验状态","name":"上传限制 /api/uploads（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/uploads","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"f-04","group":"f","groupName":"网站各平台状态","name":"网盘目录 /api/repo（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/repo","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"f-05","group":"f","groupName":"网站各平台状态","name":"网盘域名设置 /api/repo-settings（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/repo-settings","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"f-06","group":"f","groupName":"网站各平台状态","name":"网盘配额 /api/repo-quota（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/repo-quota","expectStatus":[401],"jsonEquals":{"ok":false}},
  {"id":"f-07","group":"f","groupName":"网站各平台状态","name":"网盘类型清单 /api/repo-exts（未登录应 401）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/repo-exts","expectStatus":[401],"jsonEquals":{"ok":false}}
];

const DEEP_CHECKS = [
  {"id":"b-03","group":"b","groupName":"密钥校验状态","name":"激活码格式校验（坏格式应 400/bad_format）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/license/verify","expectStatus":[400],"jsonEquals":{"ok":false,"code":"bad_format"},"jsonBody":{"key":"ATB1-INVALID-0000-0000"}},
  {"id":"b-04","group":"b","groupName":"密钥校验状态","name":"Ed25519 验签在位（伪签名应 403/bad_signature）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/license/verify","expectStatus":[403],"jsonEquals":{"ok":false,"code":"bad_signature"},"jsonBody":{"key":"ATB1.eyJ0ZXN0Ijp0cnVlfQ.AAAA"}},
  {"id":"c-07","group":"c","groupName":"博客服务状态","name":"RSS /rss.xml","method":"GET","url":"https://blog.xn--7qv00lf62c.top/rss.xml","expectStatus":[200],"bodyContains":["<rss"]},
  {"id":"c-08","group":"c","groupName":"博客服务状态","name":"AI 接入文档 /ai-api.md","method":"GET","url":"https://blog.xn--7qv00lf62c.top/ai-api.md","expectStatus":[200],"bodyContains":["/api/license/verify"]},
  {"id":"c-09","group":"c","groupName":"博客服务状态","name":"llms.txt","method":"GET","url":"https://blog.xn--7qv00lf62c.top/llms.txt","expectStatus":[200]},
  {"id":"d-04","group":"d","groupName":"管理员平台状态","name":"后台编辑器页 /_admin/edit","method":"GET","url":"https://blog.xn--7qv00lf62c.top/_admin/edit","expectStatus":[200],"bodyContains":["<!doctype html"]},
  {"id":"d-05","group":"d","groupName":"管理员平台状态","name":"后台站点设置页 /_admin/site","method":"GET","url":"https://blog.xn--7qv00lf62c.top/_admin/site","expectStatus":[200],"bodyContains":["<!doctype html"]},
  {"id":"e-02","group":"e","groupName":"密码校验状态","name":"登录密码校验在跑（错误凭据应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/auth/login","expectStatus":[401],"jsonEquals":{"ok":false},"bodyContains":["密码"],"jsonBody":{"username":"__uptime_probe__","password":"__not_a_real_password__"}},
  {"id":"e-04","group":"e","groupName":"密码校验状态","name":"访问密码闸门 /_access","method":"GET","url":"https://blog.xn--7qv00lf62c.top/_access","expectStatus":[200,302,303,307,308]},
  {"id":"b-06","group":"b","groupName":"密钥校验状态","name":"吊销接口鉴权 POST（未登录应 401/403）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/license/revoke","expectStatus":[401,403],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"c-12","group":"c","groupName":"博客服务状态","name":"留言提交参数校验（空内容应 400）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/mail-forward","expectStatus":[400],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"c-13","group":"c","groupName":"博客服务状态","name":"重发留言鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/mail-forward/retry","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"c-14","group":"c","groupName":"博客服务状态","name":"删除留言鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/mail-forward/delete","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"c-15","group":"c","groupName":"博客服务状态","name":"留言自检鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/mail-forward/selftest","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"c-16","group":"c","groupName":"博客服务状态","name":"新建文章鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/posts","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"c-17","group":"c","groupName":"博客服务状态","name":"站点配置写入鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/site-config","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"c-18","group":"c","groupName":"博客服务状态","name":"关于页写入鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/about","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"d-07","group":"d","groupName":"管理员平台状态","name":"停用/启用账号鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/user-status","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"e-08","group":"e","groupName":"密码校验状态","name":"注册参数校验（空 body 应 400）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/auth/register","expectStatus":[400],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"e-09","group":"e","groupName":"密码校验状态","name":"注销幂等（空 body 应 200）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/auth/logout","expectStatus":[200],"jsonEquals":{"ok":true},"jsonBody":{}},
  {"id":"e-10","group":"e","groupName":"密码校验状态","name":"上传鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/upload","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"e-11","group":"e","groupName":"密码校验状态","name":"SSO 票据兑换参数校验（无票据应 400）","method":"GET","url":"https://blog.xn--7qv00lf62c.top/api/sso/claim","expectStatus":[400],"jsonEquals":{"ok":false}},
  {"id":"f-08","group":"f","groupName":"网站各平台状态","name":"删除文件鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/upload-delete","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"f-09","group":"f","groupName":"网站各平台状态","name":"网盘新建条目鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/repo","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"f-10","group":"f","groupName":"网站各平台状态","name":"网盘改/删条目鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/repo/__uptime_probe__","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"f-11","group":"f","groupName":"网站各平台状态","name":"分片上传鉴权（未登录应 401）","method":"POST","url":"https://blog.xn--7qv00lf62c.top/api/repo-chunk","expectStatus":[401],"jsonEquals":{"ok":false},"jsonBody":{}},
  {"id":"c-19","group":"c","groupName":"博客服务状态","name":"站点地图 /sitemap-index.xml","method":"GET","url":"https://blog.xn--7qv00lf62c.top/sitemap-index.xml","expectStatus":[200],"bodyContains":["sitemapindex"]},
  {"id":"c-20","group":"c","groupName":"博客服务状态","name":"robots.txt","method":"GET","url":"https://blog.xn--7qv00lf62c.top/robots.txt","expectStatus":[200],"bodyContains":["User-agent"]}
];


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
async function runChecks(env, list, kvKey, historyPrefix = null) {
  const at = new Date().toISOString();
  const results = await pool(list, CONCURRENCY, probe);

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

export default {
  async scheduled(event, env, ctx) {
    const now = new Date();
    ctx.waitUntil(
      (async () => {
        await runChecks(env, CHECKS, KV_KEY, "core");
        if (shouldRunDeep(now)) await runChecks(env, DEEP_CHECKS, KV_KEY_DEEP, "deep");
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
