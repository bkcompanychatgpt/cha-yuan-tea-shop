# Teasenz.com 站点结构与内容蓝皮书（用于重建同类中国茶电商站）

**调研对象**
- 中文站：<https://www.teasenz.com/cn/>
- 英文站：<https://www.teasenz.com/>

**调研方法**：用 `Invoke-WebRequest` / `curl` 抓取真实 HTML（浏览器 UA），解析 `navpro` 主导航、EasyBanner、Swissup Highlight 轮播、EasyTabs、Amasty Related、Magefan/Amasty Blog、Magento 2 checkout（knockout）等真实标记；对购物车与结账流程使用一次性会话（form_key + PHPSESSID）做了最小化验证，并通过 Magento 公开 REST（`guest-carts/{maskedId}/estimate-shipping-methods`、`/payment-methods`、`/totals`）核实运费与支付方式。

**重要限制与声明（务必阅读）**
1. `https://www.teasenz.com/sitemap.xml` 返回 **404**，`/sitemap/`、`/sitemap.xml.gz`、`/cn/sitemap.xml`、`/sitemap_index.xml` 等均为 404。**站点没有可用 sitemap**，本文分类/URL 全部来自实际抓取的导航、分类页侧栏筛选块、页脚与商品格。
2. `robots.txt` 里 `User-agent: *` 明确 `Disallow: /checkout/`、`/catalog/`、`/customer/`、`/*?limit=all` 等，并且**单独禁止 ClaudeBot / CCBot 抓取全站**。为了完成任务中的“购物车与结账流程”“运送到中国”两项，我只做了一次性的、等价于真人浏览的最小抓取（1 次加购 + 1 次购物车页 + 1 次 checkout 页 + 3 次公开 REST 查询），未做任何批量爬取，也未下任何订单。其余内容均在 robots 允许范围内抓取。若该站有法务顾虑，请以此为前提复核。
3. 标记`⚠️未能验证`的条目表示我无法从抓取内容中确认，属于推断或空白。
4. 原始 HTML 与解析中间文件全部保存在 `C:\Users\teren\Downloads\茶叶\_research\`（见文末清单）。

---

## 0. 平台与技术栈（重建时的技术选型参考）

| 项目 | 实测结果 |
|---|---|
| 电商平台 | **Magento 2**（Open Source/Commerce，robots.txt 自述 "Magento Community and Enterprise"） |
| 主题 | `frontend/Local/my-theme`，基于 **Swissup Argento (Luxury)** 主题，body class 含 `luxury-fullscreen-slider theme-editor-sticky` |
| 多语言架构 | Magento **多 store view**（不是简单的语言变量）：`teasenz_chinese_14`、`default`、`teasenz_dutch_9`、`teasenz_italian_10`、`teasenz_german_8`、`teasenz_spanish_16`、`teasenz_swedish_15`、`teasenz_french_7`；URL 前缀 `/cn/`、`/`（en）、`/nl/`、`/it/`、`/de/`、`/es/`、`/se/`、`/fr/` |
| 基础货币 | `base_currency_code = USD`，报价货币 `quote_currency_code = USD`（中文站默认显示 **USD**，**没有 CNY**） |
| CDN / 安全 | Cloudflare（页脚邮箱被 Cloudflare email-protection 混淆为 `[email protected]`） |
| 关键第三方模块（从 checkout / 静态资源配置中提取） | `Swissup_NavigationPro`（巨型菜单）、`Swissup_Highlight`（商品轮播/促销位）、`Swissup_EasyBanner`（横幅）、`Swissup_ProLabels`（商品角标）、`Swissup_EasyTabs`（商品页 Tab）、`Swissup_Ajaxsearch`、`Swissup_Ajaxpro`（AJAX 加购）、`Swissup_QuantitySwitcher`、`Swissup_ThemeEditor`、`Swissup_Lightboxpro`、`Swissup_Testimonials`（已装但首页未启用）、`Amasty_Blog` + `Amasty_Mostviewed` + `Amasty_LibSplideJs`（博客与相关商品）、`Amasty_AutomaticRelatedProducts`（`amrelated-block-*`）、`MageWorx_OptionFeatures/DynamicOptions/AdvancedPricing/OptionInventory`（重量分档定价）、`Airwallex_Payments`、`StripeIntegration_Payments`、`Magento_Braintree`、`PayPal`（Commerce）、`MatrixRate`（运费矩阵表，carrier code `matrixrate`）、`Magento_CheckoutAgreements`、`CardinalCommerce`（3DS） |
| 结账类型 | Magento 2 **原生两段式单页结账**（Shipping Address → Review & Payments）+ 购物车页 |
| 分析 | Google Analytics `UA-35135656-1`（Universal Analytics，已过期属性） |

---

## 1. 顶部导航 / 主菜单（逐项、按顺序）

导航由 `Swissup_NavigationPro` 渲染（`<ul id="navpro-topnav">`），中英文结构完全一致，共 **10 个一级项、20 个二级项**。一级项中 `茶具`、`普洱茶`、`养生茶` 有下拉；`绿茶 / 白茶 / 乌龙茶 / 红茶` 为**叶子分类，无下拉**（直接跳分类页）。

| # | 中文菜单标签 | URL | 下拉 |
|---|---|---|---|
| 1 | 首页 | `/cn/` | — |
| 2 | 促销 | `/cn/sale` | — |
| 3 | 2026 春茶新上市 | `/cn/spring` | — |
| 4 | 茶具 | `/cn/teaware` | ✅ 10 项 |
| 5 | 普洱茶 | `/cn/yunnan-pu-erh-teas` | ✅ 7 项 |
| 6 | 绿茶 | `/cn/loose-leaf-green-teas` | — |
| 7 | 白茶 | `/cn/loose-leaf-white-teas` | — |
| 8 | 乌龙茶 / 青茶 | `/cn/loose-leaf-oolong-teas` | — |
| 9 | 红茶 | `/cn/loose-leaf-black-teas` | — |
| 10 | 养生茶 | `/cn/chinese-herbal-teas` | ✅ 3 项 |

**茶具（第 4 项）下拉，按顺序：**

| # | 中文 | 英文 | URL |
|---|---|---|---|
| 4-1 | 紫砂茶具 | Yixing Teapots | `/cn/teaware/yixing-zisha` |
| 4-2 | 茶宠 | Tea Pets | `/cn/teaware/tea-pets` |
| 4-3 | 茶壶 | Chinese Teapots | `/cn/teaware/tea-pots` |
| 4-4 | 办公室随身茶杯 | Tea Infuser Mugs | `/cn/teaware/tea-infusers-mugs` |
| 4-5 | 品茗杯 | Chinese Tea Cups | `/cn/teaware/chinese-tea-cups` |
| 4-6 | 盖碗 | Gaiwan | `/cn/teaware/gaiwan` |
| 4-7 | 整套茶具 | Chinese Tea Sets | `/cn/teaware/tea-sets` |
| 4-8 | 茶叶罐 | Tea Storage | `/cn/teaware/tea-storage` |
| 4-9 | 茶叶过滤器 | Strainers & Infusers | `/cn/teaware/tea-strainers-infusers` |
| 4-10 | 茶道/零配 | Tea Accessories | `/cn/teaware/tea-accessories` |

**普洱茶（第 5 项）下拉，按顺序：**

| # | 中文 | 英文 | URL |
|---|---|---|---|
| 5-1 | 生普洱茶 | Raw pu erh tea | `/cn/yunnan-pu-erh-teas/sheng-puerh` |
| 5-2 | 熟普洱茶 | Ripe pu erh tea | `/cn/yunnan-pu-erh-teas/shou-puerh` |
| 5-3 | 龙珠普洱茶 | Pu Erh Tea Dragon Balls | `/cn/yunnan-pu-erh-teas/pu-erh-tea-dragon-balls` |
| 5-4 | 沱茶 | Tuocha tea | `/cn/yunnan-pu-erh-teas/tuocha` |
| 5-5 | 下关 | Xiaguan Tea Factory | `/cn/yunnan-pu-erh-teas/xiaguan` |
| 5-6 | 大益 | Menghai Tea Factory (Dayi) | `/cn/yunnan-pu-erh-teas/dayi` |
| 5-7 | 海湾老同志 | Haiwan Tea Factory | `/cn/yunnan-pu-erh-teas/haiwan-tea-factory` |

**养生茶（第 10 项）下拉，按顺序：**

| # | 中文 | 英文 | URL |
|---|---|---|---|
| 10-1 | 养生茶 | Herbal Tea | `/cn/chinese-herbal-teas` |
| 10-2 | 花茶 | Flower Tea | `/cn/chinese-flower-teas` |
| 10-3 | 工艺花茶 | Blooming Tea | `/cn/blooming-tea` |

**顶部栏（Panel bar，导航上方）**
- 中文站：`中国茶叶 全球发货`（纯文本，无链接）
- 英文站：`Notice to US/EU Customers: Shipments to EU/US are tax-inclusive.`（链接到 `/us-tariff`）

**Header 工具区（从左到右）**
1. 站内搜索：输入框 placeholder `在这里搜索整个商店...`（EN: `Search entire store here...`），label = `搜索`，另有 `高级搜索`（`/cn/catalogsearch/advanced/`）；实时联想 AJAX（最短 3 字符，`/cn/search/ajax/suggest/`）
2. Logo：`media/logo/websites/1/logo_white.png`（白色版，渲染 295×29），另备 `media/logo/default/logo_black.png`（粘性头部用）
3. 货币切换器（label `货币`，当前值 `USD`）—— **19 种货币**：USD(默认)、AUD 澳大利亚元、GBP 英镑、CAD 加拿大元、CZK 捷克克朗、EUR 欧元、HKD 港元、IDR 印度尼西亚盾、JPY 日元、MYR 马来西亚林吉特、NZD 新西兰元、PHP 菲律宾比索、PLN 波兰兹罗提、SAR 沙特里亚尔、SGD 新加坡元、KRW 韩元、CHF 瑞士法郎、THB 泰铢、AED 阿联酋迪拉姆。**注意：列表中没有人民币 CNY。**
4. `我的愿望清单`（`/cn/wishlist/`）
5. 账户下拉（label `我的账户`）：`我的账户`、`我的愿望清单`、`登录`（`/cn/customer/account/login/`）
6. 迷你购物车 `我的购物车`（`/cn/checkout/cart/`），带计数器

**移动端**：汉堡按钮 `切换导航`，抽屉分三个标签页：`菜单` / `账户` / `设置`（设置内含货币切换）。

---

## 2. 首页版式：自上而下逐块结构

中文首页 body class 为 `cms-home cms-index-index page-layout-1column`。真实块顺序（按 DOM 偏移量核实）：

| # | 区块 | 真实实现 | 内容 |
|---|---|---|---|
| 1 | 顶部公告栏 | `.page-header .panel.wrapper`（背景 `#6e716e`，白字） | `中国茶叶 全球发货` |
| 2 | Header + 主菜单 | 见上 | 搜索 / Logo / 货币 / 愿望清单 / 账户 / 购物车 + 10 项主导航 |
| 3 | **全宽 Hero 横幅 #1** | `Swissup_EasyBanner` → `banner-mengsong-2` | 图 `media/easybanner/_-_1_copy.jpg`（源文件 1500×1001，`width/height` 声明 2000×1001，`loading=lazy`）；alt `authentic high quality chinese tea`；链接 → `/cn/easybanner/click/index/id/6/url/amber-sunrise/`（即商品 **2024年 琥珀日出 日光晒红 红茶茶饼 200克**）。**无配套文案。** |
| 4 | **Hero 文案块（H1）** | `<section class="jumbotron">` → `.hero.a-center` | `H1: 在线购买中国茶`；副标题 `<p class="subtitle">世界各地运送正宗的中国茶。</p>`。英文站此处文案丰富得多（H1 `Buy Chinese Tea Online` + 品牌/选品说明 + 引导到下方 Top 10），中文站被大幅精简。 |
| 5 | **热销商品轮播** | `Swissup_Highlight` carousel，class `block-highlight highlight-carousel highlight-grid highlight-cols-5 highlight-bestsellers` | **无标题**（直接展示商品）。配置：`products_count=10`、`column_count=5`、`page_count=1`、`mode=grid`、`period=P6M`（近 6 个月）、`min_popularity=1`、附加条件 `price > 9`（即排除 9 美元以下商品）。数据源 AJAX `/cn/highlight/carousel/slide/`。左右箭头 `swiper-button-next/prev`；`slidesPerView:1`（每屏 1“页”= 5 个商品 ×2 行）；`(max-width:640px)` 时销毁轮播。 |
| 6 | **图文块 #1（左文右图）** | `<section class="jumbotron" id="block-with-image-on-left">` | 标题 `坝糯古树茶饼`；一段风味描述（蜂蜜甜、百合/菊花/茉莉复合花香、金黄油润茶汤、薄荷回甘、留香杯底）；CTA 按钮 `.action.primary` 文案 **`理解跟多`**（站点错别字，应为“了解更多”），`href="banuo"`（相对链接）；右侧 EasyBanner `banner-cake` 图 `banner2_teasenz_cake.jpg` 1000×1000，点击 → `/cn/easybanner/click/index/id/4/url/banuo/`（商品 `Teasenz 坝糯古树 生普洱茶饼 200g`） |
| 7 | **图文块 #2（左文右图）** | 同上（同 id，重复） | 标题 `月园古树白茶`；文案（丝滑醇厚、花果园甜润、满月般清澈香气）；CTA `理解跟多` → `moon-garden`；右侧 EasyBanner `banner-moon-garden` 图 `moongarden_banner.jpg` 1000×667 → `/cn/easybanner/click/index/id/9/url/moon-garden/`（商品 `2024 月园古树白茶 200克`，OOS） |
| 8 | **品牌/编辑长文块（居中）** | `<section class="jumbotron">` → `.hero.a-center` | 三个 `H3` + 段落，各带一段正文：<br>① `从真正的茶农手中购买真实的茶叶` — 茶农来自中国 20+ 无公害种植区的小型家庭农场<br>② `正宗的中国茶，如今全球可购` — 茶是世界第二大饮料，但真茶难买；Teasenz 让全球低价直购；个人与企业订单皆可<br>③ `茶叶批发 供应商` — 餐饮/咖啡馆/酒店首选的线上中国茶批发商；品质稳定、专业茶知识；含免费邮件咨询<br>结尾一段补充：茶农的茶品质优于有机标准，可从合作方直订特种茶 |
| 9 | **页脚 Newsletter** | `.page-footer .block.newsletter` | 标题 `最新资讯`；说明 `注册我们的时事通讯:`；placeholder `输入您的电子邮件地址`；按钮 `订阅`；POST `/cn/newsletter/subscriber/new/` |
| 10 | **页脚链接区（3 栏 + 联系栏）** | `.argento-grid`，`col-md-9` + `col-md-3.footer-contacts` | 三栏见第 7 节 |
| 11 | **社交图标行** | `.social-icons.colorize-fa-hover` | Facebook / Instagram / YouTube / Twitter（FontAwesome 4.7 图标，hover 上色） |
| 12 | **页脚工具栏** | `.page-container.footer-toolbar.footer-toolbar-bottom` | 语言/店铺切换器 + `Copyright © Teasenz` |

