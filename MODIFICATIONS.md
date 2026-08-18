# 修改日志

记录每次对项目代码的修改，要求人话描述、模块清晰。

---

## 2026-08-18 10:40

- **描述**：接入真实定位。拍照识别前静默获取微信定位（gcj02），经新增的 getLocationName 云函数调腾讯位置服务逆地址解析为可读地名（如"奥林匹克森林公园南园内"），作为发现地点存入收藏。用户拒绝授权、定位失败、解析失败、超时（5 秒）都静默降级为"未知地点"，不阻塞识别。腾讯地图 Key 走 config.local.js 本地配置（不进仓库），申请填入后即可用。
- **模块**：
  - `curious-field-guide/cloudfunctions/getLocationName/`（新增云函数）
  - `curious-field-guide/utils/location.js`（新增定位工具）
  - `curious-field-guide/pages/index/index.js`（识别流程带定位）
- **备注**：
  - 待用户操作：在 lbs.qq.com 申请 WebServiceAPI Key（勾选逆地址解析），填入 `cloudfunctions/getLocationName/config.local.js`，然后部署 getLocationName 云函数。
  - app.json 的 location 权限声明之前已配好；已用模拟报文验证解析逻辑 3 项通过。

---

## 2026-08-18 10:00

- **描述**：收藏数据上云（上线前最关键一步）。新增 collections 云函数：收藏记录存云数据库，按微信 openid 自动隔离（静默登录，用户无感知、无授权弹窗），换手机/重装数据不丢。识别照片在识别时已传云存储，收藏直接存图片云 ID（本地临时路径会失效，不入库）。测试期的本地收藏会在首次启动时自动迁移上云（只执行一次）。云端不可用时自动降级读本地缓存，功能不死。图鉴页/首页/我的页数据口径不变，改动对页面透明。
- **模块**：
  - `curious-field-guide/cloudfunctions/collections/`（新增云函数）
  - `curious-field-guide/utils/api.js`（收藏链路切云端 + 本地降级 + 迁移）
  - `curious-field-guide/app.js`（启动时触发迁移）、`pages/result/result.js`（photoFileID 透传）、`utils/constants.js`
- **备注**：
  - 需在开发者工具右键 `cloudfunctions/collections` →「上传并部署：云端安装依赖」。
  - 已用内存版云数据库桩全链路验证 7 项：迁移/新增/去重/列表/单条/照片云ID/故障降级全部通过。

---

## 2026-08-16 14:30

- **描述**：功能图标也换成手绘风。用户新增三张插画（相机/放大镜/手账本），同样做了去水印、抠透明底（空状态那张是棋盘格假透明底）、裁剪居中。接入位置：首页拍照入口（原深色圆底改为米白圆底衬托插画）、首页空状态、图鉴页空状态、识别失败页、结果页照片占位、手动搜索页提示区。顺手把手动搜索的提示文案从不支持的"颜色+形状"描述式引导改成完整物种名引导（与真实搜索能力对齐）。
- **模块**：
  - `curious-field-guide/images/icons/`（新增 icon-camera / icon-search / icon-empty）
  - `curious-field-guide/pages/index/`、`pages/collection/`、`pages/result/`、`pages/manual-search/`（wxml + wxss）
  - `design-assets/icons-raw/`（原图存档）
- **备注**：重新编译即可看到效果；剩余 emoji 只有徽章（待出图）和分享卡片 canvas（后续改图片绘制）。

---

## 2026-08-16 13:50

- **描述**：首页顶部调整：删掉「好奇图鉴」大标题和「你已累计发现 XX 个物种」副标题（导航栏已有标题，信息重复），页面从 slogan「珍惜你的每一次好奇心」开始。
- **模块**：`curious-field-guide/pages/index/index.wxml`、`index.wxss`
- **备注**：重新编译即可；累计发现数仍在图鉴页和我的页展示，数据逻辑未动。

---

## 2026-08-16 10:40

- **描述**：手动搜索接入真实物种库（iNaturalist，几十万物种），替代只能搜 10 个 mock 物种的旧逻辑。云函数新增 search 子动作：合并 iNaturalist 两个检索接口的结果，按相关性重排（精确匹配 > 前缀 > 包含，种优先于属），并过滤只沾单个字的噪音结果（实测"绿色的条形叶子"会匹配出"绿头鸭"，这类描述性短语现在返回空而不是误导性结果）。云端不可用时自动降级为本地 mock 搜索。搜索结果默认只有名字，点进结果页时会按需自动补百科内容（复用懒加载机制）。
- **模块**：
  - `curious-field-guide/cloudfunctions/identify/index.js`（search 子动作）
  - `curious-field-guide/utils/api.js`（搜索走云端 + mock 降级）
  - `curious-field-guide/pages/result/result.js`（懒加载百科重构为统一方法）
