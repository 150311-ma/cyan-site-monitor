## 李海鼎.top 站点监控 · core · 第 5/5 轮

**时间**：2026-11-03 11:44:04Z　**结果**：31/31 正常　✅ 全绿

### A. 网站服务状态

| 状态 | 项目 | 方法 | 状态码 | 耗时 | 说明 |
|---|---|---|---|---|---|
| ✅ | 入口站首页（根域） | GET | 200 | 65ms |  |
| ✅ | 博客首页 HTML | GET | 200 | 111ms |  |
| ✅ | 健康检查 /api/health | GET | 200 | 53ms |  |
| ✅ | 接口总表 /api/ai | GET | 200 | 54ms |  |

### B. 密钥校验状态

| 状态 | 项目 | 方法 | 状态码 | 耗时 | 说明 |
|---|---|---|---|---|---|
| ✅ | 激活码公钥 /api/license/pubkey | GET | 200 | 62ms |  |
| ✅ | 吊销名单鉴权 /api/license/revoked（未登录应 401/403） | GET | 403 | 48ms |  |
| ✅ | 吊销接口鉴权 /api/license/revoke（未登录应 401） | GET | 401 | 40ms |  |

### C. 博客服务状态

| 状态 | 项目 | 方法 | 状态码 | 耗时 | 说明 |
|---|---|---|---|---|---|
| ✅ | 文章列表 /api/posts | GET | 200 | 97ms |  |
| ✅ | 标签清单 /api/tags | GET | 200 | 87ms |  |
| ✅ | 搜索 /api/search | GET | 200 | 88ms |  |
| ✅ | 关于页 /api/about | GET | 200 | 44ms |  |
| ✅ | 站点配置 /api/site-config（未登录应 401） | GET | 401 | 74ms |  |
| ✅ | 构建版本 /version.json | GET | 200 | 128ms |  |
| ✅ | 单篇正文 /api/posts/<slug> | GET | 200 | 83ms |  |
| ✅ | 留言列表鉴权 /api/mail-forward/list（未登录应 401） | GET | 401 | 58ms |  |

### D. 管理员平台状态

| 状态 | 项目 | 方法 | 状态码 | 耗时 | 说明 |
|---|---|---|---|---|---|
| ✅ | 管理后台 /_admin/ | GET | 200 | 73ms |  |
| ✅ | /_admin 短路径重定向 | GET | 308 | 43ms |  |
| ✅ | 用户列表鉴权 /api/users（未登录应 401） | GET | 401 | 59ms |  |
| ✅ | 账号状态接口鉴权 /api/user-status（未登录应 401） | GET | 401 | 34ms |  |

### E. 密码校验状态

| 状态 | 项目 | 方法 | 状态码 | 耗时 | 说明 |
|---|---|---|---|---|---|
| ✅ | 账号规则 /api/auth/rules | GET | 200 | 50ms |  |
| ✅ | 访问密码配置 /api/access-config（未登录应 401） | GET | 401 | 28ms |  |
| ✅ | 当前用户 /api/auth/me（未登录应 401） | GET | 401 | 42ms |  |
| ✅ | SSO 票据 /api/sso/ticket（未登录应 401） | GET | 401 | 19ms |  |
| ✅ | 上传限制 /api/uploads（未登录应 401） | GET | 401 | 28ms |  |

### F. 网站各平台状态

| 状态 | 项目 | 方法 | 状态码 | 耗时 | 说明 |
|---|---|---|---|---|---|
| ✅ | 网盘站 pan.李海鼎.top | GET | 200 | 63ms |  |
| ✅ | 网盘 Pages 源站 cyan-repo.pages.dev | GET | 200 | 49ms |  |
| ✅ | 博客 Pages 源站 cyan-blog-2fk.pages.dev | GET | 200 | 146ms |  |
| ✅ | 网盘目录 /api/repo（未登录应 401） | GET | 401 | 60ms |  |
| ✅ | 网盘域名设置 /api/repo-settings（未登录应 401） | GET | 401 | 29ms |  |
| ✅ | 网盘配额 /api/repo-quota（未登录应 401） | GET | 401 | 25ms |  |
| ✅ | 网盘类型清单 /api/repo-exts（未登录应 401） | GET | 401 | 31ms |  |