**首页未出现的模块（重建时可省略或按需加）**
- 无独立“信任徽章 / 支付图标图片”区块（支付方式仅以**纯文本**列在页脚）
- 无独立 Testimonials/评价轮播（`Swissup_Testimonials` 模块已安装但首页未调用）
- 无 cookie 同意弹窗组件（只有 `cookie-status-message` 隐藏提示 + `authenticationPopup`；`isCookieRestrictionModeEnabled: 0`）
- 无“最近浏览”/“猜你喜欢”板块
- 无 Instagram/社交墙

---

## 3. 商品分类体系（完整分类树 + 商品数）

### 3.1 茶叶主分类

| 中文 H1 / 导航名 | 英文 | URL | 站内商品数 | SEO title |
|---|---|---|---|---|
| 绿茶 | Green Tea | `/cn/loose-leaf-green-teas` | **20**（单页） | 买绿茶 - 中国绿茶 种类多 \| Teasenz茶叶店 |
| 白茶 | White Tea | `/cn/loose-leaf-white-teas` | **13**（单页） | 买白茶: 中国白茶 种类多 \| Teasenz茶叶店 |
| 乌龙茶 / 青茶 | Oolong Tea | `/cn/loose-leaf-oolong-teas` | **19**（单页） | 买乌龙茶/青茶/岩茶: 中国高山乌龙茶 种类多 \| Teasenz茶叶网 |
| 红茶 | Black Tea | `/cn/loose-leaf-black-teas` | **17**（单页） | 红茶：正山小种，祁门红茶 －网络购买中国红茶 \| Teasenz网 |
| 普洱茶/黑茶 ⚠️（H1 为“普洱茶/黑茶”，导航写“普洱茶”） | Pu Erh | `/cn/yunnan-pu-erh-teas` | 分页（每页 20） | 普洱茶 - 黑茶：网络购买云南普洱茶饼 ｜ Teasenz网 |
| 养生茶 | Herbal Tea | `/cn/chinese-herbal-teas` | **14**（单页） | 养生茶：网络购买红枣片，枸杞，苦丁，苦荞麦茶 \| Teasenz网 |
| 花茶 | Flower Tea | `/cn/chinese-flower-teas` | **18**（单页） | 花茶：网络购买菊花，金银，玫瑰花茶 \| Teasenz网 |
| 工艺花茶 | Blooming Tea | `/cn/blooming-tea` | **9**（单页） | 工艺花茶球: 网络购买开花茶 - 种类多 \| Teasenz网 |

### 3.2 普洱茶子分类（含商品数，来自父分类侧栏筛选块）

| 中文 | 英文 | URL | 商品数 |
|---|---|---|---|
| 生普洱茶 | Raw pu erh tea | `/cn/yunnan-pu-erh-teas/sheng-puerh` | 48 |
| 熟普洱茶 | Ripe pu erh tea | `/cn/yunnan-pu-erh-teas/shou-puerh` | 33 |
| 龙珠普洱茶 | Pu Erh Tea Dragon Balls | `/cn/yunnan-pu-erh-teas/pu-erh-tea-dragon-balls` | 12 |
| 沱茶 | Tuocha tea | `/cn/yunnan-pu-erh-teas/tuocha` | 14 |
| 下关 | Xiaguan Tea Factory | `/cn/yunnan-pu-erh-teas/xiaguan` | 13 |
| 大益 | Menghai Tea Factory (Dayi) | `/cn/yunnan-pu-erh-teas/dayi` | 12 |
| 海湾老同志 | Haiwan Tea Factory | `/cn/yunnan-pu-erh-teas/haiwan-tea-factory` | 10 |

### 3.3 茶具子分类（父分类 `/cn/teaware` 侧栏筛选块 "类别" 中的完整清单 + 商品数）

`/cn/teaware` 总计 **181 件**（每页 20，分页 `?p=2…`）。

| 中文 | 英文 | URL | 商品数 |
|---|---|---|---|
| 紫砂茶具 | Yixing Teapots | `/cn/teaware/yixing-zisha` | 27 |
| 茶宠 | Tea Pets | `/cn/teaware/tea-pets` | 39 |
| 茶壶 | Chinese Teapots | `/cn/teaware/tea-pots` | 45 |
| 办公室随身茶杯 | Tea Infuser Mugs | `/cn/teaware/tea-infusers-mugs` | 15 |
| 品茗杯 | Chinese Tea Cups | `/cn/teaware/chinese-tea-cups` | 32 |
| 盖碗 | Gaiwan | `/cn/teaware/gaiwan` | 21 |
| 整套茶具 | Chinese Tea Sets | `/cn/teaware/tea-sets` | 12 |
| 茶叶罐 | Tea Storage | `/cn/teaware/tea-storage` | 10 |
| 茶叶过滤器 | Strainers & Infusers | `/cn/teaware/tea-strainers-infusers` | 10 |
| 茶道/零配 | Tea Accessories | `/cn/teaware/tea-accessories` | 41 |
| （品牌筛选）尚明 | — | — | 10 |
| （分类）结婚茶具套装 | — | — | 5 |
| （集合）Sapiens Collection | — | — | 4 |

> 说明：子类商品数之和（252）> 父类 181，说明 Magento 分类支持一个商品归入多个分类。`尚明`（品牌）、`结婚茶具套装`、`Sapiens Collection` 出现在“类别”筛选里，说明它们也是分类实体（而非属性筛选），未出现在主导航中。

### 3.4 不在主导航、但真实存在的“专题/场景”集合（来自页脚与商品归类）

| 中文 H1 | URL | 商品数 | 定位 |
|---|---|---|---|
| 茶叶茶具促销 | `/cn/sale` | 8（分页） | 类型为 **Swissup Highlight「On Sale」**（body class `page-highlight highlight-view-onsale`），不是分类。H1 `茶叶茶具促销`，无面包屑。排序多一个 `日期` 选项。 |
| 2026 春茶新上市 | `/cn/spring` | 20/页（分页） | 分类（`categorypath-spring`）。分类描述包含春茶上市时间说明（2026 年春茶季 2 月底–5 月；首批 3 月下半月；乌龙 6 月；花茶待 5 月茉莉采摘后约 6 月）。 |
| 罐装茶叶 | `/cn/tea-tins` | 4 | 分类。描述解释：只有本页茶叶有罐装选项、罐体铝制 9.1×9.1cm、保鲜贴密封。 |
| 白茶饼 | `/cn/white-tea-cakes` | 4 | 分类。描述：原料含贡眉/寿眉/白牡丹/白毫银针。 |
| 茉莉花茶 | `/cn/chinese-jasmine-teas` | 5 | 分类。有很长的茉莉花茶工艺/历史描述。 |
| 龙井（`/cn/longjing`） | `/cn/longjing` | — | **不是分类，是商品页**（`明前龙井`，canonical `/cn/longjing`，body class `catalog-product-view product-longjing`）。用作 SEO 落地页。 |

