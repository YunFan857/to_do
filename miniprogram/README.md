# 我的待办 · 微信小程序版

「我的待办」的微信小程序重做版。数据层从 Web 版（`../index.html`）移植，存储改为 WorkBuddy 云服务，登录用微信一键登录。

## 功能

- **今日**（首页）：今日进度条 + 今日日程 + 临近备忘 + 五类统计 + 打卡列表，前台日程到点横幅提醒（震动）
- **日历**：周视图，7 天时间网格 + 全天条（每日/循环待办自动上日历）+ 当前时间线，日程块点击编辑
- **全部**：五类待办分栏查看（备忘录 / 每日 / 每周 / 每月 / 每年）
- **项目**：项目正计时 + 时间轴（起点→节点→今天，自动算间隔天数），节点可增删改
- **日程编辑**：标题/日期区间/时间/全天/7 色标签/提前提醒
- **我的**：微信一键登录，数据云端同步，换手机不丢

## 项目结构

```
miniprogram/
├── project.config.json        # 小程序项目配置（appid 当前为测试号）
├── app.json / app.js / app.wxss
├── sitemap.json
├── pages/
│   ├── index/                 # 今日（tabBar 首页，仪表盘 + 提醒横幅）
│   ├── calendar/              # 日历（tabBar，周视图）
│   ├── list/                  # 全部（tabBar，分类筛选）
│   ├── projects/              # 项目正计时（tabBar，时间轴）
│   ├── edit/                  # 新建/编辑待办
│   ├── event-edit/            # 新建/编辑日程
│   ├── project-edit/          # 新建/编辑项目与节点
│   └── me/                    # 登录/我的
├── components/todo-card/      # 待办卡片
├── utils/
│   ├── cloud.js               # 云 SDK 初始化（/miniprogram 子路径 + 诊断）
│   ├── dates.js               # 移植自 Web 版的循环逻辑（纯函数，可测试）
│   ├── calendar.js            # 周视图/全天条/时间轴构建（纯函数，可测试）
│   ├── reminder.js            # 前台 30s 提醒 ticker
│   ├── store.js               # todos 表 CRUD
│   ├── events.js              # events 表 CRUD
│   ├── projects.js            # projects 表 CRUD（含里程碑归一化）
│   ├── auth.js                # 微信登录 / 会话
│   └── workbuddy-cloud-diagnostics.js
└── package.json               # 依赖 @tencent-ai/workbuddy-cloud-sdk@dev
```

## 开发

1. 用微信开发者工具「导入项目」选择本目录（miniprogramRoot 为 `./`）
2. 工具栏「工具 → 构建 npm」生成 `miniprogram_npm`
3. 编译预览；正式使用前需在 `project.config.json` 换成自己的 appid

## 数据库

云数据库三张表（均 owner 私有读写，RLS 已开启）：

**todos** — 五类循环待办：

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| owner_id | TEXT | 归属用户（服务端自动填充） |
| client_id | TEXT | 客户端生成的稳定 ID（唯一索引 owner_id+client_id） |
| title / note | TEXT | 标题 / 备注 |
| type | TEXT | once / daily / weekly / monthly / annual |
| due_date | TEXT | 一次性待办的截止日期（YYYY-MM-DD） |
| week_day / month_day / annual_month / annual_day | INT | 循环规则 |
| completed | BOOLEAN | 一次性待办的完成标记 |
| completions | JSONB | 循环待办的周期打卡记录 {周期键: 时间} |
| sort_key | DOUBLE | 排序权重 |

**events** — 日程：title / date / end_date / start / all_day / color(7色) / reminder(JSONB: enabled+minutes+last_fired)

**projects** — 项目正计时：name / start_date / milestones(JSONB: [{id,title,date,description,createdAt}])

## 与 Web 版的差异

- 存储：本地 JSON 文件 → 云数据库（云端同步、多设备）
- 登录：无 → 微信一键登录（入口在「我的」页）
- 提醒：Web 版声音+系统通知+横幅 → 前台横幅+震动（小程序切后台无法提醒，这是平台限制；后续可用订阅消息补强）
- 时区：跟随手机系统时区（简化，不再单独切换中美时区）
- 日历：周视图已实现（对应 mockups/calendar-week-mockup.html 设计稿）；「日/月」视图后续再加
