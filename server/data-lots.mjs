/**
 * Catalogue expansion: tea sub-lots.
 *
 * The shop's tea list grows to a hundred by splitting existing, real teas into
 * the lots a tea merchant actually sells them as. The axis differs by family,
 * because the same one would be false for all of them:
 *
 *   Green    grade       Pre-Qingming / Yuqian / late spring — the classical
 *                        picking grades, which is what sets green tea price.
 *   White    vintage     Aged white genuinely improves for years, so a 2019
 *                        Shoumei and a 2024 Shoumei are different products.
 *   Oolong   roast       Light, traditional charcoal and aged are separate
 *                        crafts with separate markets.
 *   Dan Cong aroma type  These are different single bushes, not grades of one.
 *   Rock     bush        Rou Gui, Shui Jin Gui, Tie Luo Han and Bai Ji Guan are
 *                        the Four Famous Bushes; each is its own tea.
 *   Black    grade       Bud-only, tippy and leaf grades, plus smoked vs unsmoked.
 *   Pu-erh   vintage     Year and mountain, which is how pu-erh is bought.
 *   Floral   base tea    The scenting base changes the tea completely.
 *
 * Nothing here invents a tea that could not exist, and every lot keeps its base
 * tea's photograph, because a photograph of Longjing is a photograph of
 * Longjing whichever picking grade is in the tin. Grade multipliers move the
 * price rather than an invented premium.
 */

/**
 * Lot styles. `mult` scales the base tea's price; `copy` explains the lot in the
 * product description; `badge` and `sealHint` shape the card.
 */