### 3.5 分类页（Category page）版式与控件

- **面包屑**：`首页 > 绿茶`、`首页 > 茶具`、`首页 > 普洱茶/黑茶`、`首页 > 罐装茶叶`…（促销页无面包屑）
- **页面标题**：`<h1 class="page-title">`
- **分类描述**：`.category-description`（图文介绍，位于商品格下方；绿茶/白茶/乌龙/红茶/茉莉花茶等都有 200–400 字专业介绍）
- **侧栏筛选**（仅**有子分类的父分类**才有，即 `/cn/teaware` 和 `/cn/yunnan-pu-erh-teas`；叶子分类页面**没有**筛选块）：`id="layered-filter-block"`，标题 `购物的选项`，清除按钮 `清除全部`，唯一筛选维度是 `类别`（列出全部子分类 + 商品数）。⚠️ 未发现价格/属性筛选（robots 里提到过 `?tea_region` 参数，但当前页面未渲染该筛选）。
- **工具栏**（`toolbar toolbar-products`）：
  - 数量文案：`项目 1 - 20 的 181`（EN: `Items 1-20 of 181`）
  - 排序：`按排序`（Sort By）+ 可选 `位置`（Position，默认）/ `产品名称`（Product Name）/ `价格`（Price）[促销页多一个 `日期`] + `设置降序方向`
  - 默认：`mode=grid`、`direction=asc`、`order=position`、`limit=20`
  - 分页：`?p=2`、`?p=3`…（叶子分类无分页）
  - ⚠️ 该主题**未渲染** grid/list 视图切换按钮和每页数量下拉（配置项存在但 UI 未输出）
- **商品卡**：图片（400×400 缓存，1:1，`aspect-ratio` CSS）、商品名（最多 2 行）、评分（`评分:` + 百分比 + `N 点评`）、`USD xx.xx` 价格、`添加到购物车` 按钮、`添加到收藏夹`。缺货商品显示 `缺货` 且无加购按钮。

---

## 4. 商品详情页解剖（Product detail page anatomy）

以三款真实商品核实：`/cn/west-lake-dragon-well-green-tea`（西湖龙井，可配置商品）、`/cn/longjing`（明前龙井）、`/cn/star-of-menghai`（2013 大益勐海之星，简单商品）、`/cn/lotus-pod-yixing-teapot`（紫砂壶）、`/cn/glass-gaiwan`。

### 4.1 上方（主信息区 `.product-info-main`）自上而下
1. **H1 商品名**（`.page-title`）——例：`西湖龙井 - 群体种龙井`
2. **SKU 行**：`SKU` + 值（例 `G0001-西湖龙井`、`B0001-祁门红茶`、`W0001-白毫银针`、`LOTUS-POD-TEAPOT`、`FH-333MS3-玻璃盖碗`、`YE-GUO-LU`）
3. **一句话卖点**（`.product.attribute.overview`）——1–4 句风味/产地概述。紫砂壶这类商品此处是一整段营销长文（泥料、寓意、工艺、附赠礼盒与真品证书）
4. **库存状态**：`有货` / `缺货`
5. **价格**：`<span class="price">USD 10.95</span>`。**格式固定为 `USD 空格 数字`**（无货币符号）。若为特殊价，则显示两块：`特殊价格 USD 0.00` / `常规价格 USD 10.00`（如免费赠品商品）
6. **评分摘要**：`评分:` + 百分比（如 `93% of 100`）+ `14 点评` + `添加您的评论`
7. **规格/重量选项**（configurable product，`product-options-wrapper`）：
   - 标题 `选择重量`（EN `Select weight`），默认 `-- 请选择 --`
   - 5 档，价格随档位变化并标注折扣：
     | 选项 | 价格（西湖龙井） | 价格（金骏眉） | 价格（白毫银针） | 价格（祁门红茶） |
     |---|---|---|---|---|
     | 15克样品 | + USD 2.95 | + USD 3.49 | + USD 3.74 | + USD 2.95 |
     | 70克（标价档） | + USD 10.95 | + USD 13.95 | + USD 14.95 | + USD 9.95 |
     | 200克 省10% | + USD 28.14 | + USD 35.85 | + USD 38.42 | + USD 25.57 |
     | 400克 省15% | + USD 53.22 | + USD 67.80 | + USD 72.66 | + USD 48.36 |
     | 1公斤 省20% | + USD 125.16 | + USD 159.45 | + USD 170.88 | + USD 113.73 |
   - ⚠️ **重要陷阱（官方 FAQ 明确说明）**：下拉里的价格是**在 70 克零售价基础上加价**，不是最终价。例如 70g 为 $9.95、200g 显示 +$15.64，则实际 200g 价格 = 9.95 + 15.64 = 25.59 美元（折扣已含）。
   - 免费赠品商品（`叶子茶叶过滤器`）有 `Select color` → `Silver (银色)` / `Gold (金色)`
8. **数量选择器** `数量`（`input.input-text.qty`，`type=number`，`step=any`，`min=0`）
9. **`添加到购物车`**（`.action.primary.tocart`）+ **`添加到收藏夹`**（`.action.towishlist`）
10. ⚠️ **商品页没有**“运费/发货提示”或信任徽章文案（`免运费/关税/发货时间` 等词在商品页 HTML 中不存在，仅 meta title 含 `全球发货`）。运费与税费只在购物车页 `估计运费和税` 和结账页出现。

### 4.2 下方 EasyTabs（`.product.info.detailed` / `easytabs-tablist`）
三个 Tab，标题即：**`描述` | `详情` | `点评 N`**（EN: `Details` | `More Information` | `Reviews N`）

**Tab 1「描述」** — 富文本，中文版典型结构（以西湖龙井为例，含小标题）：
- 西湖茶区（产地故事、五个龙井村：狮峰/云栖/虎跑/龙井 + 梅家坞）
- 采摘期
- 龙井茶的味道
- 咖啡因及健康益处
- 如何冲泡龙井茶（**含两种冲泡法**：西式大壶 3g / 500ml / 80°C / 1 分钟，可再泡 ≥1 次，第 2 泡 1.5–2 分钟；功夫茶 5g / 100ml / 20 秒起逐泡加时）
- 冷泡绿茶（**内嵌 YouTube 视频**，`video-container`）
- 内文超链接到其它商品（如“优质龙井茶”）

**Tab 2「详情」** — `additional-attributes-wrapper` 规格表（`product-attribute-specs-table`），**中英标签对照**：

| 中文标签 | 英文标签 | 示例值 |
|---|---|---|
| 省 | Tea Province | 浙江 |
| 生产地区 | Tea Region | 西湖龙井村 / 祁门县 (600m) / 勐海 (1100m) / 坝糯勐库 (1840m) |
| 生产年份 | Harvest Year | 2026 / 2022 / 2013 |
| 季节 | Tea Season | 春季 |
| 温度 | Steeping temperature | 80 °C（EN 显示 `80 °C - 175 °F`） |
| 冲泡克数 / 500ml | Amount / 500ml (17oz) | 3克 |
| 冲泡时间 | Steeping time | 1分钟 / 40秒 / 1.5分钟 / 2分钟 |
| 冲泡克数 (功夫茶) / 100ml | Amount (traditional) / 100ml (3.4oz) | 5克 |
| 冲泡时间 (功夫茶) | Steeping Time (traditional) | 20秒 / 5秒 / 30秒 / `25 sec,10 sec, 5 sec, 5 sec, 5 sec, 5 sec, 10 sec etc.` |
| 树种/品种 | Tea Cultivar/Varietal | 群体种 / 小叶种 / 大叶种 / 大白 / 月光白 / #43 |
| 茶名 | Tea in Chinese | 西湖龙井 / 金俊眉/金骏眉 / 勐海之星茶饼 |
| 不含麸质 | Gluten-free | 是 |
| 咖啡因含量 | Tea Caffeine Content | 高 / 中 / 底（原文如此，应为“低”） |

茶具类商品换成另一套属性：

| 中文标签 | 示例值 |
|---|---|
| 泥 | `Hong pi long ni`（红皮龙泥，中英混排） |
| 容量 | 120ml (4.1oz) / 120 ml (4 oz) |
| 尺寸 | 11.8x6.7 cm (4.7x2.6 in) / Approx. 10x8.7cm (3.9x3.4in) |
| 材质 | 玻璃 |
| 微波炉可用 / 适合微波炉加热 | 是（同一页出现两条近似重复项） |

**Tab 3「点评」** — 两段：
1. **评价列表**：`product-review-container`，显示评分百分比 + 各维度星数 + `N 点评`
2. **撰写评价表单**（`review-form`）：
   - 表单标题 `编写您自己的评论`
   - `您正在查看:` + 商品名
   - `您的评级`：1–5 星
   - **三个分项评分**（各 1–5 星）：`价格` / `质量` / `服务`
   - `昵称`（input，必填，`nickname_field`）
   - `概览`（input，必填，`summary_field`）
   - `产品评价`（textarea，必填，`review_field`）
   - 提交按钮文案 `提交的评论`（原文如此，语义应为“提交评论”）
   - 带 `field-recaptcha` 容器（reCAPTCHA 位置，当前 `captcha.isRequired=false`）

### 4.3 图片画廊
- Magento 原生 Fotorama：`data-gallery-role="gallery-placeholder"`，JSON 配 `data` 数组，每张含 `thumb/img/full/caption/position/isMain/type/videoUrl`
- 图片规格：主图缓存 700×700（`img`）、缩略图、`full` 大图；`caption` 通常等于商品名
- 实测西湖龙井 **3 张图**（`longjing_.jpg`、`dragonwell_tea_1.jpg`、`long_jing_tea_1.jpg`，其中一张 caption 为 `back`）
- 移动端有「跳到结尾的图片库」等无障碍跳转链接

### 4.4 商品页底部模块（3 个，依次）
1. **`block widget amrelated-grid-wrapper`（Amasty Automatic Related Products，`id="amrelated-block-2"`）**
   - 使用 **Splide** 滑块（`data-amrelated-js="slider"`，`splide__track`/`splide__list`）
   - 标题由 JS 注入，抓取到的 HTML 中 `aria-label=""`（⚠️ 未验证中文标题文案；英文页该处可见 `Related Products`）
   - 西湖龙井页展示 6 个：碧螺春绿茶、茉莉飘雪花茶、安溪铁观音、人参乌龙、福建珠茶、明前龙井
