// ⚠️ 本文件由 sync-worker-checks.mjs 自动生成，别手改。
// 真相源：仓库根目录 checks.json（tier=core 的项）
// 生成时间：2026-11-03T12:34:48.706Z
// 检查项数：31
export const CHECKS = [
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