export const LOT_STYLES = {
  /* ------------------------------------------------------------ green tea */
  yuqian: {
    label: 'Yuqian',
    mult: 0.64,
    badge: 'Yuqian grade',
    seal: null,
    subtitle: 'Rain-before grade · picked 5–20 April',
    harvest: 'Yuqian (5–20 April), bud and one leaf',
    copy: 'Yuqian means "before the rain", the picking window that opens once the Qingming festival has passed. The leaf has had a fortnight more sun than the pre-Qingming pick, so the buds are fuller and the yield higher — which is why the grade costs noticeably less without being a lesser tea. What it trades away is the almost weightless delicacy of the earliest pick, and what it gains is body and a longer, nuttier finish.',
    hook: 'The grade most tea drinkers in China actually keep in the tin: a fortnight later than the famous pick, with more body and far less price.',
    notes: ['Fuller body', 'Nuttier finish', 'Better value', 'Everyday grade'],
  },
  guyu: {
    label: 'Late spring',
    mult: 0.44,
    badge: 'Late spring',
    seal: null,
    subtitle: 'Late spring pick · larger leaf, sturdier brew',
    harvest: 'Late April to early May, two leaves and a bud',
    copy: 'This is the pick that follows the two famous grades, once the leaf has grown large enough to roll more heavily. It is the tea a Chinese household drinks with meals: darker in the cup, less aromatic, and considerably more forgiving of a heavy pour or a forgotten pot. Drink it daily and keep the early grades for the days you are paying attention.',
    hook: 'The sturdier late pick, brewed for the table rather than the tasting table: darker, cheaper and hard to ruin.',
    notes: ['Bolder cup', 'Forgiving brew', 'Table tea', 'Best value'],
  },
  autumn: {
    label: 'Autumn',
    mult: 0.40,
    badge: 'Autumn pick',
    seal: null,
    subtitle: 'Autumn flush · floral, lighter than spring',
    harvest: 'September to October, after the summer rains',
    copy: 'Autumn leaf is a different animal from spring leaf: less amino acid, more aroma compound, so the cup is more perfumed and less sweet, with a thinner body. It is prized by drinkers who find spring green tea too soft, and it is the pick that survives a long steep without turning bitter.',
    hook: 'Autumn leaf: more perfume, less sweetness, and the one green tea that will not turn bitter if you forget it.',
    notes: ['High aroma', 'Light body', 'Bitter-resistant', 'Autumn flush'],
  },

  /* ------------------------------------------------------------ white tea */
  aged: {
    label: 'Aged',
    mult: 1.0,
    badge: 'Aged',
    seal: null,
    subtitle: 'Dry-stored · matured in the leaf',
    harvest: 'Stored whole since picking, never re-fired',
    copy: 'White tea is the one tea category that improves with age, because it is never fired: the enzymes stay alive and the leaf keeps working in storage. Over years the fresh hay and melon of a new tea turns into honey, dried apricot, medicinal herbs and a sweetness that coats the throat. We store ours dry and dark in Fujian and re-test each lot annually, so what you buy has been tasted recently rather than assumed.',
    hook: 'Left unfired, white tea keeps maturing in the tin — this lot has already turned from hay and melon into honey and dried apricot.',
    notes: ['Honeyed', 'Dried apricot', 'Ages in the tin', 'Dry-stored'],
  },
  gongmei: {
    label: 'Gongmei',
    mult: 0.52,
    badge: 'Gongmei grade',
    seal: null,
    subtitle: 'Leaf grade · coarse leaf, sweet cup',
    harvest: 'Mid-April, larger leaf with few buds',
    copy: 'Gongmei sits below Bai Mudan in the official grading, made from larger leaves with little bud content. The grading system measures how much silver tip is in the pile, not how good the tea tastes, and Gongmei is where that distinction shows most clearly: less downy, less expensive, and often sweeter and rounder in the cup than a bud-heavy tea costing several times as much.',
    hook: 'The grade the grading system undervalues: coarse leaf that brews sweeter and rounder than the bud-heavy teas above it.',
    notes: ['Coarse leaf', 'Round sweetness', 'Undervalued grade', 'Ages well'],
  },

  /* --------------------------------------------------------------- oolong */
  light_roast: {
    label: 'Light roast',
    mult: 0.92,
    badge: 'Light roast',
    seal: null,
    subtitle: 'Modern style · floral and green',
    harvest: 'Spring pick, lightly oxidised and dried warm',
    copy: 'The modern style, developed in the 1980s and now what most people mean by oolong: minimal roasting, so the cup stays green-edged and floral, closer to a green tea with the astringency removed. It rewards a lower temperature and a shorter steep, and it does not keep as long as a roasted tea — buy it to drink, not to store.',
    hook: 'The modern green-edged style: floral, buttery, no astringency, and built to be drunk rather than stored.',
    notes: ['Floral', 'Buttery', 'Green-edged', 'Drink fresh'],
  },
  charcoal: {
    label: 'Charcoal-baked',
    mult: 1.18,
    badge: 'Charcoal-baked',
    seal: null,
    subtitle: 'Traditional · baked over hardwood charcoal',
    harvest: 'Spring pick, baked three times over charcoal',
    copy: 'Baking over hardwood charcoal is slow, manual and increasingly rare, because the baker has to judge the fire by hand across repeated bakes with weeks of rest between. What it produces is a tea of a completely different order: the florals fold down into caramel, roasted chestnut and dark honey, the body thickens, and the tea will keep improving for years in a sealed tin. The fire is never tasted — a good charcoal bake leaves no smoke, only depth.',
    hook: 'Baked three times over hardwood charcoal with weeks of rest between: florals folded down into caramel and dark honey.',
    notes: ['Caramel', 'Roasted chestnut', 'Thick body', 'Keeps for years'],
  },
  aged_oolong: {
    label: 'Aged',
    mult: 1.34,
    badge: 'Aged',
    seal: null,
    subtitle: 'Re-roasted and rested · ten years in store',
    harvest: 'Spring pick, re-fired periodically during storage',
    copy: 'Aged oolong is a deliberate craft rather than a forgotten tin. The tea is re-roasted lightly every year or two and rested in between, which drives off moisture and pushes the leaf further from flower and closer to camphor, old wood and dried plum. It brews dark, almost like a light pu-erh, and is one of the few teas that is genuinely better at ten years than at one.',
    hook: 'Re-fired every year or two for a decade: camphor, old wood and dried plum, closer to pu-erh than to oolong.',
    notes: ['Camphor', 'Old wood', 'Re-fired yearly', 'Ten years stored'],
  },
  competition: {
    label: 'Competition',
    mult: 1.44,
    badge: 'Competition lot',
    seal: null,
    subtitle: 'Contest-grade leaf · hand-sorted',
    harvest: 'Spring pick, hand-sorted, single day',
    copy: 'The lot we enter and then keep: leaf from a single picking day, hand-sorted to remove every broken piece, and processed by the maker who takes the most care rather than the one who takes the most leaf. Competition grading rewards aroma, clarity and how many infusions a tea will carry, and this is the lot that scores. Quantities are small and we do not restock mid-year.',
    hook: 'A single picking day, hand-sorted to the last broken leaf: the lot we enter into competition and then keep for ourselves.',
    notes: ['Single day pick', 'Hand-sorted', 'Many infusions', 'Limited'],
  },

  /* ------------------------------------------------ rock oolong / yancha */
  rou_gui: {
    label: 'Rou Gui',
    mult: 1.06,
    badge: 'Cinnamon bush',
    seal: 'Cassia',
    subtitle: 'Rou Gui bush · cinnamon and mineral',
    harvest: 'Late spring, open-face leaf, medium roast',
    copy: 'Rou Gui — "cinnamon" — is the youngest of the famous Wuyi bushes and one of the Four Famous Bushes, prized for a warm spice note that is genuinely in the leaf rather than added. Grown in the cliff soil of the inner gorges it carries a mineral spine under the spice that the same bush grown on flat ground simply does not have.',
    hook: 'Cinnamon that is genuinely in the leaf, sitting on the mineral spine that only cliff-grown yancha has.',
    notes: ['Warm spice', 'Mineral spine', 'Four Famous Bushes', 'Inner gorge'],
  },
  shui_jin_gui: {
    label: 'Shui Jin Gui',
    mult: 1.22,
    badge: 'Golden Water Turtle',
    seal: 'Turtle',
    subtitle: 'Shui Jin Gui bush · deep and rounded',
    harvest: 'Late spring, open-face leaf, medium roast',
    copy: 'Shui Jin Gui, the Golden Water Turtle, is the least planted of the Four Famous Bushes and the hardest to find in any quantity. It is the most restrained of the four in aroma and the deepest in body: less spice than Rou Gui, less perfume than Tie Luo Han, and a long, rounded, almost creamy finish that keeps going after the cup is empty.',
    hook: 'The rarest of the Four Famous Bushes: quiet in aroma, deepest in body, with a finish that outlasts the cup.',
    notes: ['Deep body', 'Rounded finish', 'Rare bush', 'Four Famous Bushes'],
  },
  tie_luo_han: {
    label: 'Tie Luo Han',
    mult: 1.28,
    badge: 'Iron Arhat',
    seal: 'Arhat',
    subtitle: 'Tie Luo Han bush · dark and fruity',
    harvest: 'Late spring, open-face leaf, heavier roast',
    copy: 'Tie Luo Han, the Iron Arhat, is the darkest and fruitiest of the Four Famous Bushes — stewed plum, dark chocolate and a roasted note that sits well behind the fruit rather than over it. It takes a heavier roast than Rou Gui without turning bitter, which is why it is the bush most often aged.',
    hook: 'Stewed plum and dark chocolate, holding a heavier roast without a trace of bitterness.',
    notes: ['Stewed plum', 'Dark chocolate', 'Holds heavy roast', 'Four Famous Bushes'],
  },
  bai_ji_guan: {
    label: 'Bai Ji Guan',
    mult: 1.32,
    badge: 'White Cockscomb',
    seal: 'Cockscomb',
    subtitle: 'Bai Ji Guan bush · pale leaf, green style',
    harvest: 'Late spring, pale leaf, light roast',
    copy: 'Bai Ji Guan, the White Cockscomb, is the odd one out among the famous bushes: its new leaf is pale yellow-green, it is processed far lighter than its neighbours, and it brews a bright, almost green cup with a pronounced vegetal sweetness. Yancha drinkers either find it the most refreshing tea in Wuyi or an intruder in the style, and there is no middle position.',
    hook: 'The pale-leaved odd one out: processed light, brewing bright and vegetal, and unlike any other Wuyi tea.',
    notes: ['Pale leaf', 'Bright cup', 'Light roast', 'Four Famous Bushes'],
  },
  lao_cong: {
    label: 'Old bush',
    mult: 1.38,
    badge: 'Old bush',
    seal: 'Old Bush',
    subtitle: 'Lao Cong Shuixian · sixty-year bushes',
    harvest: 'Late spring from sixty-year-old Shuixian bushes',
    copy: 'Shuixian grown as a bush rather than a tree is ordinary. Shuixian left alone for sixty years becomes Lao Cong, old bush, and turns into something else entirely: the leaf is thicker, the roots are deeper, and the cup carries a distinctive woody, almost mossy depth under the usual roast that no young bush produces at any price.',
    hook: 'Sixty-year-old Shuixian: thicker leaf, deeper roots, and a mossy woodiness no young bush can imitate.',
    notes: ['Old bush', 'Woody depth', 'Deep roots', 'Limited leaf'],
  },

  /* ------------------------------------------------------------ black tea */
  unsmoked: {
    label: 'Unsmoked',
    mult: 0.86,
    badge: 'Unsmoked',
    seal: null,
    subtitle: 'Zheng Shan Xiao Zhong · no pine smoke',
    harvest: 'May, mature leaf, dried without smoke',
    copy: 'Lapsang souchong as it was before the smoke became the point. The same Tongmu leaf, the same withering and rolling, dried over clean heat rather than pine: longan, cocoa and a faint pine-resin sweetness that is in the leaf, not laid on it. If you have only met lapsang in the smoked form, this is the tea underneath it.',
    hook: 'The Tongmu leaf with the pine smoke taken away: longan, cocoa, and a resin sweetness that is in the leaf itself.',
    notes: ['Longan', 'Cocoa', 'No smoke', 'Tongmu leaf'],
  },
  ancient_tree: {
    label: 'Ancient tree',
    mult: 1.5,
    badge: 'Ancient tree',
    seal: null,
    subtitle: 'Old-tree pick · thicker leaf, deeper cup',
    harvest: 'Spring, picked from trees over a century old',
    copy: 'Leaf from trees a century or more old, picked from ladders rather than waist-high bushes. Old trees grow slowly and put less into yield and more into the leaf, which shows up as a thicker body, a sweetness with no edge, and a cup that keeps giving after the bushes have given up. The price gap is real and it is the one place in black tea where it is reliably worth paying.',
    hook: 'Picked from century-old trees on ladders: less leaf, thicker body, and a sweetness with no edge at all.',
    notes: ['Century-old trees', 'Thick body', 'No astringency', 'Late infusions'],
  },
  vintage_black: {
    label: 'Vintage',
    mult: 1.24,
    badge: 'Vintage',
    seal: null,
    subtitle: 'Held in store · softened by time',
    harvest: 'Held whole in store, re-tested each year',
    copy: 'Black tea is usually sold fresh and drunk fast, but the heavier Chinese hong cha will settle rather than fade if it is kept dry: the malt softens, a dried-fruit sweetness comes forward, and the cup loses the last of its briskness. This is a lot we set aside rather than sold through, and it is not something you can buy from most shops.',
    hook: 'Held back in store rather than sold through: the malt softened, dried fruit forward, the briskness gone.',
    notes: ['Held in store', 'Softened malt', 'Dried fruit', 'Settled'],
  },
  mao_feng: {
    label: 'Mao Feng',
    mult: 0.78,
    badge: 'Mao Feng grade',
    seal: null,
    subtitle: 'Leaf grade · full-leaf, robust',
    harvest: 'April, full leaf with tips',
    copy: 'Mao Feng is the full-leaf grade of a black tea, as opposed to the bud-only picks that dominate the top of the market. It brews darker and stronger, takes milk without collapsing, and gives you the same origin and cultivar at roughly half the price of the tippy grades — the everyday version of the tea above it.',
    hook: 'The full-leaf grade: darker, stronger, takes milk, and costs about half the bud-only pick above it.',
    notes: ['Full leaf', 'Robust', 'Takes milk', 'Everyday grade'],
  },

  /* --------------------------------------------------------------- pu-erh */
  sheng_vintage: {
    label: 'Sheng',
    mult: 1.0,
    badge: 'Raw · aged',
    seal: null,
    subtitle: 'Raw cake · matured in Kunming',
    harvest: 'Spring pick, pressed and stored dry since',
    copy: 'A raw cake does nothing quickly. Sheng pu-erh is pressed from sun-dried leaf and then left alone, and the transformation happens over a decade or more as the tea slowly oxidises and ferments in the cake. Young sheng is bitter, green and bracing; this one has had time to lose the bite and take on stone fruit, camphor and a sweetness that arrives in the throat rather than the mouth.',
    hook: 'Pressed raw and left alone for years: the bite gone, stone fruit and camphor in its place, sweetness in the throat.',
    notes: ['Raw pressed', 'Stone fruit', 'Camphor', 'Dry-stored'],
  },
  shou_vintage: {
    label: 'Shou',
    mult: 1.0,
    badge: 'Ripe · aged',
    seal: null,
    subtitle: 'Ripe cake · pile-fermented, then rested',
    harvest: 'Pile-fermented, pressed, then rested in store',
    copy: 'Ripe pu-erh is accelerated deliberately: the leaf is piled, wetted and turned until it ferments in weeks rather than decades. Done well, and then rested for years to let the fermentation settle, it gives the dark, earthy, almost petrichor depth of an old tea without the wait. Done badly it tastes of the wet floor of a cellar, which is why we taste every lot before it is pressed.',
    hook: 'Pile-fermented in weeks rather than decades, then rested for years until the fermentation settles into earth and old wood.',
    notes: ['Dark and earthy', 'Old wood', 'Rested', 'No bitterness'],
  },
  old_vintage: {
    label: 'Library',
    mult: 1.62,
    badge: 'Library lot',
    seal: null,
    subtitle: 'Fifteen years or more · re-tested yearly',
    harvest: 'Pressed two decades ago, stored dry and re-tested',
    copy: 'A library lot is a cake we bought, stored and then could not bring ourselves to sell until it had become something we wanted to drink. At this age the tea has stopped changing quickly and settled into its final character: camphor, Chinese medicine, dried dates and a liquor that is almost black yet tastes entirely clean. Quantities are counted in cakes, not kilograms.',
    hook: 'Stored twenty years until it settled into camphor, dried dates and a black liquor that tastes entirely clean.',
    notes: ['Twenty years', 'Camphor', 'Dried dates', 'Counted in cakes'],
  },
  mountain_sheng: {
    label: 'Mountain',
    mult: 1.3,
    badge: 'Single mountain',
    seal: null,
    subtitle: 'One mountain · ancient-tree leaf',
    harvest: 'Spring, ancient-tree leaf from one mountain',
    copy: 'Pu-erh is bought by mountain before it is bought by year, because the soil and the altitude of the slope are what the tea will taste of in twenty years. This is leaf from ancient trees on a single mountain, pressed on its own rather than blended, so it carries that mountain\'s particular combination of bitterness, sweetness and aroma rather than an average of several.',
    hook: 'Single-mountain ancient-tree leaf, pressed on its own: one slope\'s bitterness, sweetness and aroma instead of a blend.',
    notes: ['Single mountain', 'Ancient trees', 'Unblended', 'Ages well'],
  },

  /* -------------------------------------------------------------- floral */
  seven_scent: {
    label: 'Seven scent',
    mult: 0.88,
    badge: 'Seven scent',
    seal: null,
    subtitle: 'Scented seven times · jasmine',
    harvest: 'Summer tea scented across seven July nights',
    copy: 'Scenting is a repeated process, not a single one: fresh jasmine is layered with the tea at night when the flowers open, removed in the morning, and the whole thing repeated with new flowers. Seven scentings is a serious tea; the flowers are counted, not measured, and it takes seven nights of someone staying up to make it.',
    hook: 'Seven nights of fresh jasmine, layered and removed each morning: serious scenting without the top grade\'s price.',
    notes: ['Seven nights', 'Fresh flowers', 'Layered by hand', 'Balanced'],
  },
  five_scent: {
    label: 'Five scent',
    mult: 0.62,
    badge: 'Five scent',
    seal: null,
    subtitle: 'Scented five times · green base',
    harvest: 'Green tea base scented across five nights',
    copy: 'Five scentings on a green tea base gives a cup where the jasmine and the tea are still two things you can taste separately, rather than the seamless single note that heavy scenting produces. Some drinkers prefer it for exactly that reason. It is also the grade that stays cheapest, because the process is counted in nights rather than in flower quality.',
    hook: 'Five nights of jasmine over a green base, where flower and tea stay two distinguishable things in the cup.',
    notes: ['Five nights', 'Green base', 'Distinct layers', 'Everyday'],
  },
  osmanthus_dan_cong: {
    label: 'Osmanthus',
    mult: 1.16,
    badge: 'Osmanthus',
    seal: null,
    subtitle: 'Dan Cong base · scented with October blossom',
    harvest: 'Dan Cong base scented with October osmanthus',
    copy: 'Osmanthus blossoms in October, briefly, and the window to scent with them is about a week. Layered over a Dan Cong oolong rather than a green or a black, the apricot-and-honey note of the flower and the stone-fruit depth of the tea reinforce each other, and the result is a scented tea that still tastes like tea.',
    hook: 'October osmanthus laid over Dan Cong: apricot and honey meeting stone fruit, still tasting of tea rather than perfume.',
    notes: ['October blossom', 'Dan Cong base', 'Apricot', 'One-week window'],
  },
  osmanthus_black: {
    label: 'Osmanthus',
    mult: 0.9,
    badge: 'Osmanthus',
    seal: null,
    subtitle: 'Black tea base · scented with October blossom',
    harvest: 'Black tea base scented with October osmanthus',
    copy: 'The same flower over a fully oxidised base behaves completely differently: instead of brightening the cup, the osmanthus sinks into the malt and draws out a dark, jammy, almost brandied sweetness. It takes milk unusually well for a scented tea, and it is the one in this range that improves in a thermos.',
    hook: 'The same flower over a black base, sinking into the malt: dark, jammy, and the one scented tea that takes milk.',
    notes: ['Black base', 'Jammy', 'Takes milk', 'Autumn blossom'],
  },
  rose_white: {
    label: 'Rose',
    mult: 1.04,
    badge: 'Rose',
    seal: null,
    subtitle: 'White tea base · whole rose buds',
    harvest: 'White peony base with whole May rose buds',
    copy: 'Whole dried rose buds over white peony, rather than rose petals scattered into a green tea. The white base is sweet and hay-like and low in astringency, so the rose has nothing to fight: what you get is a cup that tastes of both, softly, and turns a pale blush pink as it steeps.',
    hook: 'Whole rose buds over white peony, so the flower has nothing to fight: soft, sweet, and faintly pink in the cup.',
    notes: ['Whole buds', 'White peony base', 'Soft', 'Blush liquor'],
  },
  rose_green: {
    label: 'Rose',
    mult: 0.68,
    badge: 'Rose',
    seal: null,
    subtitle: 'Green tea base · petal blend',
    harvest: 'Green tea base with rose petals',
    copy: 'Rose petals blended through a green tea rather than layered as whole buds: lighter, drier and more floral than the white-tea version, with the green base still clearly visible underneath. It is the most forgiving rose tea to brew and the one that iced best.',
    hook: 'Petals rather than whole buds over a green base: drier, lighter, still visibly green, and the one to drink iced.',
    notes: ['Petal blend', 'Green base', 'Ices well', 'Forgiving'],
  },
  tai_ju: {
    label: 'Tai Ju',
    mult: 1.2,
    badge: 'Tai Ju',
    seal: null,
    subtitle: 'Hangzhou Tai Ju · hand-picked at full bloom',
    harvest: 'November, hand-picked at full bloom and shade-dried',
    copy: 'Tai Ju is the fat, pale chrysanthemum grown around Hangzhou and picked at full bloom in November. The flowers are shade-dried whole rather than baked, which keeps the essential oil in the petal and gives a cup that is honeyed and faintly cooling. Brewed with a little rock sugar it is what the city drinks all winter.',
    hook: 'Whole Hangzhou chrysanthemums, shade-dried at full bloom: honeyed, faintly cooling, and what the city drinks in winter.',
    notes: ['Whole flowers', 'Shade-dried', 'Honeyed', 'Cooling'],
  },
  wild_chrysanthemum: {
    label: 'Wild',
    mult: 0.74,
    badge: 'Wild grown',
    seal: null,
    subtitle: 'Wild-grown · smaller flower, sharper cup',
    harvest: 'Autumn, wild-grown, picked small',
    copy: 'Wild chrysanthemum is smaller, uglier and considerably more bitter than the cultivated Tai Ju, and it is drunk for that bitterness rather than despite it — it is the tea the Chinese reach for at the start of a cold. Steep it shorter than the cultivated flower or it will take the roof off your mouth.',
    hook: 'Smaller, sharper and deliberately bitter: the flower the Chinese reach for at the first sign of a cold.',
    notes: ['Wild grown', 'Bitter by design', 'Steep short', 'Winter remedy'],
  },
  snow_chrysanthemum: {
    label: 'Snow',
    mult: 1.42,
    badge: 'Snow chrysanthemum',
    seal: null,
    subtitle: 'Kunlun snow chrysanthemum · high-altitude',
    harvest: 'High-altitude bloom from the Kunlun foothills',
    copy: 'Snow chrysanthemum grows at altitude in the Kunlun foothills and is a different plant from the garden chrysanthemum: tiny, deep orange, and so heavy in essential oil that a single flower colours a whole pot a clear amber. It is naturally sweet with no bitterness at all, and it is the most expensive flower in this range by a wide margin.',
    hook: 'One tiny orange flower from the Kunlun foothills turns a whole pot amber, and it is sweet with no bitterness at all.',
    notes: ['High altitude', 'Deep amber', 'Naturally sweet', 'No bitterness'],
  },
};