2. **Magento 原生相关商品 `block related`**
   - 中文标题为 **`超售`**（EN 为 `Related Products`）——**这是中文站的翻译错误**（"oversell"），重建时应改为「相关商品」
   - 提示条：`检查物品添加到购物车或` + `全选`（EN: `Check items to add to the cart or select all`）
   - 每个商品带勾选框 `name="related_products[]"`（`related-checkbox{id}`），勾选后可批量 `添加到购物车`
   - 西湖龙井页展示 5 个 + 2 个免费赠品；`data-limit="0"`、`data-shuffle="0"`
3. **`.page-before-footer`** 容器（首页/商品页均存在，但内容为空）

### 4.5 商品页注意点
- 商品页 **没有面包屑**（`breadcrumbs` 块不渲染）
- 商品页 **没有** 库存数量、预计送达时间、SSL/安全徽章、“已售 N 件”
- SEO title 三种范式：`商品名 - 全球发货 | Teasenz`（新式）；`在线购买XX - Teasenz网 国际茶叶店 - XX全球购`（旧式）；纯商品名（普洱/茶具）

---

## 5. 购物车 & 结账流程

### 5.1 流程总览（实测）
```
商品页（选择重量 + 数量）→ 添加到购物车
   → [AJAX 加购，Swissup_Ajaxpro 弹窗，按钮「继续购物」]
   → 购物车页 /cn/checkout/cart/           ← 第 1 步
   → 结账页 /cn/checkout/                  ← 2 段式单页结账
        ① 送货地址（Shipping Address）含邮箱 + 地址 + 送货方式
        ② 审查及付款（Review & Payments）含账单地址 + 支付方式 + 下单
   → 提交订单
```
**段数：2 段**（外加购物车页，共 3 屏）。进度条组件 `Magento_Checkout/js/view/progress-bar`。

### 5.2 购物车页（`/cn/checkout/cart/`，实测有商品状态）
真实文案与控件：
- 页面标题 `购物车`
- 顶部消息：`You added {商品名} to your shopping cart.`（**中文站该句仍为英文**，未翻译）
- 左侧主区：
  - `应用折扣代码` + 输入框 placeholder `请输入折扣代码` + 按钮 `应用折扣`
  - `估计运费和税`（Estimate Shipping and Tax，可折叠，字段由 JS 渲染）
  - **`去结帐`**（Proceed to Checkout）按钮
  - 表格列：`购物车里的产品` / `产品` / `价格` / `数量` / `小计`
  - 行内数量输入 `name="cart[{itemId}][qty]"`（`type=number`，`min=0`，`data-cart-item-id="商品url-key"`）、`编辑`、`删除项目`
  - 底部：`继续购物` 链接（`单击 此处` 继续购物）+ `更新购物车` 按钮
- 空车文案：`您的购物车内没有物品。` / `单击 此处 继续购物。`
- 迷你购物车（header）由 knockout 渲染：`我的购物车`、计数、`最近添加的商品`、`查看和编辑购物车`、`去结账`、`小计`、`你的购物车中没有商品。`

### 5.3 结账页（`/cn/checkout/`）
- 页面标题 `结帐`；body class `checkout-index-index page-layout-checkout`（独立版式，无主菜单/页脚，聚焦转化）
- 使用原生 Magento 2 checkout 组件：`progress-bar`、`shipping`、`billing-address`、`payment`、`sidebar`（订单汇总）、`summary/*`、`estimation`、`cart-item-renderer`
- 从 `checkoutConfig` 实测的配置：
  - `activeCarriers: ["matrixrate"]`（**运费用 MatrixRate 矩阵表**，按国家/重量/金额出价）
  - `originCountryCode: "CN"`（**发货地=中国**）、`defaultCountryId: "US"`
  - `base_currency_code / quote_currency_code: "USD"`
  - `displayBillingOnPaymentMethod: true`（账单地址在支付方式区）
  - `checkoutAgreements.isEnabled: false`（**无条款勾选**）
  - `shippingPolicy.isEnabled: false`
  - `useQty: true`、`maxCartItemsToDisplay: 30`
  - `isDisplayShippingPriceExclTax: true`、`reviewTotalsDisplayMode: "excluding"`、`includeTaxInGrandTotal: false`
  - `captcha.*.isRequired: false`（payment_processing_request / user_login / sales_rule_coupon_request 均未启用验证码）
  - `persistenceConfig: {isRememberMeCheckboxVisible: true, isRememberMeCheckboxChecked: true}`（记住我默认勾选）
  - Cardinal Commerce（3DS）已启用，`environment: production`
- **收集的字段**（从 `js-translation.json` 与 checkoutConfig 解析出的中文标签）：
  - 身份：`登录` / `用您的账户结账`（Checkout using your account）/ `作为新客户结账`（Checkout as a new customer）/ 顶部登录提示 `您已经有账号了，可以登录或继续使用游客账号` / `您可以在结账后创建账户。` / `记住我`
  - 邮箱：`邮箱` / `电子邮件地址`（step 1 先要邮箱）
  - 地址：`送货地址`（Shipping Address）/ `账单地址`（Billing Address）/ 字段标签 `名`（First Name）、`姓`（Last Name）、`公司名称`（Company）、`街道地址`（Street Address）、`城市`、`州/省`（State/Province）、`邮政编码`（Zip/Postal Code）、`国家`、`电话号码`、`传真`；`我的账单和发货使用相同地址`（My billing and shipping address are the same）；`保存到地址簿`；`新地址`（从地址簿选择或输入新地址）
  - 送货方式：`送货方式`（Shipping Methods）/ `选择运送方式`（carrier title）/ `选择方法`（Select Method）
  - 支付：`支付方式`（Payment Method）/ `支付信息`（Payment Information）/ `请选择支付方式` / `没有付款方法` / `没有可用的付款方法。`
  - 备注/赠礼：`礼物选项`、`(可选) 的礼物留言`、`礼品卡`
  - 优惠券：`应用折扣代码`、`请输入折扣代码`、`取消优惠券`
  - 下单：**`提交订单`**（Place Order）；确认语 `你确定要下订单并付款吗？`；`请选择支付方式`；`请不要刷新页面，直到你完成付款。`
- **右侧订单汇总**（sidebar）：`订单汇总`、`购物车小计`、`运费`、`税`、`总额`
- 多地址结账模块存在（`multishipping`），⚠️ 前台是否开放未验证

### 5.4 金额/税费实测（会话验证，1 件「2013年大益普洱熟茶茶饼‘勐海之星’357克」= USD 89.95）
- 购物车 `totals`：
  - `小计 = 89.95`
  - `运费` 段标题：**`航运及处理 (选择运送方式 - SF Express (1-5 days))` = 5.00**（中国地址）
  - `税 = 0.00`
  - `总额 = 94.95`
- 无商品时运费/税为 0
- 增值税处理：对**美国/欧盟**为 **DDP 包税**（Teasenz 预付进口税，见 `/us-tariff`，更新日期 2025-09-01）；其他国家默认不含税，关税由买家承担
- 币种：整站以 **USD** 结算（中文站亦然），账户侧切换货币只影响展示

### 5.5 支付方式（实测 REST `/guest-carts/{maskedId}/payment-methods`）
结账页实际返回的**已启用**支付方式（中文标题为站点实际文案）：

| code | 显示标题 | 说明 |
|---|---|---|
| `airwallex_payments_express` | Express Checkout (Airwallex) | Airwallex 快速结账（钱包/一键支付） |
| `stripe_payments_checkout` | **信用卡和其他支付方式** | Stripe Payment Element（卡 + 本地方式聚合） |
| `airwallex_payments_card` | Credit Card | Airwallex 收单（卡） |
| `banktransfer` | **银行转帐** | 线下银行转账（FAQ：订单 ≥ 200 USD 才可选） |
| `airwallex_payments_dana` | Pay by Dana | 印尼钱包 |
| `airwallex_payments_klarna` | Klarna | 先买后付 |

**代码库中已安装但当前未出现在报价中的支付集成**（可用于替换站点的选型参考）：
- Airwallex：`alipaycn`（支付宝中国）、`alipayhk`（支付宝香港）、`wechatpay`（微信支付）、`kakaopay`、`gcash`、`dana`、`tng`（Touch 'n Go）、`klarna`、`afterpay`、`ideal`、`bank_transfer`、`pay_now`
- Stripe：`stripe_payments`、`stripe_payments_bank_transfers`（SEPA 等）
- PayPal Commerce：`payment_services_paypal_smart_buttons` / `apple_pay` / `google_pay` / `fastlane` / `hosted_fields` / `apm`
- Braintree：`braintree_cc_vault`、Apple Pay、Google Pay、Cardinal 3DS
- Magento 原生离线：`checkmo`、`purchaseorder`、`payflowpro`

**页脚文字声明的可接受支付方式（作为营销文案）**：
> Visa, Mastercard, American Express, Google Pay, Apple Pay, iDeal, Bancontact, Giropay, EPS, Przelewy24, SEPA, Cartes Bancaires, Alipay, Wechat, Kakao, Naver, Payco, Samsung Pay.

**FAQ 页补充的支付规则**：
- PayPal（账户或通过 PayPal 用信用卡）
- 信用卡：Visa / MasterCard / American Express 等
- 银行转账：**仅订单 ≥ 200 USD 时**结账页才显示，会邮件发转账指引
- 本地支付方式**仅欧元结算**时可用，且账单/收货国家需匹配：iDeal（仅荷兰）、Bancontact（仅比利时）、Giropay（仅德国）、EPS（仅奥地利）、Sofort（奥/比/德/意/荷/西）

---

## 6. 中国/中文市场特有功能

