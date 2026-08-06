# 修改日志

记录每次对项目代码的修改，要求人话描述、模块清晰。

---

## 2026-08-05 11:20

- **描述**：完成第 5 轮增量交付：实现手账风格图鉴页。包含「我的图鉴」标题与统计（N 个物种 · M 个类别）、五分类收集进度仪表盘（每个小方块微旋转）、横向滑动分类筛选 tabs（全部+五类带数量）、两列网格卡片（缩略图/蜡笔标签/物种名）、空态兜底；点击卡片跳转结果页只读模式。api 层 getCollections 合并「历史发现 mock + 本地收藏缓存」并按 speciesKey 去重，getDiscoveryById 支持按发现 id 或 speciesKey 查询。顺带清偿静态审查欠账：storage key 抽为 STORAGE_KEYS 常量、分类 emoji 映射抽为 CATEGORY_EMOJI_MAP 常量、mini-tag 样式移至 app.wxss 全局。
- **模块**：
  - `curious-field-guide/pages/collection/`（collection.js / wxml / wxss，全新实现）
  - `curious-field-guide/utils/api.js`（getCollections 合并去重、getDiscoveryById 扩展）
  - `curious-field-guide/utils/constants.js`（新增 STORAGE_KEYS、CATEGORY_EMOJI_MAP）
  - `curious-field-guide/app.wxss`（mini-tag 样式全局化）
  - `curious-field-guide/pages/index/index.js`、`pages/result/result.js`、`app.js`、`utils/auth.js`（改用常量）
- **备注**：
  - 语法检查全部通过。
  - 验证方式：编译后点底部「图鉴」tab，应看到标题统计、五分类进度方块、筛选 tabs、网格卡片；点「昆虫」tab 只剩昆虫卡片；点任意卡片进入结果页只读模式；从首页拍照识别一个新物种并「收入图鉴」后回到图鉴页，新物种应出现在网格最前。
  - 静态审查遗留：接口 loading/超时处理，接真实接口时统一补。

---

## 2026-08-05 10:50

- **描述**：完成第 4 轮增量交付：按 PRD 补齐识别结果页边界场景。结果页新增「识别不确定」黄色提示条（低置信度，含重拍/手动搜索入口）、「菌类识别仅供参考」提示条、「其他可能」Top 候选折叠区（点击可切换物种）、官方图占位文案「标准图整理中」、整页识别失败态（重拍/手动搜索）；mock 识别接口支持 fail / low_confidence / fungi 测试场景并返回 2 个候选物种；首页长按拍照区弹出场景测试选择器（mock 阶段调试用，接入真实接口后移除）；识别服务异常文案按 PRD 统一为「识别服务暂时开小差了，请稍后再试」。
- **模块**：
  - `curious-field-guide/utils/api.js`（identifyImage mock 分支 + alternatives）
  - `curious-field-guide/pages/result/result.js`（失败态/提示条/候选切换逻辑）
  - `curious-field-guide/pages/result/result.wxml`（失败态与提示条 UI）
  - `curious-field-guide/pages/result/result.wxss`（提示条/候选区/失败态样式）
  - `curious-field-guide/pages/index/index.js`（失败仍跳结果页、长按场景入口）
  - `curious-field-guide/pages/index/index.wxml`（拍照区绑定长按）
- **备注**：
  - 语法检查全部通过。
  - 验证方式：编译后长按首页拍照区，选「识别失败」应进入失败页（重拍/手动搜索）；选「低置信度」应在结果页顶部看到黄色提示条；选「菌类」应看到「仅供参考」提示条；正常识别时点「其他可能」可展开候选并点击切换物种。
  - 多主体识别按 PRD 为 v1.1 规划，v1.0 不做。
  - 静态审查遗留：超时处理接真实接口时补；storage key 抽常量列入后续。

---

## 2026-08-05 10:20

- **描述**：修复隐私弹窗死循环问题——`auth.js` 模块顶层缓存的 `getApp()` 在 App 注册前执行为 undefined，导致已同意隐私的用户点拍照仍反复弹窗、无法进入主流程。按方案 B 修复：隐私状态判断改为函数内实时读取；「同意/仅浏览」动作统一封装进 `auth.js`（含静默登录占位），首页与结果页回调改为调用封装；删除 `app.js` 中不再被调用的三个方法。
- **模块**：
  - `curious-field-guide/utils/auth.js`
  - `curious-field-guide/app.js`
  - `curious-field-guide/pages/index/index.js`
  - `curious-field-guide/pages/result/result.js`
- **备注**：
  - 语法检查通过。
  - 验证方式：开发者工具中「清除缓存 → 编译」，首次进入弹隐私框，点「同意并继续」后弹窗关闭；再点拍照区应直接弹出「拍照 / 从相册选择」，不再重复弹隐私框，可正常进入识别结果页。
  - 注意：此前测试已在真机/模拟器同意过隐私的，建议先清缓存再验证完整流程。

---

## 2026-08-05 09:55