/**
 * The lots to build, grouped by the base tea they extend.
 *
 * `base` is an existing product slug. `seal` is omitted when the lot shares the
 * base tea's chop word, so the artwork keeps one identity per tea.
 */
export const TEA_LOT_ROWS = [
  /* green tea — +10 */
  { base: 'lion-peak-longjing', lot: 'yuqian', name: 'Lion Peak Longjing — Yuqian' },
  { base: 'lion-peak-longjing', lot: 'guyu', name: 'Lion Peak Longjing — Late Spring' },
  { base: 'lion-peak-longjing', lot: 'autumn', name: 'Lion Peak Longjing — Autumn' },
  { base: 'biluochun-spring-snail', lot: 'yuqian', name: 'Biluochun — Yuqian' },
  { base: 'biluochun-spring-snail', lot: 'guyu', name: 'Biluochun — Late Spring' },
  { base: 'biluochun-spring-snail', lot: 'autumn', name: 'Biluochun — Autumn' },
  { base: 'huangshan-maofeng', lot: 'yuqian', name: 'Huangshan Maofeng — Yuqian' },
  { base: 'huangshan-maofeng', lot: 'guyu', name: 'Huangshan Maofeng — Late Spring' },
  { base: 'taiping-houkou', lot: 'yuqian', name: 'Taiping Houkui — Yuqian' },
  { base: 'taiping-houkou', lot: 'autumn', name: 'Taiping Houkui — Autumn' },

  /* white tea — +9 */
  { base: 'silver-needle-baihao', lot: 'aged', name: 'Silver Needle — Aged', vintage: 2021, seal: 'Silver' },
  { base: 'silver-needle-baihao', lot: 'aged', name: 'Silver Needle — Library', vintage: 2016, seal: 'Silver' },
  { base: 'white-peony-yueguangbai', lot: 'aged', name: 'White Peony — Aged', vintage: 2021, seal: 'Peony' },
  { base: 'white-peony-yueguangbai', lot: 'aged', name: 'White Peony — Library', vintage: 2015, seal: 'Peony' },
  { base: 'white-peony-yueguangbai', lot: 'gongmei', name: 'White Peony — Gongmei Grade', seal: 'Peony' },
  { base: 'aged-white-2019-shoumei', lot: 'aged', name: 'Shoumei — Library', vintage: 2013, seal: 'Aged' },
  { base: 'aged-white-2019-shoumei', lot: 'gongmei', name: 'Shoumei — Gongmei Grade', seal: 'Aged' },
  { base: 'silver-needle-baihao', lot: 'gongmei', name: 'Silver Needle — Gongmei Grade', seal: 'Silver' },
  { base: 'aged-white-2019-shoumei', lot: 'aged', name: 'Shoumei — Aged', vintage: 2020, seal: 'Aged' },

  /* oolong — +9 */
  { base: 'tieguanyin-iron-goddess', lot: 'light_roast', name: 'Tieguanyin — Light Roast' },
  { base: 'tieguanyin-iron-goddess', lot: 'charcoal', name: 'Tieguanyin — Charcoal-baked' },
  { base: 'tieguanyin-iron-goddess', lot: 'aged_oolong', name: 'Tieguanyin — Aged' },
  { base: 'tieguanyin-iron-goddess', lot: 'competition', name: 'Tieguanyin — Competition Lot' },
  { base: 'milk-oolong-jinxuan', lot: 'light_roast', name: 'Jin Xuan Milk Oolong — Light Roast' },
  { base: 'milk-oolong-jinxuan', lot: 'charcoal', name: 'Jin Xuan Milk Oolong — Charcoal-baked' },
  { base: 'dong-ding-oolong', lot: 'light_roast', name: 'Dong Ding — Light Roast' },
  { base: 'dong-ding-oolong', lot: 'charcoal', name: 'Dong Ding — Charcoal-baked' },
  { base: 'dong-ding-oolong', lot: 'aged_oolong', name: 'Dong Ding — Aged' },

  /* dan cong — +8, each a different single bush */
  { base: 'mi-lan-xiang-dan-cong', lot: 'competition', name: 'Huang Zhi Xiang Dan Cong', seal: 'Gardenia', rename: true, subtitle: 'Gardenia aroma · single bush' },
  { base: 'mi-lan-xiang-dan-cong', lot: 'competition', name: 'Gui Hua Xiang Dan Cong', seal: 'Osmanthus', rename: true, subtitle: 'Osmanthus aroma · single bush' },
  { base: 'mi-lan-xiang-dan-cong', lot: 'competition', name: 'Xing Ren Xiang Dan Cong', seal: 'Apricot', rename: true, subtitle: 'Apricot kernel aroma · single bush' },
  { base: 'mi-lan-xiang-dan-cong', lot: 'competition', name: 'Jiang Hua Xiang Dan Cong', seal: 'Ginger', rename: true, subtitle: 'Ginger flower aroma · single bush' },
  { base: 'ya-shi-xiang-dan-cong', lot: 'charcoal', name: 'Rou Gui Xiang Dan Cong', seal: 'Cassia', rename: true, subtitle: 'Cinnamon aroma · charcoal-baked' },
  { base: 'ya-shi-xiang-dan-cong', lot: 'charcoal', name: 'Mo Li Xiang Dan Cong', seal: 'Jasmine', rename: true, subtitle: 'Jasmine aroma · charcoal-baked' },
  { base: 'ya-shi-xiang-dan-cong', lot: 'aged_oolong', name: 'Zhi Lan Xiang Dan Cong', seal: 'Orchid', rename: true, subtitle: 'Orchid aroma · aged' },
  { base: 'ya-shi-xiang-dan-cong', lot: 'aged_oolong', name: 'Bai Ye Dan Cong', seal: 'White Leaf', rename: true, subtitle: 'White leaf cultivar · aged' },

  /* rock oolong — +10 */
  { base: 'wuyi-shuixian', lot: 'lao_cong', name: 'Lao Cong Shuixian', seal: 'Old Bush', rename: true, subtitle: 'Sixty-year-old bushes · old bush' },
  { base: 'wuyi-shuixian', lot: 'charcoal', name: 'Wuyi Shuixian — Charcoal-baked' },
  { base: 'wuyi-shuixian', lot: 'aged_oolong', name: 'Wuyi Shuixian — Aged' },
  { base: 'da-hong-pao', lot: 'rou_gui', name: 'Rou Gui', rename: true },
  { base: 'da-hong-pao', lot: 'rou_gui', name: 'Rou Gui — Heavy Roast', subtitle: 'Rou Gui bush · heavy charcoal roast' },
  { base: 'da-hong-pao', lot: 'shui_jin_gui', name: 'Shui Jin Gui', rename: true },
  { base: 'da-hong-pao', lot: 'tie_luo_han', name: 'Tie Luo Han', rename: true },
  { base: 'da-hong-pao', lot: 'bai_ji_guan', name: 'Bai Ji Guan', rename: true },
  { base: 'da-hong-pao', lot: 'competition', name: 'Da Hong Pao — Competition Lot' },
  { base: 'wuyi-shuixian', lot: 'competition', name: 'Wuyi Shuixian — Competition Lot' },

  /* black tea — +9 */
  { base: 'lapsang-souchong-tongmuguan', lot: 'unsmoked', name: 'Tongmu Souchong — Unsmoked' },
  { base: 'lapsang-souchong-tongmuguan', lot: 'ancient_tree', name: 'Tongmu Souchong — Ancient Tree' },
  { base: 'yunnan-dianhong-golden-bud', lot: 'ancient_tree', name: 'Dian Hong — Ancient Tree' },
  { base: 'yunnan-dianhong-golden-bud', lot: 'mao_feng', name: 'Dian Hong — Mao Feng Grade' },
  { base: 'yunnan-dianhong-golden-bud', lot: 'vintage_black', name: 'Dian Hong — Vintage' },
  { base: 'keemun-hao-ya', lot: 'mao_feng', name: 'Keemun — Mao Feng Grade' },
  { base: 'keemun-hao-ya', lot: 'vintage_black', name: 'Keemun — Vintage' },
  { base: 'jin-jun-mei', lot: 'vintage_black', name: 'Jin Jun Mei — Vintage' },
  { base: 'jin-jun-mei', lot: 'competition', name: 'Jin Jun Mei — Tongmu Reserve' },

  /* pu-erh — +10 */
  { base: 'menghai-7572-shou-cake', lot: 'shou_vintage', name: 'Menghai 7572 — 2015 Vintage', vintage: 2015, seal: 'Ripe' },
  { base: 'menghai-7572-shou-cake', lot: 'old_vintage', name: 'Menghai 7572 — Library', vintage: 2005, seal: 'Ripe' },
  { base: 'menghai-7572-shou-cake', lot: 'mountain_sheng', name: 'Bulang Shan Sheng', seal: 'Bulang', rename: true, subtitle: 'Bulang mountain · raw cake' },
  { base: 'jingmai-raw-sheng-cake', lot: 'sheng_vintage', name: 'Jingmai Sheng — 2018 Vintage', vintage: 2018, seal: 'Raw' },
  { base: 'jingmai-raw-sheng-cake', lot: 'sheng_vintage', name: 'Jingmai Sheng — 2016 Vintage', vintage: 2016, seal: 'Raw' },
  { base: 'jingmai-raw-sheng-cake', lot: 'sheng_vintage', name: 'Jingmai Sheng — 2014 Vintage', vintage: 2014, seal: 'Raw' },
  { base: 'jingmai-raw-sheng-cake', lot: 'mountain_sheng', name: 'Yiwu Shan Sheng', seal: 'Yiwu', rename: true, subtitle: 'Yiwu mountain · raw cake' },
  { base: 'jingmai-raw-sheng-cake', lot: 'mountain_sheng', name: 'Lao Man E Sheng', seal: 'Man E', rename: true, subtitle: 'Lao Man E mountain · raw cake' },
  { base: 'aged-shou-tuocha-2008', lot: 'old_vintage', name: 'Aged Shou Tuocha — Library', vintage: 2003, seal: 'Vintage' },
  { base: 'aged-shou-tuocha-2008', lot: 'shou_vintage', name: 'Aged Shou Tuocha — 2012 Vintage', vintage: 2012, seal: 'Vintage' },

  /* floral — +10 */
  { base: 'jasmine-pearls-nine-scent', lot: 'seven_scent', name: 'Jasmine Pearls — Seven Scent', seal: 'Jasmine' },
  { base: 'jasmine-pearls-nine-scent', lot: 'five_scent', name: 'Jasmine Pearls — Five Scent', seal: 'Jasmine' },
  { base: 'jasmine-pearls-nine-scent', lot: 'seven_scent', name: 'Jasmine Silver Needle — Seven Scent', seal: 'Jasmine', subtitle: 'Silver needle base · seven nights of jasmine' },
  { base: 'osmanthus-oolong', lot: 'osmanthus_dan_cong', name: 'Osmanthus Dan Cong', seal: 'Osmanthus' },
  { base: 'osmanthus-oolong', lot: 'osmanthus_black', name: 'Osmanthus Black Tea', seal: 'Osmanthus' },
  { base: 'rose-black-tea', lot: 'rose_white', name: 'Rose White Peony', seal: 'Rose' },
  { base: 'rose-black-tea', lot: 'rose_green', name: 'Rose Green Tea', seal: 'Rose' },
  { base: 'chrysanthemum-tai-ju', lot: 'tai_ju', name: 'Tai Ju — Reserve Grade', seal: 'Chrysanthemum' },
  { base: 'chrysanthemum-tai-ju', lot: 'wild_chrysanthemum', name: 'Wild Chrysanthemum', seal: 'Wild' },
  { base: 'chrysanthemum-tai-ju', lot: 'snow_chrysanthemum', name: 'Snow Chrysanthemum', seal: 'Snow' },
];