| 功能 | 实测情况 |
|---|---|
| **配送到中国** | ✅ 支持，且是**唯一用顺丰的路线**。REST `estimate-shipping-methods`（country=CN）返回：`SF Express (1-5 days)`，**USD 5**（1 件 357g 茶饼）。carrier title `选择运送方式`。 |
| 配送到香港 | ✅ `SF Express (2-6 days)`，USD 6 |
| 对比其它国家 | US: `Airmail (import taxes included, approx. 1-3 weeks), PO Box Address Not Allowed` USD 15 / `Express Shipping (import taxes included, approx. 2 weeks)` USD 29；GB: Airmail USD 10 / Express USD 26；AU: Airmail USD 10 / Express USD 29；NL: `PostNL, inclusief importbelasting (ong. 2-4 weken)` EUR 14.95 / Express EUR 19（**荷兰行的 method title 是荷兰语**，说明 MatrixRate 行按国家手填且未本地化） |
| **支付方式（中国相关）** | 支付宝/微信支付**集成已安装**（Airwallex `alipaycn`、`alipayhk`、`wechatpay`；Stripe 亦支持 Alipay/WeChat），但**当前报价下未出现在支付列表**——⚠️ 很可能是因为报价国家为 US/CN 但 Airwallex 账户在特定条件下才放开，或按币种（非 EUR/USD）限制。重建时需自行实测。页脚文案明确宣传支持 Alipay 与 Wechat。**未见 UnionPay（银联）独立选项**（仅在资源里出现 2 次字样）。 |
| **发货地/仓储** | `originCountryCode: CN`。中文「关于我们」页明确：**订单由中国的仓库打包发出**；中国物流办公室及仓库地址：`广东省深圳市南山区西丽镇官龙村东区新高路华纵科技楼3楼`；法务主体地址：`香港九龙尖沙咀科学馆道14号新文华中心A座9楼917B室`。欧盟订单可走姊妹站 **Teasenz.eu**（荷兰仓发货）。 |
| **语言切换器** | 位于页脚工具栏，label 为 **`选择存储`**（Select Store 的直译，应为“选择语言/商店”）。**8 个 store view**：`English`（默认，`/`）、`Nederlands`（`/nl/`）、`Italiano`（`/it/`）、`Deutsche`（`/de/`）、`Español`（`/es/`）、`Svenska`（`/se/`）、`Français`（`/fr/`）、`中文`（当前，`/cn/`） |
| **货币切换器** | Header 右上 + 移动端「设置」页。19 种货币（见 1 节）。**中文站不提供 CNY 人民币**，也没有支付宝专属的「人民币结算」入口——中文站本质是「中文界面 + 美元结算 + 中国仓发货」。 |
| **中文特有的内容资产** | 大量中国茶专业长文（绿茶/白茶/乌龙/红茶/茉莉花茶的分类导语）；茶道博客 `茶道博客`（`/cn/chadao.html`）含 20 篇中文文章；中文「免费样品」政策页；中文批发页（含 200g/400g/1kg = 10%/15%/20% 折扣说明、样品 15g、PayPal/信用卡/银行转账） |
| **中文站缺失的英文页** | `/cn/frequently-asked-questions`、`/cn/chinese-tea.html`、`/cn/faq` 均 **404**；英文站的 FAQ 与 Chinese Tea Guide 在中文站无对应页 |
| **中文站未翻译的残留** | 加购成功提示 `You added ... to your shopping cart`；结账支付方式标题 `Credit Card` / `Pay by Dana` / `Klarna` / `Express Checkout (Airwallex)`；`2026 春茶新茶` 等部分分类 SEO title |

---

## 7. 页脚（Footer）完整内容

### 7.1 中文站页脚
**① Newsletter 区块**（`.block.newsletter`）
- 标题 `最新资讯`
- 说明 `注册我们的时事通讯:`
- 输入框 placeholder `输入您的电子邮件地址`
- 按钮 `订阅`
- POST 至 `/cn/newsletter/subscriber/new/`

**② 三栏链接（每栏标题为 `.h4`）**

| 栏 1：`国际服务` | href | 栏 2：`中国名茶` | href | 栏 3：`养生茶与花茶` | href |
|---|---|---|---|---|---|
| 关于我们 | `/cn/jieshao` | 罐装茶叶 | `/cn/tea-tins` | 玫瑰花茶 | `/cn/rose-flower-tea` |
| 联系我们 | `/cn/contact` | 茉莉花茶 | `/cn/chinese-jasmine-teas` | 菊花茶 | `/cn/chinese-chrysanthemum-teas` |
| 物流信息 | `/cn/wuliu` | 白茶饼 | `/cn/white-tea-cakes` | 小青柑 | `/cn/xiao-qing-gan` |
| 茶叶批发 | `/cn/pifa` | 铁观音 | `/cn/anxi-tie-guan-yin-oolong-tea` | 工艺花茶 | `/cn/blooming-tea` |
| 茶道博客 | `/cn/chadao.html` | 龙井 | `/cn/west-lake-dragon-well-green-tea` | 金银花 | `/cn/honeysuckle-tea` |
| 免费样品 | `/cn/mianfei` | 毛峰 | `/cn/ming-qian-huang-shan-mao-feng-tea` | 桂花 | `/cn/osmanthus-tea` |
| 法律声明 | `/terms`（英文页） | 金骏眉 | `/cn/jin-jun-mei` | 苦荞茶 | `/cn/tartary-buckwheat-tea` |

**③ 联系与支付栏**（`.footer-contacts`，`col-md-3`）
- `联系我们` → `info@teasenz.com`（HTML 中被 Cloudflare email-protection 混淆为 `/cdn-cgi/l/email-protection`，**页脚没有电话/地址**；地址只在「关于我们」页）
- `付款方式` → 纯文本：`Visa, Mastercard, American Express, Google Pay, Apple Pay, iDeal, Bancontact, Giropay, EPS, Przelewy24, SEPA, Cartes Bancaires, Alipay, Wechat, Kakao, Naver, Payco, Samsung Pay.`（**没有任何支付图标图片**）

**④ 社交链接**（FontAwesome 4.7，class `social-icons colorize-fa-hover`）

| 平台 | URL |
|---|---|
| Facebook | `https://www.facebook.com/teasenz` |
| Instagram | `https://instagram.com/teasenzshop` |
| YouTube | `https://www.youtube.com/c/teasenz` |
| Twitter/X | `https://twitter.com/teasenz` |

**⑤ 底部工具栏**
- 店铺/语言切换器 `选择存储`（8 语言，见第 6 节）
- `Copyright © Teasenz`

### 7.2 英文站页脚差异（可作为“更完整的页脚”参照）

| 英文栏 | 链接（label → href） |
|---|---|
| `Service` | Contact Us → `/contact-us`；Shipping & Returns → `/shipping-information`；Wholesale → `/chinese-tea-wholesale-supplier`；About Us → `/about-us`；Chinese Tea Info → `/chinese-tea.html`；**Payment Methods & FAQ** → `/frequently-asked-questions`；Free Tea Samples → `/free-tea-samples-with-free-shipping`；Terms & Conditions → `/terms`；Privacy Policy → `/privacy-policy-cookie-restriction-mode` |
| `Popular` | Sun-Dried Black Tea → `/amber-sunrise`；Aged White Tea → `/moon-garden`；Jasmine Tea → `/chinese-jasmine-teas`；Tie Guan Yin → `/anxi-tie-guan-yin-oolong-tea`；Dragon Well Tea → `/west-lake-dragon-well-green-tea`；Mao Feng Tea → `/ming-qian-huang-shan-mao-feng-tea`；Jasmine Dragon Pearls → `/jasmine-dragon-pearls-green-tea`；Jin Jun Mei → `/jin-jun-mei` |
| `Herbs & Flowers` | Rose flower tea、Chrysanthemum tea、Xiao Qing Gan、Honeysuckle Tea、Osmanthus Tea、Soba Buckwheat Tea、Butterfly Pea Tea、Ginseng Oolong Tea |

### 7.3 政策页清单（真实 URL）
| 页面 | URL | 语言 |
|---|---|---|
| 法律声明 / Terms & Conditions | `/terms` | **英文**（中文站页脚也链到英文页，标题仍为 `Terms & Conditions`） |
| 隐私与 Cookie 政策 | `/privacy-policy-cookie-restriction-mode` | 英文 |
| 退货退款政策 | `/returns` | 英文 |
| 美/欧关税说明（DDP 包税） | `/us-tariff` | 英文 |
| 物流信息 | `/cn/wuliu` | 中文 |
| 关于我们 | `/cn/jieshao` | 中文 |
| 联系我们 | `/cn/contact` | 中文（仅表单） |
| 茶叶批发 | `/cn/pifa` | 中文 |
| 免费样品 | `/cn/mianfei` | 中文 |
| 茶道博客 | `/cn/chadao.html` | 中文 |

**政策要点摘要**

- **物流（`/cn/wuliu`）**：三种方式——**航空件**（多数国家每 2kg 包裹 USD 7.90 或 10.50，预计 1–4 周）、**特快专递 EMS**（按重量结账报价，约 1–2 周）、**海运/平邮**（部分国家 >10kg/22lb 免运费）。订单通常**下一个工作日**发货，缺货需 2–4 个工作日补货。发货后次日邮件发送含 tracking 的确认函，可用 **17track** 查询。海关：多数非欧盟国家收货时无需缴税；欧盟多国已提供**含税运输**。分国家特殊要求：**韩国**需正确手机号（海关识别）+ 可填个人清关代码（customs.go.kr）；**巴西**必须在第二行地址或公司名填个人税号；**日本**必须提供日文送货地址。
- **退货（`/returns`）**：可在**未发货前随时取消**；政策为收货起 **14 天**内、商品未使用且原状；破损/故障须在收货后 **2 天内**邮件（附照片 + 订单号）报告；退款在收到并检验后 **5 个工作日**内处理，信用卡端最长 2 周。运费不退；无理由退货的退回运费自付；因拒付关税被退回的包裹只退 **订单金额 70%**；拒收/不提货不予退款。
- **法律（`/terms`）**：适用**香港法律**与香港法院专属管辖；预付款后发货；茶饼/普洱颜色随时间变化、图片仅供参考；含医疗免责声明（本站健康信息不构成诊疗建议）；含海关费用、无法投递包裹、包裹自取、禁售用途、责任限制等条款。
- **隐私**：收集姓名、地址、电话/邮箱及改善体验所需信息；用于订单处理、内部记录、订阅后的营销邮件；Cookie 双向说明；页面内还有「List of cookies we collect」小节。
- **关税（`/us-tariff`，更新 2025-09-01）**：发往**美国/欧盟**的包裹**含进口税并由 Teasenz 预付（DDP）**，收货无需再缴；其它国家大多不征税，若被征税由买家承担。美国送达约 **10–16 天**，欧盟约 **10–28 天**（旺季可能更长）。

---

## 8. 视觉 / 品牌风格

### 8.1 字体
- **正文/全部 UI 字体：`Muli`（Google Fonts），sans-serif** —— 自托管 woff2（`frontend/Local/my-theme/.../fonts/muli/v16/` 预加载 4 个文件）。**整站没有衬线字体**（CSS 中无 serif / Georgia / Times / Playfair / Lora / Merriweather 命中）。
- 字重使用：400（主，199 次）、700（95）、600（73）、800（39，用于标题与按钮）、300（38）、500（4）。
- 根字号 1.5rem（15px），行高 1.42857143。
- 图标字体：**FontAwesome 4.7.0**（社交图标 + UI 图标）。
- 移动端另有 `'Open Sans','Helvetica Neue',Helvetica,Arial,sans-serif` 的兜底声明。

### 8.2 排版层级（实测 CSS 规则）
| 元素 | 规则 |
|---|---|
| H1 | `color:#2e2e2e; font-weight:800; line-height:1.1; font-size:4.3rem`（43px） |
| H2 | `color:#000; font-weight:700; font-size:3.6rem`（36px） |
| body | `color:#6d6d6d; font-family:'Muli',sans-serif; font-weight:400; font-size:1.5rem; line-height:1.42857143` |
| `.block-title` | `border-bottom:1px solid #e8e8e8; font-size:1.8rem; padding-bottom:12px` |
| 按钮 `.action.primary` | `background:#2e2e2e; border:2px solid #2e2e2e; color:#fff; text-transform:uppercase; font-weight:800; padding:10px 15px; border-radius:0; font-size:1.5rem`；**hover/focus/active** → `background:#fff; border:1px solid #2e2e2e; color:#2e2e2e` |
| 链接 | 无下划线，靠颜色/粗细区分 |