- **备注**：需重新部署 identify 云函数 + 重新编译。已知妥协：单字搜索（如"葱"）受 iNat 中文名收录限制，可能返回葱属/葱芥等近似结果，建议搜完整物种名（如"大嘴乌鸦"精准命中）。已验证：大嘴乌鸦/凤蝶/葱/描述性短语四场景。

---

## 2026-08-15 22:40

- **描述**：分类图标从系统 emoji 换成手绘风格图片。用户用即梦按设计规范生成了 5 张分类插画（蝴蝶/嫩芽/小鸟/蘑菇/小猫），我做了裁剪、去水印、抠透明底（含两张棋盘格假透明底的特殊处理）、统一 512×512 居中。已接入四个位置：首页最近发现（无实拍图时兜底）、图鉴页分类仪表盘、图鉴网格卡片、手动搜索候选列表。emoji 字段保留，作为分享卡片 canvas 等不便加载图片场景的兜底。原始大图移到小程序目录外的 design-assets/icons-raw/（避免超出小程序 2MB 包体限制）。
- **模块**：
  - `curious-field-guide/images/icons/`（新增 5 张透明底图标）
  - `curious-field-guide/utils/constants.js`（CATEGORIES 增加 icon 字段）
  - `curious-field-guide/pages/index/`、`pages/collection/`、`pages/manual-search/`（emoji → 图标）
  - `design-assets/icons-raw/`（原图存档，不进小程序包）
- **备注**：重新编译即可看到效果；徽章图标待用户用同一风格生成后按同样流程接入。

---

## 2026-08-15 21:40

- **描述**：新增「编辑资料」功能。我的页点头像/昵称区域弹出编辑弹层：头像用微信官方 chooseAvatar 组件（可选微信头像/拍照/相册），昵称输入框自带微信昵称联想，保存后存本地并即时刷新；默认昵称为「好奇宝宝」+ 🌿 默认头像。同时把隐私政策从占位文本补成完整版，披露了照片（识别用途）、头像昵称（仅存本地）、第三方服务清单（百度/iNaturalist/微信云开发）和用户权利。
- **模块**：
  - `curious-field-guide/pages/profile/`（js、wxml、wxss）
  - `curious-field-guide/pages/privacy/`（wxml、wxss）
  - `curious-field-guide/utils/constants.js`
- **备注**：
  - 真机使用 chooseAvatar 前，需在微信公众平台后台《用户隐私保护指引》里声明「头像」「昵称」两项，否则真机点头像可能无反应；开发者工具/真机调试模式不受影响。
  - 头像为微信返回的本地临时路径，收藏上云时需同步转存云存储（已列入上云轮次）。
  - 本轮补做了全库静态审查，结论见交付说明。

---

## 2026-08-15 21:20

- **描述**：两处产品调整。①首页「最近发现」列表的图标从分类 emoji 改为实拍照片缩略图（无照片的记录仍显示 emoji 兜底）。②下线「首次发现」标签——图鉴里的物种都是第一次发现，标签没有信息量；新识别不再产生该标签，旧收藏数据里已存的"首次发现"也会被过滤不展示。
- **模块**：
  - `curious-field-guide/pages/index/index.wxml`、`index.wxss`
  - `curious-field-guide/utils/gamification.js`、`utils/constants.js`、`utils/format.js`
  - `curious-field-guide/data/species-mock.js`
- **备注**：纯前端改动，重新编译即可；标签逻辑已脚本验证（新识别无首次标签、旧数据过滤正常）。

---

## 2026-08-15 21:00

