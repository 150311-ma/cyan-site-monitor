# 李海鼎.top 站点 uptime 监控

用 GitHub Actions 给 **李海鼎.top**（入口站 / 青柠博客 / 网盘）做可用性 + 接口健康监控。
失败自动开 Issue，恢复自动关单，不刷屏。

- 入口站：<https://xn--7qv00lf62c.top>
- 博客：<https://blog.xn--7qv00lf62c.top>
- 网盘：<https://pan.xn--7qv00lf62c.top>

---

## 一、检测频率（先说清楚一件事）

**GitHub Actions 的定时任务最短粒度是 5 分钟。** `cron: "*/1 * * * *"` 写上去也不会真每分钟跑，
GitHub 会把它节流到 5–15 分钟，高峰期还会直接丢。

所以这里的做法是：

```
cron 每 5 分钟唤起一次  →  一个 job 里连跑 5 轮  →  每轮间隔 60 秒
```

效果是这两档：

| 档位 | 覆盖范围 | 实际频率 | 用哪个 workflow |
|---|---|---|---|
| 核心巡检 | 31 项只读探测（6 大类全覆盖） | **约每分钟一次** | `uptime-1min.yml` |
| 深度巡检 | 28 项含 POST 鉴权/校验 | 10 分钟一次 | `deep-10min.yml` |

代价：每分钟那档每个 job 占约 5 分钟 Actions 额度，一天约 1440 分钟。
**公开仓库的 Actions 分钟数不计量**，所以免费。

> 为什么 POST 类不进每分钟：`POST /api/auth/login` 每调一次就是一次失败登录计数
> （站点上限是 10 次/10 分钟/IP 锁 10 分钟），每分钟打等于把自己锁死。
> 所以写操作统一放 10 分钟那档。

---

## 二、六大类监控项对照表

| 需求 | 覆盖项 | 判据 |
|---|---|---|
| **(a) 网站服务状态** | 入口站首页、博客首页、`/api/health`、`/api/ai` | 200 + 页面含 `李海鼎` + `ok:true` + 接口总表仍返回 36 个端点 |
| **(b) 密钥校验状态** | `/api/license/pubkey`、`/api/license/revoked`、`/api/license/revoke`、`/api/license/verify` | 公钥算法必须是 `Ed25519` 且长度 64；未登录 401/403；坏格式 400 `bad_format`；**伪签名必须 403 `bad_signature`**（这条能证明验签链路真的在跑，不是只做了格式检查） |
| **(c) 博客服务状态** | `/api/posts`、`/api/posts/<slug>`、`/api/tags`、`/api/search`、`/api/about`、`/api/site-config`、`/version.json`、`/rss.xml`、`/ai-api.md`、`/llms.txt`、留言四接口 | 全部 `ok:true` 且字段齐；写接口只验「未登录被拦」 |
| **(d) 管理员平台状态** | `/_admin/`、`/_admin` 跳转、`/_admin/edit`、`/_admin/site`、`/api/users`、`/api/site-config`、`/api/user-status` | 后台页面 200 且返回 HTML；管理员接口未登录必须 401（鉴权在位） |
| **(e) 密码校验状态** | `/api/auth/rules`、`/api/auth/login`、`/api/auth/me`、`/api/auth/register`、`/api/auth/logout`、`/api/access-config`、`/api/uploads`、`/api/sso/ticket`、`/api/sso/claim` | 规则接口 200；**错误密码必须 401 且报「密码」**；注册/SSO 参数校验 400 |
| **(f) 网站各平台状态** | 网盘站 `pan.*`、Pages 源站 `cyan-repo.pages.dev` / `cyan-blog-2fk.pages.dev`、网盘系列接口 `/api/repo*` | 两个 Pages 源站独立探测（域名挂了但 Pages 还活着时能一眼分清是哪一层的问题） |

完整清单在 [`checks.json`](./checks.json)，**那是唯一真相源**：
`monitor.mjs` 里没有硬编码任何 URL 或期望码。

---

## 三、覆盖了哪些接口（对照 `/api/ai` 的 36 个）

线上 `/api/ai` 列了 36 个端点，这里覆盖 **36 个，全覆盖**：

| 类型 | 数量 | 覆盖方式 |
|---|---|---|
| 公开只读 | 19 | 直接断言 `ok:true` + 关键字段 |
| 需登录/管理员 | 17 | 未登录打一发，断言 401/403 —— 既证明路由还在，也证明鉴权没被改漏 |

> 写操作（发文章、上传、删文件、改配置、发留言、吊销激活码）**只验闸门、不真执行**，
> `POST {}` 空 body 打过去，未登录必然被拦，不会产生任何数据。

### 唯一没做「业务级成功」验证的部分

这些接口只能证明「在、且拦得住未登录」，不能证明「管理员登录后功能正常」——
要验那个就得往仓库塞 token，风险大于收益。真想验，本地跑
`node monitor.mjs --tier deep` 并临时给一个只读 token。

---

## 四、告警规则

- 连续 **2 次**失败才开 Issue（默认值，`FAIL_THRESHOLD` 环境变量可调），躲开网络抖动
- 同一项只开一张单，恢复后自动评论 + 关闭
- Issue 标题固定 `[监控] <id> <名称> 异常`，打 `uptime` 标签

---

## 五、怎么改

**加一个监控项**：只改 `checks.json`，加一条：

```json
{
  "id": "c-19", "group": "c", "groupName": "博客服务状态",
  "name": "新接口", "method": "GET",
  "url": "https://blog.xn--7qv00lf62c.top/api/xxx",
  "expectStatus": [200], "jsonEquals": { "ok": true },
  "tier": "core"
}
```

`tier` 填 `core` = 每分钟那档，`deep` = 10 分钟那档。
`group` 填 `a`~`f` 对应上面六大类。

**手动跑一次**：

```bash
node monitor.mjs --tier all          # 本地全量
node monitor.mjs --tier core --rounds 5 --interval 60   # 模拟线上每分钟那档
```

**看结果**：`reports/latest-core.md`、`reports/latest-deep.md`，
或仓库 Actions 每次运行的 Summary。

---

## 六、数据留痕

- `state/status-core.json` / `state/status-deep.json`：每项最后一次状态、连续失败次数、是否已告警
- `history/YYYY-MM-DD.jsonl`：每轮一行，含每项状态码与耗时（以后想画曲线直接读它）

只在**状态翻转**时 commit，不会每分钟污染提交历史。