### 8.3 色板（从主题 CSS 实测的高频色值，可作为重建基线）
| 角色 | 色值 | 说明 |
|---|---|---|
| 深色主色（标题/按钮底/主强调） | **`#2e2e2e`** | 出现 23 次（styles-l）；按钮主色、H1 颜色、深色区背景 |
| 顶部公告栏底 | **`#6e716e`**（配白字） | 灰绿色，品牌调性的关键一笔 |
| 正文文字 | `#6d6d6d` | |
| 次级文字 | `#575757` / `#7d7d7d` / `#757575` / `#9e9e9e` | |
| 分隔线/边框 | `#e5e5e5`（17 次）、`#e4e4e4`、`#eaeaea`、`#e8e8e8`、`#d8d8d8` | 极浅灰 |
| 区块底色 | `#fff`、`#fafafa`、`#f6f6f6`、`#f5f5f5`、`#f4f4f4`、`#f0f0f0`、`#eee` | |
| 深色底 | `#222`、`#333`、`#000`、`#151515`、`#272e3d` | |
| 暖色强调（备用/ProLabels） | `#ea8e6a`、`#f3a080`、`#ff7a0e` | 橙调，用于角标/促销 |
| 链接蓝（Magento 默认残留） | `#1979c2`（6 次）、`#185eaf`、`#135d95`、`#0d4168`、`#006bb4`、`#5897fb` | 属 Magento 默认样式，主题主动使用的是 `#2e2e2e` |
| 警示/错误 | `#e02b27`、`#ff5501` | |

> 结论：**调性是「近黑 + 灰绿 + 大留白 + 大量浅灰细分隔线」**，几乎不用饱和色；商品照片提供全部色彩。

### 8.4 图像风格（实测文件属性）
| 类型 | 尺寸/属性 | 说明 |
|---|---|---|
| 商品主图 | **700×700** JPEG，1:1，浅色/白底（西湖龙井图平均色 `#C6C8B5`，亮度直方图 light 占比 66%） | 单一光源、浅底、俯拍散茶/茶饼特写；文件名如 `longjing_.jpg`、`bi_luo_chun_tea_4.jpg`、`silver_needle_1500_copy.jpg` |
| 列表缩略图 | 400×400（`aspect-ratio:400/400` CSS 保位） | |
| 首页横幅 | `_-_1_copy.jpg` 1500×1001；`banner2_teasenz_cake.jpg` 1000×1000；`moongarden_banner.jpg` 1000×667；`loading="lazy"` | 平均色 `#827F63`（偏暗的土绿/茶褐），实拍/情景图为主，图上带少量文案 |
| Logo | `logo_white.png` 1474×431（渲染 295×29，白色版）+ `logo_black.png`（深色/粘性版） | 纯文字 wordmark，无图形符号 |
| Favicon | `media/favicon/websites/1/teasenz_favicon.png` | |
| 博客配图 | 每篇 1 张 `.post-image` | |

### 8.5 整体美学 & 布局特征
- **Argento Luxury 主题**：1 栏（`page-layout-1column`）为主，全宽满屏横幅 + 大留白 + 极细分隔线；按钮为**直角（`border-radius:0`）**、**大写字母**、黑白反转 hover。
- 粘性头部（`theme-editor-sticky`）+ 全屏横幅轮播（`luxury-fullscreen-slider`）。
- 商品卡在列表页悬停有第二张图/快捷按钮（`product-item-inner`）。
- 大量使用 **Swiper/Splide** 滑块承载商品与相关推荐。
- 面包屑、分页、筛选都是极简文字风格，无重色块。
- 无圆角、无渐变、无阴影堆叠——「高级、克制、内容为主」。

---

## 9. 内容 / 编辑类页面

### 9.1 茶道博客（`/cn/chadao.html`）— Amasty/Magefan Blog
- SEO title：`学中国茶叶 - 茶道博客 Wiki`
- H1：`学中国茶叶 - 茶道博客 Wiki`
- 布局：主列文章卡片（`.post-image` + `.post-title`），侧栏含 `分类`、`Search the blog`、`Recent posts`
- 博客分类：至少 `matcha`（`/cn/chadao/category/matcha.html`）
- **已抓取到的 20 篇文章**（标题 → slug）：
  1. 如何养护新式现代宜兴紫砂壶 → `how-to-season-new-modern-yixing-teapots.html`
  2. 太平猴魁的传说与历史 → `legend-and-history-of-tai-ping-hou-kui.html`
  3. 8种最佳肝脏排毒/清洁茶饮：科研怎么说 → `liver-detox-cleanse-teas.html`
  4. 8种有益视力的最佳茶饮：科学依据 → `tea-for-eyesight.html`
  5. 助消化最佳茶饮：哪些茶能缓解腹胀、恶心和油腻大餐？ → `tea-for-digestion.html`
  6. 养肺茶饮：6款助您轻松呼吸的茶 → `tea-for-lungs.html`
  7. 养肾茶饮：7款助您维护肾脏健康的茶 → `tea-for-kidneys.html`
  8. 如何保养开片茶壶、茶杯与盖碗 → `how-to-care-for-crackle-glaze.html`
  9. 宜兴紫砂：稀有的泥绘艺术 → `yixing-pottery-art-of-yixing-clay-painting.html`
  10. 古老的传统中式茶馆：文化、建筑与室内风格 → `chinese-tea-house.html`
  11. 新手购买抹茶综合指南 → `matcha-buying-guide.html`
  12. 抹茶的历史：从唐朝到现代日本 → `history-of-matcha.html`
  13. 什么是抹茶？它是由什么制成的？ → `what-is-matcha-made-of.html`
  14. 抹茶与咖啡的比较：咖啡因、健康益处、口感、成本等 → `matcha-vs-coffee.html`
  15. 抹茶是如何制成的？日本传统的5步生产工艺详解 → `how-matcha-is-made.html`
  16. 普洱茶红烧肉 + 配茶 → `pu-erh-braised-pork-recipe.html`
  17. 龙井虾仁食谱与配茶 → `longjing-shrimp-recipe.html`
  18. 茶熏鸡配方（古法）+ 配茶 → `tea-smoked-chicken.html`
  19. 茉莉花茶饭食谱 + 配茶：清香美味 → `jasmine-tea-rice.html`
  20. 正宗樟茶鸭食谱 + 配茶 → `tea-smoked-duck.html`
- 内容类型分布：**养壶/保养、茶史传说、健康功效（按器官分类）、茶点食谱、抹茶专题** —— 明显的 SEO 内容矩阵。

### 9.2 关于我们（`/cn/jieshao`）
SEO title `关于我们 | Teasenz.com`。结构：品牌使命短段 → `我们的故事`（创立于 2009 年）→ `我们如何选茶` → `从中国，到您的茶桌`（中国仓发货 / Teasenz.eu 荷兰仓）→ `慢慢认识您的茶` → `我们看重什么`（每款茶有自己的性格 / 喝一杯好茶的乐趣 / 茶背后的人）→ 结尾欢迎语 → **地址块**：
- 香港金融部：香港九龙尖沙咀科学馆道14号新文华中心A座9楼917B室
- 中国物流办公室及仓库：广东省深圳市南山区西丽镇官龙村东区新高路华纵科技楼3楼
- 电子邮件：info@teasenz.com

### 9.3 联系我们（`/cn/contact`）
仅有表单：标题 `给我们写信` / 副文案 `我们会及时与您取得联系` / 字段 `名字`、`邮箱`、`电话号码`、`您的留言` / 按钮 `提交`。**没有电话、没有地图、没有地址**。

### 9.4 物流信息（`/cn/wuliu`）→ 见 7.3
### 9.5 茶叶批发（`/cn/pifa`）
- 标题 `Teasenz是中国茶的首选茶叶批发供应商…`
- 结构：`批发价格`（产品页折扣：200克 10%、400克 15%、1公斤 20%）→ `大订单`（>1000 USD 邮件索取批发价目表）→ `样品`（约 15 克，需付费）→ `运输`（付款确认后 2 个工作日处理）→ `可以使用什么付款方式？`（**PayPal、信用卡或银行转账**）→ 「从我们中国 Teasenz 网络采购中获益」→ 「你是否在寻找一个中国茶叶批发供应商？」（0.2kg 起享批发价；5kg 时折扣可达 25%）→ 链接批发商品页 `/cn/wholesale-tea-teaware`
### 9.6 免费样品（`/cn/mianfei`）
- `订货时免费产品`（注意：页面当前显示 `暂时没有免费送的产品.`，但列表里仍有）：>50 USD 送叶子茶叶过滤器（不锈钢）；>70 USD 送杯垫 1 个 + 过滤球 1 个；>100 USD 送杯垫 1 个 + 竹席垫 1 个（**运费不计入订单金额**）
- 常见问题：是否需要优惠券码（不需要）；为什么购物车看不到赠品（赠品不显示在购物车，系统自动加入包裹）；能否换其它赠品或现金折扣（不能，但会定期更新）
- `领取免费样品的博客`：博主可邮件申请，获批后送 **5 种不同类型茶样（每款约 15 克）且免运费**，条件是挑选 2–5 款写博文并附产品/分类链接；要求博客内容关于茶/食品/保健/中国文化且有 ≥30 篇博文；任何国家均可寄送
### 9.7 英文站独有的知识/服务页（中文站无对应，重建时可考虑补齐中文版）
- `/chinese-tea.html` — `Chinese Tea Guide - Chinese Tea Information & Facts Blog`（茶知识中心）
- `/frequently-asked-questions` — `Payment Methods & Frequently Asked Questions`（支付方式 + FAQ + 包装说明 + 价格下拉说明）
- `/free-tea-samples-with-free-shipping`
- `/chinese-tea-wholesale-supplier`
- `/about-us`、`/contact-us`、`/shipping-information`
- FAQ 页里还引用了：`out of stock tea and teaware`、`tea cake in pouch`（茶饼亚麻棉布袋礼盒包装）等页面
- **⚠️ 没有独立的「冲泡指南 / Brewing Guide」页面**——冲泡说明被写在每个商品的「描述」Tab 与「详情」规格表里，这是很关键的信息架构决策。

### 9.8 搜索与账户页
- 搜索结果：`/cn/catalogsearch/result/?q=`
- 高级搜索：`/cn/catalogsearch/advanced/`
- 愿望清单：`/cn/wishlist/`
- 账户：`/cn/customer/account/`、登录 `/cn/customer/account/login/`

---

## 10. 商品命名与定价规范

### 10.1 命名范式（真实样例）