- **描述**：修复「结果页切换候选（如韭葱→葱/蒜）后没有百科简介」的问题。双管齐下：①识别时百度垂类接口的 baike_num 从 1 提到 3，前 3 名候选自带百度百科简介，不增加请求耗时，多数候选点过去直接有内容；②少数没有百科的候选，点击时按需调云函数新增的 enrich 子动作从 iNaturalist 补充。同时把百科匹配规则收紧成分级匹配（精确种名 > 命中词一致 > "查询名+科/属"整词），修正了"葱错配葱芥属"这类张冠李戴；实测"猫"现在能精确匹配到家猫 Felis catus 的完整中文百科。
- **模块**：
  - `curious-field-guide/cloudfunctions/identify/index.js`
  - `curious-field-guide/utils/api.js`、`curious-field-guide/pages/result/result.js`
- **备注**：需重新部署 identify 云函数 + 重新编译。已验证：葱→葱亚科、猫→家猫、蒜/小狗正确拒绝、主流程候选自带简介回归通过。

---

## 2026-08-15 20:50

- **描述**：两个修复。①兜底阈值下调：通用识别的打分天然偏低（实测"小狗"0.42 已是正确结果），兜底路径最低置信度从 0.5 降到 0.3，猫狗等家养宠物能正常出结果了（仍带"识别不确定"黄条）。②百科增强防张冠李戴：实测发现"小狗"会被 iNaturalist 匹配成一种深海鱼（名称含"狗母鱼"），现在百科匹配必须通过名称相关性校验（精确匹配/互为包含/命中词一致），匹配不上就显示占位，绝不放错内容。
- **模块**：`curious-field-guide/cloudfunctions/identify/index.js`
- **备注**：需重新部署 identify 云函数生效。已验证三场景：小狗兜底成功且不放错百科、猫正常兜底+猫科百科、大嘴乌鸦完整链路回归。

---

## 2026-08-15 20:15

- **描述**：修复「拍猫/狗等常见家养动物识别失败」的问题。根因：百度动物识别对猫狗只返回品种级猜测（如"狮子猫"）且置信度很低（0.28），低于 0.5 阈值被判为识别失败；而通用识别其实已认出是猫（0.75）。按技术架构文档 3.1 补上兜底逻辑：垂类接口不达标时，用通用识别的名称（如"猫"）作为结果返回，标记 isFallback，结果页显示「识别不确定」黄条。低质量的垂类猜测（<0.3）不再进入"其他可能"候选。
- **模块**：
  - `curious-field-guide/cloudfunctions/identify/index.js`
  - `curious-field-guide/pages/result/result.js`
- **备注**：需重新部署 identify 云函数 + 重新编译；已用真实猫照片全链路验证通过（返回"猫"+猫科百科内容+标准图）。

---

## 2026-08-08 11:30

- **描述**：结果页照片区改版：去掉「身份证照」（官方标准图），只保留用户拍摄的照片，改为正方形大图展示（约九成屏宽），点击仍可看原图。标准图数据仍在后台收藏时保存，只是页面不再展示；之前的对比区样式已同步清理。
- **模块**：
  - `curious-field-guide/pages/result/result.wxml`
  - `curious-field-guide/pages/result/result.wxss`
- **备注**：纯 UI 改动，重新编译即可看到效果。

---

## 2026-08-08 11:10

- **描述**：修复「收藏后从最近发现/图鉴打开，百科简介和标准图消失」的问题。根因：收入图鉴时只存了物种名和分类，百科内容没存；而真实识别的新物种不在 mock 物种列表里，打开详情时无处可取。修复：收藏时把简介、拉丁名、目科、标准图一并存入；读取时优先用收藏记录自身的内容（mock 历史发现不受影响）；只读模式下身份证照也能显示标准图了。注意：之前已收藏的物种没有存百科内容，仍会显示占位，重新识别收藏一次即可。
- **模块**：
  - `curious-field-guide/pages/result/result.js`
  - `curious-field-guide/utils/api.js`
- **备注**：纯前端改动，不用重新部署云函数，重新编译即可；已用脚本模拟「收藏→图鉴打开」全链路验证（6 项检查通过）。

---

## 2026-08-08 10:50

- **描述**：百科简介升级为百度百科长文。之前简介只有 iNaturalist 维基一两句话，用户反馈内容不够。现在识别时调用百度动植物接口会带 baike_num 参数，直接返回百度百科的完整简介（涵盖形态、习性、分布，约一两百字）。内容合并策略：简介优先百度百科、iNaturalist 兜底；标准图优先 iNaturalist（CC 授权）、百度百科兜底；拉丁名和目科仍由 iNaturalist 提供。结果页「形态特征」卡片更名「百科简介」（内容本就涵盖习性分布），「分布与习性」卡片改为有内容才显示。
- **模块**：
  - `curious-field-guide/cloudfunctions/identify/index.js`
  - `curious-field-guide/pages/result/result.wxml`
