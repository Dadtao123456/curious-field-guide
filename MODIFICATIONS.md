# 修改日志

记录每次对项目代码的修改，要求人话描述、模块清晰。

---

## 2026-08-04 23:20

- **描述**：完成第 1 轮增量交付：搭建微信小程序项目骨架、实现首页静态 UI、创建通用组件（隐私弹窗、稀有度标签）、补充数据库设计文档，并生成 tabBar 占位图标。所有页面文件已就位，代码均走 mock 数据，未接入真实识别与云开发。
- **模块**：
  - `curious-field-guide/` 下全部小程序代码（`app.js/json/wxss`、`project.config.json`、`sitemap.json`）
  - `curious-field-guide/pages/index/` 首页
  - `curious-field-guide/components/privacy-modal/` 隐私弹窗组件
  - `curious-field-guide/components/rarity-tags/` 稀有度标签组件
  - `curious-field-guide/utils/`（`constants.js`、`api.js`、`auth.js`、`gamification.js`）
  - `curious-field-guide/data/species-mock.js`
  - `curious-field-guide/pages/common/placeholder.wxss`
  - `curious-field-guide/images/tabbar/` 占位图标
  - `docs/数据库设计.md`
- **备注**：
  - JS 语法检查全部通过。
  - 验证方式：用微信开发者工具打开 `curious-field-guide` 文件夹，点击编译，应能看到首页、底部 tabBar、隐私弹窗、最近发现列表；点击拍照按钮应弹出「拍照 / 从相册选择」选择器。
  - 其他页面（图鉴、我的、结果页等）为占位页，后续轮次实现。

---

## 2026-08-04 22:46

- **描述**：根据产品侧反馈，在协作规范中增加「增量交付与产品验证规范」章节，约定按模块逐步交付、每轮独立 commit + push、提供非技术验证清单。同时完成技术架构文档 review，确认两点调整：① v1.0 以百度识别 + mock 数据为主，iNaturalist/Pl@ntNet 延后接入；② 官方物种图抓取改为异步，避免拖慢识别接口。
- **模块**：
  - `AGENTS.md`
  - `好奇图鉴_技术架构文档_v1.2.md`（review，未修改）
- **备注**：未开始编码，处于方案确认阶段。

---

## 2026-08-04 22:19

- **描述**：根据 PRD 编写小程序 UI 设计规范文档，明确色彩、字体、间距、组件、页面布局与图标风格，为后续编码提供统一视觉依据。
- **模块**：
  - `docs/UI设计规范.md`
- **备注**：无代码改动，仅新增设计文档。

---

## 2026-08-04 12:40

- **描述**：创建项目协作规范文件 `AGENTS.md` 和修改日志文件 `MODIFICATIONS.md`，为后续开发建立约定。
- **模块**：
  - `AGENTS.md`
  - `MODIFICATIONS.md`
- **备注**：无代码改动，仅初始化文档。