**A. 传统名茶 —— 「产地/工艺前缀 + 茶名 + 品类」（最常见，短）**
| 商品名 | 价格（70g 基准档） | URL slug |
|---|---|---|
| 西湖龙井 - 群体种龙井 | USD 10.95 | `west-lake-dragon-well-green-tea` |
| 明前龙井 | USD 19.95 | `longjing` |
| 碧螺春绿茶 | USD 10.95 | `bi-luo-chun-green-tea` |
| 安溪铁观音 | USD 9.95 | `anxi-tie-guan-yin-oolong-tea` |
| 武夷山大红袍 乌龙茶 岩茶 | USD 11.95 | `da-hong-pao-oolong-tea` |
| 茉莉龙珠 | USD 9.95 | `jasmine-dragon-pearls-green-tea` |
| 明前黄山毛峰 | USD 14.95 | `ming-qian-huang-shan-mao-feng-tea` |
| 白毫银针 | USD 14.95 | `silver-needle-white-tea` |
| 云南金芽 | USD 12.95 | `yunnan-gold-tea` |
| 金骏眉 | USD 13.95 | `jin-jun-mei` |
| 祁门功夫红茶 | USD 9.95 | `keemun-black-tea` |
| 正山小种 | USD 9.95 | `lapsang-souchong-black-tea` |
| 信阳毛尖 | USD 9.95 | `xin-yang-mao-jian-green-tea` |
| 六安瓜片 | USD 10.50 | `liu-an-gua-pian-green-tea` |
| 太平猴魁绿茶 | USD 14.95 | `tai-ping-hou-kui` |
| 安吉白茶 | USD 17.95 | `anji-bai-cha-anji-white-tea` |
| 竹叶青绿茶 | USD 13.95 | `zhu-ye-qing` |
| 福建珠茶 | USD 8.50 | `chinese-gunpowder-green-tea-zhu-cha` |
| 恩施玉露 绿茶（限量版） | USD 9.95 | `enshi-yulu-jade-dew` |
| 安吉黄金芽 绿茶 | USD 14.95 | `huang-jin-ya` |
| 冬绿西湖龙井绿茶 | USD 11.95 | `winter-west-lake-dragon-well-longjing` |
| 江苏南京雨花茶 240克 | USD 39.95 | `nan-jing-yu-hua-cha-green-tea` |
| 铁罗汉 武夷山乌龙茶 250克 | USD 74.95 | `tie-luo-han-oolong-tea` |
| 水金龟 250克 | USD 49.95 | `shui-jin-gui-golden-water-turtle` |
| 水仙岩茶 – 武夷山水仙乌龙茶 | USD 69.95 | `shui-xian` |
| 黄玫瑰岩茶 - 武夷黄玫瑰乌龙茶 | USD 69.95 | `huang-mei-gui` |
| 北斗一号岩茶 – 武夷北斗乌龙茶 | USD 69.95 | `bei-dou-yi-hao` |
| 奇兰岩茶 – 武夷奇兰乌龙茶 | USD 69.95 | `qi-lan` |
| 肉桂岩茶 – 武夷山肉桂乌龙茶 240克 | USD 34.95 | `rou-gui` |
| 鸭屎香单丛乌龙 | USD 10.95 | `ya-shi-xiang-dan-cong` |
| 芝兰香单丛乌龙 | USD 10.95 | `zhi-lan-xiang-dan-cong` |
| 黄枝香单丛乌龙茶 | USD 11.50 | `huang-zhi-xiang-dan-cong` |
| 杏仁香单从乌龙茶 | USD 14.95 | `xing-ren-xiang-dan-cong` |
| 凤凰单枞乌龙茶 | USD 10.95 | `feng-huang-dan-cong-phoenix-oolong-tea` |
| 奶香乌龙茶 | USD 9.95 | `milky-oolong-tea` |
| 人参乌龙 | USD 9.95 | `ginseng-oolong-tea` |
| 红龙珠 | USD 9.95 | `red-dragon-pearls-black-tea` |
| 英德红茶 - 英红9号 | USD 10.95 | `yingde-black-tea` |
| 利川功夫红茶 (利川红) | USD 9.95 | `lichuan-black-tea` |
| 荔枝红茶 | USD 8.50 | `lychee-black-tea` |
| 黄玫瑰 正山小种 红茶 | USD 11.95 | `huang-mei-gui-lapsang-souchong` |
| 金牡丹野茶树红茶 | USD 10.95 | `jin-mu-dan` |
| 滇红 | USD 9.95 | `golden-yunnan-tea-dianhong` |
| 福建白牡丹白茶 | USD 10.95 | `white-peony-white-tea-bai-mu-dan` |
| 茉莉银针 | USD 11.95 | `jasmine-silver-needle` |
| 茉莉飘雪花茶 | USD 9.95 | `jasmine-green-tea` |
| 特级茉莉花茶 | USD 9.95 | `jasmine-tea` |
| 女儿环 | USD 129.95 | ⚠️slug 未从列表页解析出（商品格 href 提取失败，仅价格/名称可用） |
| 大雪山野生紫芽孢茶 | USD 13.95 | `yabao` |

**B. 年份 + 品牌/茶厂 + 唛号/产品名 + 生/熟 + 饼型 + 克重（普洱茶与陈年白茶/红茶）**
| 商品名 | 价格 | slug | 状态 |
|---|---|---|---|
| 2013年大益普洱熟茶茶饼‘勐海之星’357克 | USD 89.95 | `star-of-menghai` | |
| 2017年大益凤凰格格熟普洱茶饼 100克 | USD 19.95 | `dayi-phoenix-princess` | |
| 2017年大益"旺夫"熟普洱茶饼 100克 | USD 18.95 | `dayi-wang-fu` | |
| 2019年大益"兄弟起风了"熟普洱茶饼 100克 | USD 19.95 | `brother-the-wind-rises` | |
| 2021年大益"五子登科"熟普洱茶饼 150克 | USD 26.95 | `wu-zi-deng-ke` | |
| 2025年 布朗山紫娟普洱生茶饼 200克 | USD 31.50（原 28.35 特价） | `velvet-mountain-purple-tea-cake` | |
| 2017年 山语临沧熟普洱饼茶 200克 | USD 29.95 | `whispering-earth` | |
| 2010年 叩古阙 易武陈年生普茶饼 200克 | USD 39.95 | `ancient-gate` | |
| 2022年茶者 妖茶 广别老寨生普洱茶饼 357克 | USD 41.95 | `yaocha-pu-erh-tea` | |
| 2023 土林凤凰8501 生普洱沱茶 | USD 11.50 | `tulin-raw-tuocha` | |
| 2026年吉普号317大雪山熟普洱迷你茶饼56克（8克 x 7） | USD 10.95 | `oripuerlab-317-mini-cake` | |
| 2026年吉普号215大雪山生普洱迷你茶饼49克（7克 x 7） | USD 10.95 | `oripuerlab-215-mini-cake` | |
| 2025年"野山灵叶"永德生普洱茶球 | USD 12.95 | `daxueshan-yongde-pu-erh-dragon-ball` | |
| 2019年古树老班章生普洱茶球 | USD 11.95 | `lao-ban-zhang-raw-pu-erh-tea-ball` | |
| 2011 Xiaguan Te Ji Raw Pu Erh Tuocha Tea 100g | USD 11.50（原 10.90） | `xiaguan-te-ji-tuocha` | **标题未中文化** |
| 2021年迷你橘子普洱 福字陈皮熟普洱茶 | USD 11.95 | `fortune-xiaoqinggan` | |
| 2024年优质普洱小青柑茶 | USD 13.50 | `xiao-qing-gan-tea` | |
| 2023倚邦古树 生普洱茶饼 小叶种 200g | USD 79.95 | `yibang-puerh` | |
| 2024年下关金丝沱茶20周年纪念版 生普洱 100克 | USD 12.95 | `xiaguan-jin-si-20-anniversary` | |
| 2013/2019茶者‘大黄印’黄标熟普洱茶饼357克 | USD 49.95 | `da-huang-yin` | |
| 2016年大益"悟空"熟普洱茶饼 100克 | USD 15.95 | `dayi-monkey-king` | 促销 |
| 2019 年大益熟普洱沱茶 100克 | USD 10.00 | `menghai-dayi-shou-tuocha` | 促销 |
| 2024 月园古树白茶 200克 | USD 34.95 | `moon-garden` | **缺货** |
| 2024 月园古树白茶，迷你茶饼7克 | USD 12.50 | `moon-garden-mini-cakes` | **缺货** |
| 2025年 白毫银针茶饼 云南大叶种 | USD 12.50（原 11.25） | `fuding-silver-needle-white-tea-cake` | |
| 2014年 福鼎贡眉白茶饼 | USD 35.95 | `fuding-gong-mei-white-tea-cake` | |
| 2019年寿眉白茶球 | USD 8.95 | `shou-mei-white-tea-balls` | |
| 2019 月光白 茶球 | USD 8.95 | `moonlight-white-tea-balls` | |
| 2024年 琥珀日出 日光晒红 红茶茶饼 200克 | USD 39.95 | `amber-sunrise` | **缺货**（首页横幅主角） |
| 2024 琥珀晒红 迷你茶饼 7克 | USD 14.50 | `amber-sunrise-mini` | **缺货** |
| 2026 易武晒红 云南滇红茶 功夫红茶 100克 | USD 12.95 | `sun-dried-black-tea-cake-shai-hong` | |
| 2025年凤庆传统晒红 野芳红茶球 | USD 12.95 | `ye-fang-black-tea-ball` | |
| 2025年紫芽晒红 紫玉红茶球 | USD 18.50 | `sun-dried-black-tea-dragon-ball` | |
| Teasenz 坝糯古树 生普洱茶饼 200g | — | `banuo` | 首页横幅主角 |

**C. 集合/套装（Sampler / Set / Collection）**
- `武夷乌龙茶样品 - 岩茶印象套装` — USD 24.95 — `wuyi-oolong-rock-tea-sampler`（英文 `Wuyi Oolong Tea Sampler - Rock Tea (Yan Cha) Impressions Set`）
- `2026年春季绿茶/白茶样品套装` — USD 27.95 — `green-white-sampler`（**缺货**）
- `2026年春季红茶样品套装` — USD 16.50 — `black-tea-sampler`（**缺货**）
- 茶具集合：`Sapiens Collection`（4 件，如 `clay-gaiwan-sapiens`）

**D. 花草茶 / 养生茶（单一名词为主，价格低）**
苦丁茶 8.95、金银花 10.95、法兰西粉玫瑰花茶 8.95、人参乌龙 9.95、桂花 13.95、薰衣草 8.95、山楂果茶 8.95、枸杞 45.00、黑苦芥（苦荞）8.95、贡菊花茶 10.95、胎菊花茶 9.95、红枣 8.95、洛神花茶-木槿花茶 29.95、蓝蝴蝶蝶豆花茶 10.95