- **备注**：需重新部署 identify 云函数生效；已本地验证合并优先级（9 项检查通过）。百度百科长文来源见官方文档 baike_num 参数说明。

---

## 2026-08-08 10:30

- **描述**：识别结果页补上真实百科内容。之前「形态特征/身份证照/拉丁名」全是占位，因为百度识别只返回物种名。现在云函数在百度识别成功后，会自动调 iNaturalist（免费开放接口，无需密钥）补充：拉丁学名、中文百科简介（来自维基）、官方标准图、目/科分类。iNaturalist 不可达或查不到时不影响识别，自动降级为占位内容。「分布与习性」暂无可靠数据源，仍显示整理中。
- **模块**：`curious-field-guide/cloudfunctions/identify/index.js`
- **备注**：
  - 需重新「上传并部署」identify 云函数生效。
  - 已本地全链路验证：大嘴乌鸦 → 雀形目/鸦科/拉丁名/中文简介/标准图，10 项契约检查全部通过。
  - 标准图来自 iNaturalist 图片 CDN（已实测国内可达）；简介为繁体维基来源，偶有繁体字属正常。

---

## 2026-08-07 23:25

- **描述**：真实识别首轮联调修复（基于本地实测百度接口的真实返回格式）。四处修正：①百度「通用识别」第一条结果可能没有大类（纯风景/艺术图），路由改为取第一条有明确大类的结果；②百度认不出具体物种时会返回「非动物」「非植物」，之前会被当成物种名展示，现在过滤掉、视为识别失败；③鸟类关键词库漏了「鸦」「鹊」等字，导致乌鸦被错归为动物；④结果页空百科内容（形态特征/分布与习性）显示「百科内容整理中」占位，候选列表的置信度从多位小数格式化为两位。已用真实接口（风景照）+ 模拟真实报文（乌鸦）在本地跑通验证，成功/失败两条分支的输出契约均与结果页对齐。
- **模块**：
  - `curious-field-guide/cloudfunctions/identify/index.js`
  - `curious-field-guide/pages/result/result.js`、`result.wxml`
- **备注**：云函数改动需重新「上传并部署」identify 生效；百科文案和官方图占位待后续接数据源。

---

## 2026-08-07 23:10

- **描述**：加固识别云函数的网络稳定性。云函数调百度接口偶发 ECONNRESET（连接被重置）导致识别失败，现在这类网络瞬断会自动重试（最多 2 次，间隔 0.5 秒）；同时给识别流程每一步加了日志（照片大小、粗分类结果、垂类识别结果），后续出问题可以从云函数日志直接定位卡在哪一步。
- **模块**：`curious-field-guide/cloudfunctions/identify/index.js`
- **备注**：需在开发者工具重新「上传并部署」identify 云函数生效；若再失败，去云开发控制台 → 云函数 → identify → 日志 看带 `[identify]` 前缀的记录。

---

## 2026-08-07 23:00

- **描述**：修复真实识别成功后结果页白屏的问题。根因：百度接口返回的置信度是字符串（如 "0.86"），结果页按数字调用 toFixed 导致渲染崩溃。修复：云函数统一把置信度转成数字再返回。
- **模块**：`curious-field-guide/cloudfunctions/identify/index.js`
- **备注**：修复后需在开发者工具重新「上传并部署」identify 云函数生效。

---

## 2026-08-07 22:15

- **描述**：接入真实图像识别（第 8 轮）。新增 identify 云函数：把前端上传到云存储的照片发给百度智能云，按 PRD 3.2 路由——通用识别粗分类，植物走百度植物、动物走百度动物（再按名称细分昆虫/鸟类）、菌类用通用识别兜底；置信度 < 0.5 或无结果返回失败，由结果页展示失败态。前端 `identifyImage` 默认改走真实识别，首页长按的 mock 测试场景保留。百度密钥放在 `config.local.js`（已加 .gitignore，不进仓库）。app 启动时初始化微信云开发。
- **模块**：
  - `curious-field-guide/cloudfunctions/identify/`（index.js、package.json、config.js 新增；config.local.js 本地保存不提交）
  - `curious-field-guide/utils/api.js`、`curious-field-guide/app.js`、`curious-field-guide/utils/constants.js`
  - `curious-field-guide/project.config.json`（新增 cloudfunctionRoot）、`.gitignore`