- **描述**：把「每轮结束静态审查」流程写入 AGENTS.md（新增 3.3 静态审查清单，含空值/权限/加载/错误/内存/兼容性/硬编码/重复代码 8 项）；按首次审查结论修复权限缺口——首页选图失败时区分「用户取消」与「权限拒绝」，权限被拒弹窗引导去系统设置；删除 auth.js 中未被调用的相机/相册权限死函数。
- **模块**：
  - `AGENTS.md`
  - `curious-field-guide/pages/index/index.js`
  - `curious-field-guide/utils/auth.js`
- **备注**：
  - 语法检查通过；无残留引用。
  - 验证方式：编译后点拍照区选「拍照」，若系统相机权限被拒，应弹出「无法获取照片」弹窗，点「去设置」跳转系统设置页；用户主动取消则不提示。
  - 审查遗留项（超时处理、storage key 抽常量、隐私回调抽复用）列入后续轮次。

---

## 2026-08-05 09:35

- **描述**：完成第 3 轮增量交付：实现手账风格识别结果页并打通「首页拍照 → mock 识别 → 结果页」流程。结果页包含生活照/身份证照对比区、物种名与拉丁名、蜡笔稀有度标签、形态特征/分布习性/发现信息三个手账信息卡、生成卡片与收入图鉴按钮；收藏写入本地缓存，重复收藏有提示；首页最近发现项可跳转结果页只读模式。同时抽出公共格式化工具 `utils/format.js`，api 层补充收藏与单条记录查询接口。
- **模块**：
  - `curious-field-guide/pages/result/`（result.js / wxml / wxss / json，全新实现）
  - `curious-field-guide/pages/index/index.js`（拍照后 mock 识别并跳转、最近发现跳转结果页）
  - `curious-field-guide/utils/format.js`（新建：时间格式化与标签解析）
  - `curious-field-guide/utils/api.js`（新增 getDiscoveryById / getCollections / addCollection）
- **备注**：
  - JS 与 JSON 语法检查全部通过。
  - 验证方式：编译后点击首页拍照区 → 选「拍照」或「从相册选择」→ 应进入识别结果页，显示照片对比、物种名、标签、信息卡；点击「收入图鉴」按钮变为「已收入图鉴」；返回首页点击最近发现列表项，应进入同一页面的只读模式。
  - 「生成卡片」为占位提示，分享卡片页后续轮次实现。

---

## 2026-08-05 09:02

- **描述**：标签文字仍偏上，继续把 `.tag`、`.mini-tag`、`.rarity-tag` 的 `line-height` 从 `1.2` 调整为 `1.6`，使文字在胶囊内视觉居中。
- **模块**：
  - `curious-field-guide/app.wxss`
  - `curious-field-guide/pages/index/index.wxss`
  - `curious-field-guide/components/rarity-tags/rarity-tags.wxss`
- **备注**：语法检查通过。

---

## 2026-08-05 08:55

- **描述**：根据产品侧反馈，去掉首页「连续 N 天」streak pill；修复最近发现卡片中蜡笔标签文字垂直偏上的问题，将全局 `.tag`、`.mini-tag`、`.rarity-tag` 的 `line-height` 从 `1` 调整为 `1.2`，使文字在胶囊内视觉居中。
- **模块**：
  - `curious-field-guide/pages/index/index.wxml`
  - `curious-field-guide/pages/index/index.wxss`
  - `curious-field-guide/app.wxss`
  - `curious-field-guide/components/rarity-tags/rarity-tags.wxss`
- **备注**：
  - JS 与 JSON 语法检查通过。
  - 重新编译后，首页应不再显示「连续 12 天」橙色 pill；最近发现列表中的「首次发现」「连续 12 天」等标签文字应在胶囊内垂直居中。

---

## 2026-08-05 08:43

- **描述**：完成第 2 轮增量交付：按产品侧提供的《好奇图鉴_手绘风格设计规范》把首页、稀有度标签、隐私弹窗、底部 tabBar 图标统一改成手账素描风。全局样式与颜色常量同步替换为纸张白/铅笔灰/蜡笔功能色，首页新增虚线 Slogan 横幅、手绘双层边框拍照区、蜡笔标签的最近发现卡片，tabBar 图标用 Python 重新生成为粗描边 PNG。
- **模块**：
  - `curious-field-guide/app.wxss`
  - `curious-field-guide/app.json`
  - `curious-field-guide/utils/constants.js`
  - `curious-field-guide/pages/index/index.wxml`
  - `curious-field-guide/pages/index/index.wxss`
  - `curious-field-guide/pages/index/index.js`
  - `curious-field-guide/components/rarity-tags/rarity-tags.wxml`
  - `curious-field-guide/components/rarity-tags/rarity-tags.wxss`
  - `curious-field-guide/components/privacy-modal/privacy-modal.wxml`
  - `curious-field-guide/components/privacy-modal/privacy-modal.wxss`
  - `curious-field-guide/images/tabbar/*.png`
- **备注**：
  - JS 与 JSON 语法检查全部通过。
  - 验证方式：用微信开发者工具打开 `curious-field-guide` 文件夹，点击编译，应看到米色纸张背景、铅笔灰描边、首页 Slogan 虚线框、粗边框拍照区、蜡笔色标签的最近发现卡片、描边 tabBar 图标；点击拍照按钮仍弹出「拍照 / 从相册选择」选择器。
  - 图鉴页、结果页、我的页仍为占位页，后续轮次按手绘风格继续改造。

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