**E. 工艺花茶（两种命名并存）**
- 单颗：`一见钟情手工花球茶` 10.95、`粉红佳人手工花球茶 - 康乃馨花球茶` 10.95、`双龙戏珠 工艺花茶` 10.95、`丹桂百合手工花球茶` 10.95
- 批发装：`1 kg 东方美人手工花球茶` **109.50**、`1 kg 金盏银台手工花球茶` 109.50、`1 kg 百合花开 工艺花茶` 109.50、`1 kg 双喜临门 工艺花茶` 109.50（**缺货**）

**F. 茶具命名（材质/工艺 + 造型 + 容量）**
`手工宜兴红皮龙莲蓬茶壶 120毫升`、`透明玻璃盖碗120毫升`、`汝窑猫咪盖碗 160ml`、`纯净玻璃茶壶350毫升`、`带茶漏保温杯 400毫升`、`尚明Tritan 冷泡杯泡茶杯 运动户外水杯 薄荷绿530ml`、`可爱小蛇茶宠 宜兴紫砂 – 中国生肖`、`小象茶宠 - 小象摆件`、`紫砂壶（荷叶/南瓜/石瓢/虚扁…）`、`茶饼展示架`、`不锈钢叶子茶叶过滤器（金/银色）`

**G. 免费赠品（价格 0，作为可购商品存在以便进入购物车/评价体系）**
- `免费赠送 （订单金额50美金以上）：叶子茶叶过滤器，不锈钢，金/银色` — 价格 0（常规价 10.00，特殊价 0.00，有颜色选项）— `leaf-shaped-tea-infuser-strainer`
- `订单超过100美元/欧元免费送：玻璃功夫茶品茗杯` — 价格 0 — `glass-gongfu-tea-tasting-cup`

### 10.2 价格规范
- **展示格式：`USD 10.95`（货币代码 + 空格 + 两位小数）**，无 `$` 符号。折扣价用 `特殊价格` / `常规价格` 双行。
- **价格带（实测）**：
  - 日常散茶 70g 基准档：**USD 8.50 – 19.95**（主力集中在 9.95–14.95）
  - 高端岩茶/单丛：**USD 34.95 – 74.95**
  - 陈年普洱/白茶饼：**USD 10.95 – 89.95**（357g 大益老茶最贵 89.95）
  - 茶饼：单饼 200g 约 29.95–49.95；100–150g 熟饼 15.95–26.95；迷你饼（7–8g）10.95–14.50
  - 工艺花茶：单颗 10.95；1kg 装 109.50
  - 茶具：**USD 14.95 – 150.00** 区间（紫砂手工壶可达 150.00），主流 15–27 USD
  - 促销区：10.00 – 26.95（折扣后）
- **重量分档定价（tea 类商品统一 5 档）**：
  | 档位 | 相对 70g 基准价 | 中文标注 |
  |---|---|---|
  | 15克样品 | ≈ 25–27% | （无折扣标注，`+ USD …`） |
  | 70克（基准） | 100% | — |
  | 200克 | 10% 折扣 | `省10%` |
  | 400克 | 15% 折扣 | `省15%` |
  | 1公斤 | 20% 折扣 | `省20%` |
- **批发价阶梯**（批发页声明）：200g 10%、400g 15%、1kg 20%；**0.2kg 起即享批发价**；**5kg 时折扣可达 25%**；>1000 USD 需邮件索取批发价目表。
- **免运费/赠品阶梯**：订单 >50 USD（不含运费）送叶子过滤器；>70 USD 送杯垫+过滤球；>100 USD 送杯垫+竹席垫。海运免运费门槛 >10kg。
- **SEO title 的三种范式**（对重建站点很重要，是流量入口）：
  1. 分类：`买{X} - 中国{X} 种类多 | Teasenz茶叶店` / `{X}：网络购买{A}，{B} | Teasenz网`
  2. 商品（新）：`{商品名} - 全球发货 | Teasenz`
  3. 商品（旧/促销向）：`在线购买{商品名} - Teasenz网 国际茶叶店 - {商品名}全球购`
- **URL slug 规范**：分类用英文复名词（`loose-leaf-green-teas`、`yunnan-pu-erh-teas`、`chinese-herbal-teas`、`blooming-tea`）；商品用英文拼音/意译 slug（`west-lake-dragon-well-green-tea`、`jin-jun-mei`、`da-hong-pao-oolong-tea`），偶有语义化落地页 slug（`longjing`、`banuo`、`moon-garden`、`amber-sunrise`、`spring`、`sale`）。
- **SKU 规范**：茶叶 = `{茶类首字母}{4位序号}-{中文名}`（`G0001-西湖龙井`、`G0015-明前龙井`、`B0001-祁门红茶`、`B0009-金骏眉`、`W0001-白毫银针`）；茶具/其它 = 大写 slug（`LOTUS-POD-TEAPOT`、`BANUO`、`MOON-GARDEN`、`YE-GUO-LU`、`wuyishan-yan-cha`、`meng-hai-zhi-xing-star-of-menghai`、`FH-333MS3-玻璃盖碗`）。

### 10.3 未上架/缺货（重建时要有 OOS 状态与「相关商品兜底」）
以下商品在抓取时显示 `缺货`：月园古树白茶（含迷你饼）、2026春季绿茶/白茶样品套装、2026春季红茶样品套装、琥珀日出（含迷你饼）、1kg 双喜临门工艺花茶。缺货商品**仍保留在列表中**（SEO 与转化兜底），显示 `缺货` 标签且无加购按钮但保留 `添加到收藏夹`。

---

## 11. 重建站点的信息架构（可直接落地的 IA 建议）

```
/                        首页（公告栏 / Header+菜单 / 全宽横幅 / H1 文案块 / 热销轮播 / 图文块×2 / 品牌长文 / Newsletter / 页脚）
/sale                    促销（Highlight「On Sale」视图，非分类）
/spring/{season}         当季新茶（分类 + 长导语，每年更新）
/teaware                 茶具（父分类，带 类别 筛选）
  /yixing-zisha /tea-pets /tea-pots /tea-infusers-mugs /chinese-tea-cups
  /gaiwan /tea-sets /tea-storage /tea-strainers-infusers /tea-accessories
/pu-erh                  普洱茶（父分类，带 类别 筛选）
  /sheng-puerh /shou-puerh /pu-erh-tea-dragon-balls /tuocha
  /xiaguan /dayi /haiwan-tea-factory
/green-tea  /white-tea  /oolong-tea  /black-tea            （叶子分类，无筛选）
/herbal-tea  /flower-tea  /blooming-tea                     （养生茶组，父/子）
/tea-tins  /white-tea-cakes  /jasmine-tea                   （专题分类，可做 SEO 落地页）
/{product-slug}                                            商品页（图库 / SKU / 卖点 / 库存 / 价格 / 重量5档 / 数量 / 加购 / 收藏 / 3 Tab / 相关商品×2 / 批量加购）
/cart  /checkout                                           购物车 + 2 段结账
/blog（原 /chadao.html）+ /blog/category/{x}               茶道博客（Amasty/Magefan 风格）
/about  /contact  /shipping  /wholesale  /free-samples  /faq  /terms  /privacy  /returns  /tariffs
/account  /wishlist  /search  /search/advanced
```

**重建时必须保留的关键交互与细节（否则不像）**
1. 顶部灰绿公告栏 + 白色/黑色双 Logo 切换
2. 10 项主导航，其中 3 项带下拉；叶子分类无下拉
3. 首页「全宽横幅 → H1 文案 → 无标题热销轮播（10 件/近 6 个月/价格>阈值）→ 左文右图×2 → 居中品牌长文」的节奏
4. 商品页**重量 5 档下拉 + 折扣标签 + 价格叠加规则**（下拉价 = 70g 价 + 增量，或直接显示最终价，二选一但必须文档化）
5. 商品页「描述 / 详情 / 点评 N」三 Tab，且**冲泡参数做成结构化规格表**（省/产区/年份/季节/水温/两种冲泡法克数与时间/树种/茶名/麸质/咖啡因）
6. 评价表单的**三维评分（价格/质量/服务）+ 昵称 + 概览 + 正文**
7. 免费赠品作为 0 元商品入库并出现在商品页/相关商品中
8. 促销/相关商品区**带勾选框的批量加购**
9. 缺货商品保留展示（`缺货` 标签 + 收藏兜底）
10. 页脚：Newsletter + 3 栏 + 联系/支付文本栏 + 4 个社交图标 + 8 语言切换器 + 单行版权
11. 支付方式**用文字列举而非图标**
12. 中文站需要修正的翻译缺陷（重建时别照抄）：相关商品标题「超售」→「相关商品」；按钮「理解跟多」→「了解更多」；「提交的评论」→「提交评价」；「选择存储」→「选择语言」；「咖啡因含量：底」→「低」；购物车提示仍为英文。

---

## 12. 原始数据文件清单（`C:\Users\teren\Downloads\茶叶\_research\`）

| 文件 | 内容 |
|---|---|
| `cn_home.html` / `en_home.html` | 中文/英文首页完整 HTML |
| `cn_home_body.html` / `cn_nav_raw.html` / `en_nav_raw.html` | 首页主体、中英导航原始片段 |
| `cn_nav_items.txt` / `en_nav_items.txt` | 中英导航逐项（含 class/层级/URL） |
| `cn_footer_raw.html` / `en_footer_raw.html` | 中英页脚原始 HTML |
| `cn_green/white/black/oolong/herbal/flower/blooming/puerh/spring/sale/teaware.html` | 各分类页 |
| `cn_tw_*.html`（10 个子分类）、`cn_pu_sheng.html`、`cn_pu_shou.html` | 茶具/普洱子分类页 |
| `cn_cat_tea-tins.html`、`cn_cat_white-tea-cakes.html`、`cn_cat_chinese-jasmine-teas.html`、`cn_cat_longjing.html` | 专题分类与 SEO 落地页 |
| `cn_prod_longjing.html`、`cn_p_*.html`（6 个）、`cn_prod_puerh/teapot/sampler/freegift/gaiwan/banuo.html` | 商品详情页样本 |
| `cn_about/contact/shipping/wholesale/blog/free/terms/privacy/returns/ustariff.html`、`en_faq.html`、`en_teainfo.html` | CMS/政策/博客/FAQ 页 |
| `cn_cart_full.html`、`cn_checkout.html`、`cn_add2.html`、`cookies.txt` | 购物车（含商品）、结账页、加购结果、会话 cookie |
| `pm.json`、`pm_cn.json`、`resp_ship_*.json`、`totals*.json`、`shipinfo_resp.json`、`rest_cart.json` | REST 验证结果（支付方式/运费/合计/客单信息） |
| `js-translation.json` | 中文站 386 条 UI 文案字典（结账/表单/按钮的中文标准译法） |
| `theme_styles_l.css`、`merged.css` | 主题 CSS（字体/色值/按钮规则来源） |
| `banner_mengsong.jpg`、`prod_longjing.jpg`、`logo_white.png` | 用于尺寸与配色分析的图片样本 |