- **备注**：
  - 待用户操作：开通云开发并把环境 ID 填到 `utils/constants.js` 的 `CLOUD_ENV_ID`；在开发者工具里右键 `cloudfunctions/identify` →「上传并部署：云端安装依赖」。
  - 已知占位：百度不返回拉丁名/百科文案/官方图，结果页这些字段暂为空（后续异步抓取补充）。
  - 遗留：识别 loading 的 5 秒提示/10 秒可取消交互在联调轮统一补。

---

## 2026-08-05 14:40

- **描述**：修复「手动搜索收藏后图鉴看不到新增」的问题。根因：搜索候选若是 mock 历史发现已有的物种（如玉带凤蝶），收藏后与历史记录去重合并，图鉴总数不变，看起来没收藏上；且 addCollection 查重只查本地收藏缓存，不查历史发现，toast 误报「已收入图鉴」。修复：addCollection 查重扩展至历史发现，已有物种返回 duplicated 并提示「已在图鉴中」；结果页进入时若物种已在图鉴，按钮直接呈现「已收入图鉴」状态。
- **模块**：
  - `curious-field-guide/utils/api.js`
  - `curious-field-guide/pages/result/result.js`
- **备注**：
  - 已用脚本验证：收藏已有物种返回 duplicated: true；收藏新物种正常新增且排在图鉴最前。
  - 验证方式：手动搜索「凤蝶」点「玉带凤蝶」（历史已有）→ 结果页按钮应直接显示「已收入图鉴」；点「碧凤蝶」（新物种）→ 收藏后图鉴应 +1 且排在最前。

---

## 2026-08-05 13:40

- **描述**：完成第 7 轮增量交付：手动搜索页 + 分享卡片页，v1.0 全部页面就位。手动搜索页：手账风搜索框（支持键盘搜索键）、候选物种列表（emoji/名称/拉丁名/描述两行截断）、初始态与无结果态提示（按 PRD 文案）；点击候选以「手动搜索模式」进结果页——无置信度黄条，显示冰蓝色来源提示条「这是手动搜索的结果」。分享卡片页：手账风卡片预览（渐变顶部/emoji/标签/发现信息/slogan）、「保存图片」用离屏 canvas 绘制卡片并 2 倍清晰度导出、保存相册权限被拒时引导去设置、「分享给朋友」走微信原生分享；结果页「生成卡片」按钮正式接通。
- **模块**：
  - `curious-field-guide/pages/manual-search/`（全新实现）
  - `curious-field-guide/pages/share-card/`（全新实现）
  - `curious-field-guide/pages/result/result.js / wxml / wxss`（手动搜索模式、生成卡片跳转）
  - `curious-field-guide/utils/api.js`（searchSpecies 补 speciesKey/habitat 字段）
  - `curious-field-guide/utils/constants.js`（STORAGE_KEYS 新增 SHARE_CARD）
- **备注**：
  - 语法检查全部通过。
  - 验证方式：① 识别失败页或低置信度黄条点「手动搜索」→ 输入「凤蝶」→ 应出候选列表 → 点候选进结果页，显示蓝色来源提示条，可收入图鉴；② 结果页点「生成卡片」→ 看到卡片预览 → 点「保存图片」→ 相册应出现卡片图（首次需授权相册权限）；③ 点「分享给朋友」可调起微信分享。
  - 静态审查：8 项通过；canvas 颜色值因无法读 CSS 变量而重复定义，已注释说明；识别接口 loading/超时仍为接真实接口时的统一遗留项。

---

## 2026-08-05 13:10

- **描述**：修正徽章交互：未解锁徽章点击不再弹出详情卡片，仅已解锁徽章可点开查看成就内容；清理弹窗中不再触发的未解锁分支。
- **模块**：
  - `curious-field-guide/pages/profile/profile.js`
  - `curious-field-guide/pages/profile/profile.wxml`
- **备注**：验证方式：「我的」页点问号徽章应无任何反应；点已解锁徽章（如「初识自然」）应弹出详情卡片。

---

## 2026-08-05 13:00

