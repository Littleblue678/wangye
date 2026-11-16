# Agent 执行记录

- 作者：王烨
- 记录时间：2026-11-12
- 项目：Swiper 课堂操作任务 · 大国重器光影展
- 线上地址：https://littleblue678.github.io/wangye/
- 说明：以下为本次会话中 AI Agent（含浏览器自动化子代理）的操作与验证记录，用于课程提交留档。

---

## 一、总览

| 序号 | 验证目标 | 结果 |
| --- | --- | --- |
| 1 | 线上 creative 电影墙 + keyboard 键盘控制 + 答辩记录区 | PASS |
| 2 | 「已跳转」提示文案复核 | PASS |
| 3 | 提示词两轮对照（旧版独立区域） | 3 项 PASS / 1 项误判 |
| 4 | 确认两轮对照已并入任务一区块 | PASS |
| 5 | poems.html 上图下文页面 | 修复后全部 PASS |
| 6 | 任务三 thumbs 缩略图联动 | PASS |
| 7 | 第 8 个按钮（初版 grid） | 4 项 PASS / 1 项尺寸不符 |
| 8 | 第 8 个按钮改为 thumbs 后 | 3 次 BLOCKED，改用静态检查通过 |

---

## 二、逐条明细

### 1. 线上 creative + keyboard 验证

- 页面加载后 `#wySw4` 带 `swiper-cube` 类，初始效果正确
- 点击「creative 电影墙」后 `#wySw4` 变为 `swiper-creative`，按钮高亮 `wy-on`
- 页面底部存在「AI 提示词与答辩记录」区域
- 控制台无报错

### 2. 提示文案复核

- 点击右侧轮播第 3 个圆点后：`#wyIdxGood` = 2，`#wyMsgGood` = 「已跳转」
- 左侧轮播第 3 个圆点点击后：`#wyIdxBad` 保持 0（无 `clickable` 不跳转）

### 3. 两轮对照验证

- 入口链接点击后 URL 变为 `#wy-prompt`，锚点跳转正常
- 左侧圆点点击无响应、右侧圆点可跳转，符合预期
- 其中 1 项判定为 FAIL，实际是自动化脚本读取了 slide 文案而非 `#wyMsgGood`，属误判，复测通过

### 4. 结构确认

- `#wy-prompt` 的直接父级就是任务一的 `.wy-sec` 卡片
- 全页仅 1 个「提示词两轮对照」标题，旧 `wyAiLog` 区域已删除

### 5. poems.html 上图下文

- 初始问题：4 张卡片图片全部空白，但接口与图片请求均返回 200
- 定位过程：
  1. 单独请求 gitee 原图，不带 Referer 返回 `image/jpeg`、19963 字节
  2. 带 `Referer: http://localhost:3004/` 请求，返回 `image/x-icon`、41566 字节
  3. 结论：gitee 防盗链，带本地 Referer 时返回的不是 JPG，浏览器无法解码
- 修复：
  - `db/server.js` 新增 `/api/pic?url=` 代理，由服务端取图后回传
  - `poems.html` 的 `img.src` 改为走该代理并做 URL 编码
- 复测：4 个 img 的 `naturalWidth` 均为 320，截图可见真实图片，控制台无报错

### 6. 任务三 thumbs 缩略图联动

- `#wySwThumbNav` 共 6 张缩略图，第一个带 `swiper-slide-thumb-active`
- 点击第 4 张缩略图后，`#wySwThumbMain` 的 `activeIndex` 变为 3
- 截图确认主图为「奋斗者号」，缩略图金色边框同步，无报错

### 7. 第 8 个按钮（初版 grid）

- 标题已改为「八种效果随心换」，按钮共 8 个
- grid 模式下容器被撑到 898px、单张 slide 约 193px，与预期 132px 不符
- 原因：Swiper grid 注入 `height: calc(50% - 5px)`，容器未设确定高度
- 后续按需求把第 8 种改为 thumbs，grid 方案整体移除

### 8. 第 8 个按钮改为 thumbs

- 浏览器自动化环境连续 3 次返回「不支持子代理隔离」，无法运行时验证
- 改用静态检查：
  - 无 `data-fx="grid"` / `wy-grid-mode` 残留
  - `id="wySw4ThumbNav"` 全页唯一
  - 脚本 `node --check` 语法检查通过
- 线上内容校验：含「八种效果随心换」「data-fx="thumbs"」「id="wySw4ThumbNav"」

---

## 三、其他修复记录

### 网格撑爆导致图片不显示

- 现象：任务一两轮对照区的小轮播只剩一条蓝色渐变
- 原因：`.wy-cmp` 使用 `grid-template-columns: 1fr 1fr`，网格项默认 `min-width: auto`，
  内容把列撑开后 Swiper 把 slide 内联宽度算成 2236 万像素
- 修复：
  - `.wy-cmp` 改为 `minmax(0, 1fr) minmax(0, 1fr)`
  - `.wy-cmp-card` 加 `min-width: 0; overflow: hidden`
  - 小轮播限定 `width: 100%; max-width: 100%`
  - 两个小轮播加 `observer / observeParents / resizeObserver`
- 复测：卡片宽度回到 337px，slide 与容器宽度一致，图片正常显示

---

## 四、发布记录

| 提交 | 内容 |
| --- | --- |
| `d0def21` | 首页替换为影视排行榜页面 |
| `636e58d` | CSS 类名、id、JS 变量统一 wy 前缀 |
| `d5e554e` | 新增 swiper-task.html |
| `d7c9351` | 首页覆盖为 Swiper 作业页 |
| `6176feb` | 完成任务一 / 二 / 三加分项 |
| `7e8a1fe` | 任务一新增 wy-prompt 两轮对照 |
| `3c18413` | 两轮对照并入任务一区块内部 |
| `3ac22f3` | 修复对照区小轮播被网格撑爆 |
| `3565f55` | 任务三新增 thumbs 缩略图联动 |
| `131025a` | 任务四改为八种效果，第 8 种接入 thumbs |