- **描述**：里程碑徽章改为「网格保密、点击揭晓」交互：未解锁徽章在网格中只显示问号和「???」，保留虚线锁定样式；点击任意徽章弹出手账风格详情卡片——已解锁显示成就内容与「🎉 已解锁」，未解锁揭晓名称、达成条件与当前进度（「进度 X / Y，继续探索吧」），v1.2 徽章显示「后续版本开放」；点击遮罩或「知道了」关闭。
- **模块**：
  - `curious-field-guide/pages/profile/profile.js`
  - `curious-field-guide/pages/profile/profile.wxml`
  - `curious-field-guide/pages/profile/profile.wxss`
- **备注**：
  - 语法检查通过。
  - 验证方式：进入「我的」页，未解锁徽章应显示问号；点「初识自然」（已解锁）应弹出卡片显示描述与已解锁状态；点锁定徽章应弹出卡片显示名称、达成条件与进度。

---

## 2026-08-05 12:40

- **描述**：完成第 6 轮增量交付：实现手账风格「我的」页。包含 emoji 头像（旋转-3°）与昵称、加入天数（按最早发现日期实算）、三项统计（发现物种/覆盖类别/连续天数，虚线分隔）、里程碑徽章网格（8 个 v1.0 徽章按真实数据判定解锁，2 个 v1.2 徽章恒锁定；锁定态为虚线框+35% 透明度，未解锁显示进度）、菜单区（导出观察手册占位/隐私设置/关于弹窗）、底部 slogan。同时把收藏统计逻辑抽为 gamification.summarizeCollections，图鉴页与我的页共用。
- **模块**：
  - `curious-field-guide/pages/profile/`（profile.js / wxml / wxss，全新实现）
  - `curious-field-guide/utils/gamification.js`（新增 summarizeCollections、evaluateBadges）
  - `curious-field-guide/pages/collection/collection.js`（改用共用统计函数）
- **备注**：
  - 语法检查全部通过。
  - 验证方式：编译后点底部「我的」tab，应看到头像昵称、加入天数、三项统计（与图鉴页数字一致）、里程碑网格（「初识自然」应已解锁显示"已解锁"，其余显示进度如 1/5）；点「隐私设置」跳隐私政策页；点「关于好奇图鉴」弹出版本弹窗。
  - 静态审查：8 项通过；loading/超时仍为真实接口接入时的统一遗留项。

---

## 2026-08-05 12:05

- **描述**：修复首页「最近发现」不随收藏变化的问题。根因：首页 getDashboard 返回固定 mock 列表，与图鉴页的合并数据脱节；且首页只在 onLoad 加载，从结果页收藏返回后不刷新。修复：getDashboard 改为基于合并收藏数据实时计算（累计发现数=合并列表长度、连续天数用 gamification.calculateStreak 实算、最近发现=合并列表前 5 条）；首页加载改为 onShow 触发，收藏返回后自动刷新；列表项跳转 key 统一为 viewKey。顺带：收藏时把当次稀有度标签一并存入，新收藏在首页/图鉴页也带蜡笔标签。
- **模块**：
  - `curious-field-guide/utils/api.js`
  - `curious-field-guide/pages/index/index.js`
  - `curious-field-guide/pages/index/index.wxml`
  - `curious-field-guide/pages/result/result.js`
- **备注**：
  - 语法检查全部通过。
  - 验证方式：编译后首页拍照识别 → 结果页点「收入图鉴」→ 返回首页，「最近发现」最前面应出现刚收藏的物种（带标签），顶部累计发现数 +1；点该条可进结果页只读模式。
  - 副作用提示：顶部「累计发现 N 个物种」现在显示真实收藏数（初始为 mock 历史 5 条），不再是写死的 23。

---

## 2026-08-05 11:45

- **描述**：修复结果页两个体验问题。① 「其他可能」候选切换改为轮换制：首选与候选合并为候选池，点击候选后当前物种回到候选区，不再丢失原识别结果；黄条置信度随当前查看候选更新。② 生活照与身份证照支持点击看大图：有图时调起 wx.previewImage；官方图占位（mock 无标准图）点击提示「标准图整理中」。
- **模块**：
  - `curious-field-guide/pages/result/result.js`
  - `curious-field-guide/pages/result/result.wxml`
- **备注**：
  - 语法检查通过。
  - 验证方式：正常识别后展开「其他可能」，点击候选 B 后候选区应变为「A 和 C」，可再点 A 切回；点击生活照应进入系统图片预览（可双指缩放）；点击身份证照占位应提示「标准图整理中」。

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
