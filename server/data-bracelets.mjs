/**
 * Bracelets, generated from the shape of the supplier's image set.
 *
 * The archive arrived as a hundred and eight images named
 * `<material>-<shape>-<style>-bracelet`, and the naming turns out to be exact
 * rather than approximate: twenty-seven materials, each cut into four bead
 * shapes, each strung in one of nine styles, and the three groupings are
 * perfectly regular — every material falls into one of three four-shape sets,
 * and every style takes exactly one material from each set. So the catalogue is
 * described here as what it is, and the hundred and eight rows are derived from
 * it rather than typed out. Typing them would have been a hundred and eight
 * chances to introduce a typo that the importer then could not match to an
 * image.
 *
 * Prices sit in the band the operator gave for this department, CAD 150 to
 * 1,500, and they come from the material first — which is what actually drives
 * price in this trade — with a factor for the bead shape and the stringing,
 * because a carved blossom bead and a plain cube are not the same work.
 *
 * On the copy: these are real, named materials and the notes describe what each
 * one actually is, so nothing here claims a property a stone does not have. The
 * one thing the site must never do with a bead bracelet is imply a health
 * benefit, so none is claimed anywhere.
 */

/* -------------------------------------------------------------------------- */
/*  Materials                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `price` is the material's own standing, in CAD, before work.
 * `note` is what the stone or wood is; `care` is how to keep it.
 */
export const BRACELET_MATERIALS = {
  agarwood: {
    name: 'Agarwood',
    origin: 'Hainan, China',
    price: 380,
    note: 'Agarwood is not a species but a reaction. When Aquilaria wood is wounded it produces a dark, heavily perfumed resin, and only the resinous heartwood is sold as agarwood — the pale sapwood around it is worthless. It is graded on how much resin it holds, not on its age, and a bead that is dark all the way through is worth many times one that is dark only at the surface.',
    care: 'Keep it away from water and from strong sunlight. Warm it in the hand occasionally; the resin releases its scent with body heat and the wood darkens slowly with wear.',
  },
  amethyst: {
    name: 'Amethyst',
    origin: 'Rio Grande do Sul, Brazil',
    price: 700,
    note: 'Amethyst is quartz coloured by iron, and its tone depends on how much of that iron was exposed to natural radiation in the ground. The best beads are cut from the clear, evenly coloured core of a geode; beads taken from the outer banding go pale and patchy, which is why two strands can look nothing alike at the same price.',
    care: 'Amethyst fades in prolonged direct sunlight. Store it out of a window and clean it with water and a soft cloth.',
  },
  'antique-brass': {
    name: 'Antique Brass',
    origin: 'Guangdong, China',
    price: 210,
    note: 'Brass is copper and zinc, and the antique finish is a deliberately oxidised surface rather than a coating, so it wears into a warmer, darker tone instead of flaking off the way plated metal does. It is heavier in the hand than it looks, which is most of why it reads as old rather than new.',
    care: 'The patina is the point, so do not polish it. A dry cloth is enough; water and metal polish both strip the finish.',
  },
  'black-onyx': {
    name: 'Black Onyx',
    origin: 'Brazil',
    price: 380,
    note: 'Black onyx is chalcedony, a form of quartz with microscopic fibres rather than crystals, which is why it polishes to a mirror without a grain. Most onyx in the trade is banded agate that has been dyed; the honest ones are cut from naturally black seams, which are scarcer and keep their colour rather than turning grey at the edges.',
    care: 'Hard-wearing and easy. Avoid household acids and ultrasonic cleaners, which can pull the dye from treated beads.',
  },
  'black-tourmaline': {
    name: 'Black Tourmaline',
    origin: 'Minas Gerais, Brazil',
    price: 640,
    note: 'Black tourmaline, or schorl, is the iron-rich end of the tourmaline family and the only one that is common. Cut across the crystal it has fine parallel striations and a low, soft sheen rather than a high polish; along the length it is almost black. Beads are cut from the thicker crystals and are unusually heavy for their size.',
    care: 'Tough, but brittle across the length of the crystal. Avoid knocks rather than chemicals.',
  },
  'blue-lace-agate': {
    name: 'Blue Lace Agate',
    origin: 'Namibia',
    price: 420,
    note: 'Blue lace agate is banded chalcedony from a single area of Namibia, and the banding is fine enough to look like lace — pale blue over white, in concentric rings. It is translucent in thin sections and almost opaque in thick ones, which is why a small bead looks deeper in colour than a large one from the same nodule.',
    care: 'Softer and more porous than quartz. Keep it out of prolonged water and away from dyes.',
  },
  'botswana-agate': {
    name: 'Botswana Agate',
    origin: 'Botswana',
    price: 300,
    note: 'Botswana agate is named for its only commercial source, and it is the most quietly subtle of the agates: grey, cream and faintly pink banding with none of the dye or drama of the more famous stones. It is cut from nodules that can be half a metre across, which is why the beads on a strand can be matched closely.',
    care: 'Agate is durable and takes everyday wear. Clean with water and a cloth.',
  },
  'burnished-copper': {
    name: 'Burnished Copper',
    origin: 'Yunnan, China',
    price: 230,
    note: 'Copper is the warmest of the common metals and the only one that changes colour on the wearer rather than simply tarnishing: skin chemistry turns it slowly brown, then green. The burnished finish here is a hand-worked surface that is matt rather than mirror-bright, so it holds a highlight instead of flashing.',
    care: 'It will darken. That is the metal, not a fault. A little lemon juice restores the brightness if you want it back.',
  },
  'carnelian-agate': {
    name: 'Carnelian Agate',
    origin: 'Rajpipla, Gujarat, India',
    price: 360,
    note: 'Carnelian is chalcedony coloured by iron oxide, and the tone runs from a clear orange to a deep blood red. Much of what is sold has been heat-treated to bring out the red, which is accepted in the trade and permanent. The finer beads are slightly translucent, so a strand picks up light rather than sitting flat against the wrist.',
    care: 'Stable and hard-wearing. Direct sun will eventually dull a heat-treated strand, so store it closed.',
  },
  citrine: {
    name: 'Citrine',
    origin: 'Rio Grande do Sul, Brazil',
    price: 620,
    note: 'Almost all citrine in the trade is amethyst that has been heated until its iron turns from purple to gold; natural citrine is rare and paler. The heat treatment is stable and universally accepted, but it is worth knowing which you have, because the two are priced very differently and only one of them is what the older books describe.',
    care: 'Fades in strong sunlight over years. Keep it away from a windowsill and it will hold its colour.',
  },
  'clear-quartz': {
    name: 'Clear Quartz',
    origin: 'Hubei, China',
    price: 460,
    note: 'Clear quartz is rock crystal: pure silicon dioxide with no colouring element at all, which is precisely why it is hard to buy well. There is nothing to hide flaws behind, so a fine strand is judged entirely on how few inclusions and internal fractures it carries.',
    care: 'Hard and chemically stable. Wash with water; avoid sudden temperature change if the beads are large.',
  },
  'ebony-wood': {
    name: 'Ebony',
    origin: 'Côte d\'Ivoire',
    price: 200,
    note: 'Ebony is the near-black heartwood of the Diospyros genus, and the black is the whole of its value: the sapwood around it is pale and useless, so a tree yields very little. It is denser than water in some species, which is why an ebony bead feels like stone in the hand rather than like wood.',
    care: 'Keep it out of water, which raises the grain, and out of dry heat, which cracks it. A little oil once a year is plenty.',
  },
  'green-sandalwood': {
    name: 'Green Sandalwood',
    origin: 'Yunnan, China',
    price: 300,
    note: 'Green sandalwood is a dense, slow-growing wood with a pale olive cast and a scent that is much lighter and greener than the cream-coloured sandalwood used for incense. Its colour deepens with exposure to light and air, so a strand bought this year is noticeably darker in three.',
    care: 'The fragrance fades as the surface oils dry. Keep it from water and it will hold for years, longer in a sealed box.',
  },
  howlite: {
    name: 'Howlite',
    origin: 'Nova Scotia, Canada',
    price: 280,
    note: 'Howlite is a borate mineral, white or pale grey with a web of dark veins, and it is far softer than the stones it is usually mistaken for. Most turquoise-coloured howlite on the market is dyed, and honest sellers say so; undyed howlite is a quiet, chalky white and is priced as what it is.',
    care: 'Soft and porous. It will take up dye from clothing and darken with hand cream, so put it on last.',
  },
  'lava-stone': {
    name: 'Lava Stone',
    origin: 'Reykjanes, Iceland',
    price: 220,
    note: 'Lava stone beads are cut from basalt, which is what a volcano leaves behind, and their surface is full of the gas bubbles that were trapped as the rock cooled. That porosity is the whole point of them: they are matte, very light for their size, and warm rather than cold against the skin.',
    care: 'The porous surface will take up oil and scent. Wash with mild soap when it looks tired.',
  },
  'magnetic-hematite': {
    name: 'Magnetic Hematite',
    origin: 'Assembled in Guangdong, China',
    price: 240,
    note: 'Hematite is iron oxide and naturally a dull steel grey; the bright, mirror-finished beads sold under the name are usually a synthetic iron alloy, and the magnetic ones are always synthetic, because natural hematite is not magnetic. It is a heavy, cool material with a hard metallic look that photographs almost like gunmetal.',
    care: 'The plating on synthetic beads can wear at contact points. Keep it dry and it will hold its finish.',
  },
  'moss-agate': {
    name: 'Moss Agate',
    origin: 'Rajpipla, Gujarat, India',
    price: 600,
    note: 'Moss agate is clear chalcedony with green inclusions of chlorite or hornblende caught inside it, so the green is genuinely inside the stone rather than on its surface. No two beads contain the same pattern, and matching a strand means accepting that the pattern will vary along it.',
    care: 'Durable, but the inclusions are softer than the quartz around them. Avoid abrasive cleaners.',
  },
  obsidian: {
    name: 'Obsidian',
    origin: 'Jalisco, Mexico',
    price: 340,
    note: 'Obsidian is volcanic glass — lava that cooled too quickly to crystallise — which is why it is smoother and sharper-edged than any stone and why it can hold a polish no mineral can match. In thin sections it is translucent brown or green rather than black.',
    care: 'It is glass, so it chips rather than scratches. Keep it away from hard edges and from other jewellery.',
  },
  'peach-wood': {
    name: 'Peach Wood',
    origin: 'Zhejiang, China',
    price: 180,
    note: 'Peach wood has been carved in China for at least two thousand years, traditionally into small protective pieces, and the wood itself is close-grained, pale and takes a carving well. It darkens to a warm honey with handling, which is the reason a strand looks better after a year than on the day it arrives.',
    care: 'Keep it dry. The wood is soft enough to mark, so store it away from metal.',
  },
  'red-banded-agate': {
    name: 'Red Banded Agate',
    origin: 'Chalcedony deposits, Brazil',
    price: 400,
    note: 'Red banded agate is chalcedony with its iron oxide laid down in layers, so the bands are the structure of the stone rather than a pattern on it. Cutting beads across the banding gives the concentric rings; cutting along it gives the flat stripes. A single strand is usually cut one way for consistency.',
    care: 'Hard and stable, and one of the few stones here that will take an ultrasonic cleaner. Water and a cloth are simpler.',
  },
  'red-sandalwood': {
    name: 'Red Sandalwood',
    origin: 'Andhra Pradesh, India',
    price: 320,
    note: 'Red sandalwood is one of the densest woods traded, and the heartwood is a deep oxblood red that fades towards brown only after years of light. It has no scent to speak of, unlike the sandalwood used for incense; what it has is weight and colour, and it holds both.',
    care: 'Wipe rather than wash. Oil once a year if it looks dry; nothing more is needed.',
  },
  'rose-quartz': {
    name: 'Rose Quartz',
    origin: 'Minas Gerais, Brazil',
    price: 520,
    note: 'Rose quartz takes its pink from traces of titanium, iron or manganese, and the colour is famously unstable: almost all of it fades in strong sunlight, some of it within a season. The deeper beads come from the core of the crystal, where the colouring is densest, and they hold better than the pale outer material.',
    care: 'Keep it out of direct sun. This is the one material here whose colour is genuinely at risk from a windowsill.',
  },
  rosewood: {
    name: 'Rosewood',
    origin: 'Guangdong, China',
    price: 240,
    note: 'Rosewood is a trade name covering several dense tropical hardwoods, sold here for the depth of its colour and the fineness of its grain rather than for any scent. It is warm to the touch in a way that stone is not, which is most of why a wood bracelet is worn rather than kept in a box.',
    care: 'Avoid water and dry heat. A drop of oil rubbed in once a year keeps the grain closed.',
  },
  'rutilated-quartz': {
    name: 'Rutilated Quartz',
    origin: 'Bahia, Brazil',
    price: 780,
    note: 'Rutilated quartz is clear quartz containing needles of rutile, a titanium dioxide that grew inside the crystal as it formed. The needles run in one direction through the host, so a bead cut across them sparkles with points and one cut along them shows fine golden lines — which means the orientation of the cut is most of what you are paying for.',
    care: 'Hard and stable. The needles are enclosed, so nothing needs special care.',
  },
  'smoky-quartz': {
    name: 'Smoky Quartz',
    origin: 'Minas Gerais, Brazil',
    price: 480,
    note: 'Smoky quartz is quartz darkened by natural radiation acting on traces of aluminium in the crystal, which is the same process that makes amethyst purple. The best of it is a warm brown that is translucent rather than murky, and beads cut from the clear upper part of a crystal are far more expensive than the near-black ones from the base.',
    care: 'Stable and hard-wearing. Wash with water and a soft cloth.',
  },
  'stainless-steel': {
    name: 'Stainless Steel',
    origin: 'Guangdong, China',
    price: 190,
    note: '316L stainless is the grade used for jewellery because it contains molybdenum, which is what stops it pitting in salt and sweat where cheaper grades do not. It is not plated, so there is nothing to wear through, and the brushed finish can be restored with a scouring pad in a way no plated metal can.',
    care: 'Effectively maintenance-free. A cloth is enough; it will not tarnish or discolour the skin.',
  },
  'tiger-eye': {
    name: 'Tiger Eye',
    origin: 'Northern Cape, South Africa',
    price: 560,
    note: 'Tiger eye is quartz that replaced the fibres of crocidolite while keeping their structure, and that structure is what produces the chatoyant band of light that slides across the surface as the stone turns. It is a replacement, not a coating: the shimmer comes from inside the stone and runs the full depth of it.',
    care: 'Durable and easy. The effect dulls if the surface is scratched, so store it away from harder stones.',
  },
};

/* -------------------------------------------------------------------------- */
/*  Bead shapes                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The four shapes each material is cut into. `work` is how much more hands-on
 * time the shape takes than the simplest one in its set, which is the honest
 * reason a carved bead costs more than a plain one of the same stone.
 */
export const BEAD_SHAPES = {
  coin: {
    label: 'Coin',
    work: 0.95,
    summary: "Flat discs that lay the pattern of the stone flat to the eye.",
    note: 'Flat discs cut so the face of each bead is a full cross-section of the stone. It is the shape that shows the most material per bead and the least of the drill hole, and on a banded or figured stone it puts the pattern flat to the eye instead of wrapping it around a curve.',
    size: 'coin beads, 8 mm',
  },
  'diamond-facet': {
    label: 'Faceted',
    work: 1.3,
    summary: "Hand-ground facets that catch light a smooth bead would pass straight through.",
    note: 'Each bead is ground with flat facets around its circumference, cut by hand on a lap. Faceting costs more work than any other shape here and it earns it on a translucent stone, where the flat planes catch and return light that a smooth bead would pass straight through.',
    size: 'faceted beads, 8 mm',
  },
  fluted: {
    label: 'Fluted',
    work: 1.2,
    summary: "Fine longitudinal grooves, so the surface reads as texture rather than sparkle.",
    note: 'Beads cut with fine longitudinal grooves running the length of each one, so the surface catches light in narrow lines rather than a single highlight. It is a quiet, old-fashioned treatment, and it reads as texture from across a room rather than as sparkle.',
    size: 'fluted beads, 8 mm',
  },
  rondelle: {
    label: 'Rondelle',
    work: 1.0,
    summary: "Wide shallow discs that sit flush, so the strand hangs as a continuous band.",
    note: 'A wide, shallow disc, close to a coin but thicker and with a rounded edge. Rondelles sit against each other with almost no gap, so a strand made of them hangs as a continuous band rather than as a row of separate beads.',
    size: 'rondelles, 6 × 10 mm',
  },
  barrel: {
    label: 'Barrel',
    work: 1.05,
    summary: "Rounded cylinders that give the strand weight and almost no movement.",
    note: 'Cylinders with rounded ends, longer than they are wide, which makes the strand hang with weight and very little movement. On a matte material the shape reads as deliberate and industrial; on a polished one it turns a bracelet into a solid band.',
    size: 'barrel beads, 10 mm',
  },
  hexagon: {
    label: 'Hexagon',
    work: 1.25,
    summary: "Six flat faces to every bead: an architectural strand rather than a smooth curve.",
    note: 'Six flat faces cut around each bead, so the strand shows a broken line of edges rather than a smooth curve. It takes the same work as faceting but the effect is architectural — it suits a metal or a matte stone far better than anything translucent.',
    size: 'hexagon beads, 8 mm',
  },
  'natural-nugget': {
    label: 'Nugget',
    work: 0.9,
    summary: "Beads left in the shape the rough broke into, so no two carry the same pattern.",
    note: 'Beads left in the shape the rough material broke into, tumbled smooth but otherwise uncut. It is the least worked shape here, and on a stone with strong veining it produces the most varied strand, because no two beads carry the same piece of the pattern.',
    size: 'nugget beads, 8–10 mm',
  },
  oval: {
    label: 'Oval',
    work: 1.0,
    summary: "The classic bead, slightly longer than round, so the strand follows the wrist.",
    note: 'The classic bead: an ellipse slightly longer than it is round, which lets a strand follow the wrist without gaps at the curve. It is the shape most bracelets are strung in, and the one every other shape here is a deliberate departure from.',
    size: 'oval beads, 8 × 10 mm',
  },
  'carved-blossom': {
    label: 'Carved Blossom',
    work: 1.45,
    summary: "A flower carved bead by bead and petal by petal: the most work here, and the least forgiving.",
    note: 'A carved flower cut into the face of every bead, petal by petal, on a wheel. It is the most work of any shape on this page and the least forgiving: a slip on the fifth petal means the bead is scrap, not a second-quality one.',
    size: 'carved blossom beads, 10 mm',
  },
  cube: {
    label: 'Cube',
    work: 1.15,
    summary: "Square beads that hold their shape on the wrist instead of spreading.",
    note: 'Beads cut square with flat faces and softened edges. Squares sit against each other on a flat plane, so a cube strand holds its shape on the wrist where a round one spreads, and it shows more of the stone per bead than anything round.',
    size: 'cube beads, 8 mm',
  },
  rice: {
    label: 'Rice',
    work: 1.1,
    summary: "Small elongated beads strung on their length, so the strand reads as woven rather than strung.",
    note: 'Small, elongated beads, named for the shape, strung on their length so they line up in fine parallel rows. Rice beads need more of them and more drilling per centimetre than any other shape, which is the work you are paying for; the effect is a strand that looks woven rather than strung.',
    size: 'rice beads, 4 × 7 mm',
  },
  round: {
    label: 'Round',
    work: 1.0,
    summary: "True spheres, graded by hand, where every mismatch in size is visible.",
    note: 'A true sphere, which is the hardest of the simple shapes to make properly: every bead has to be drilled through its centre or the strand will not hang straight, and a wall of spheres shows every mismatch in size. Grading a round strand is most of its cost.',
    size: 'round beads, 8 mm',
  },
};

/* -------------------------------------------------------------------------- */
/*  Stringing styles                                                          */
/* -------------------------------------------------------------------------- */

/** How the strand is built. `work` covers the extra assembly and matching. */
export const STRING_STYLES = {
  'graduated-arc': {
    label: 'Graduated Arc',
    work: 1.2,
    note: 'Beads increase steadily in size from the clasp to the centre and back down the other side, so the strand has a definite middle and a definite weight. Grading a strand this way means sorting every bead by diameter first, and the beads at the centre of the arc are the ones that set the price.',
  },
  'asymmetric-muse': {
    label: 'Asymmetric',
    work: 1.1,
    note: 'Deliberately built off-centre, with the visual weight placed to one side of the wrist rather than at the middle. It is a composition rather than a pattern, so each strand is laid out by eye and no two come out the same.',
  },
  'minimal-charm': {
    label: 'Minimal Charm',
    work: 1.0,
    note: 'A plain strand of one material with a single contrasting bead or charm set to one side of the clasp. The restraint is the design: the charm is the only interruption and it is meant to be the only one.',
  },
  'segmented-trio': {
    label: 'Segmented Trio',
    work: 1.15,
    note: 'The strand is built in three repeating sections, divided by small spacers, so it reads as three bracelets stacked rather than one. It needs the beads sorted into three matched groups before anything is strung.',
  },
  'focal-centre': {
    label: 'Focal Centre',
    work: 1.25,
    note: 'One larger bead at the centre of the wrist, with everything else stepped down from it. The centrepiece is the piece you are buying and the rest of the strand exists to frame it, which is why a single replacement bead is the hard part of repairing one.',
  },
  'double-wrap-spiral': {
    label: 'Double Wrap',
    work: 1.3,
    note: 'Cut almost twice the length of a single bracelet and strung at a slight spiral, so it wraps the wrist twice and closes without a clasp. There is no clasp to fail and no fixed size to get wrong, which is why it is the most practical strand on this page.',
  },
  'classic-orbit': {
    label: 'Classic Orbit',
    work: 0.95,
    note: 'A single unbroken circle of matched beads, with no centre, no graduation and no charm. It is the plainest thing here and the least forgiving of them all, because a strand with nothing to look at has to be perfect: one bead out of size or tone is visible from across a room.',
  },
  'two-material-meridian': {
    label: 'Two Material',
    work: 1.2,
    note: 'The main material is broken at regular intervals by a second one, usually a metal or a darker stone, so the strand reads as a fine band with a repeating mark on it. Matching the two materials by eye at every junction is the work.',
  },
  'alternating-rhythm': {
    label: 'Alternating',
    work: 1.1,
    note: 'Two sizes or two tones alternate the whole way round, which changes how the strand reads at a distance — a repeating rhythm rather than a single colour. It needs twice the bead sorting of a plain strand and leaves no room for a filler bead.',
  },
};

/* -------------------------------------------------------------------------- */
/*  The hundred and eight                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One line per material: what it is cut into, and how it is strung.
 *
 * The four shapes are one of three sets, and every style takes exactly one
 * material from each set, so the three sets are named once here rather than
 * repeated twenty-seven times.
 */
const SHAPE_SET_A = ['coin', 'diamond-facet', 'fluted', 'rondelle'];
const SHAPE_SET_B = ['barrel', 'hexagon', 'natural-nugget', 'oval'];
const SHAPE_SET_C = ['carved-blossom', 'cube', 'rice', 'round'];

export const BRACELET_ROWS = [
  { material: 'agarwood', style: 'graduated-arc', shapes: SHAPE_SET_A },
  { material: 'black-tourmaline', style: 'graduated-arc', shapes: SHAPE_SET_B },
  { material: 'red-banded-agate', style: 'graduated-arc', shapes: SHAPE_SET_C },

  { material: 'amethyst', style: 'asymmetric-muse', shapes: SHAPE_SET_A },
  { material: 'howlite', style: 'asymmetric-muse', shapes: SHAPE_SET_B },
  { material: 'botswana-agate', style: 'asymmetric-muse', shapes: SHAPE_SET_C },

  { material: 'smoky-quartz', style: 'minimal-charm', shapes: SHAPE_SET_A },
  { material: 'antique-brass', style: 'minimal-charm', shapes: SHAPE_SET_B },
  { material: 'ebony-wood', style: 'minimal-charm', shapes: SHAPE_SET_C },

  { material: 'rose-quartz', style: 'segmented-trio', shapes: SHAPE_SET_A },
  { material: 'lava-stone', style: 'segmented-trio', shapes: SHAPE_SET_B },
  { material: 'black-onyx', style: 'segmented-trio', shapes: SHAPE_SET_C },

  { material: 'clear-quartz', style: 'focal-centre', shapes: SHAPE_SET_A },
  { material: 'tiger-eye', style: 'focal-centre', shapes: SHAPE_SET_B },
  { material: 'blue-lace-agate', style: 'focal-centre', shapes: SHAPE_SET_C },

  { material: 'rutilated-quartz', style: 'double-wrap-spiral', shapes: SHAPE_SET_A },
  { material: 'burnished-copper', style: 'double-wrap-spiral', shapes: SHAPE_SET_B },
  { material: 'rosewood', style: 'double-wrap-spiral', shapes: SHAPE_SET_C },

  { material: 'green-sandalwood', style: 'classic-orbit', shapes: SHAPE_SET_A },
  { material: 'magnetic-hematite', style: 'classic-orbit', shapes: SHAPE_SET_B },
  { material: 'carnelian-agate', style: 'classic-orbit', shapes: SHAPE_SET_C },

  { material: 'citrine', style: 'two-material-meridian', shapes: SHAPE_SET_A },
  { material: 'stainless-steel', style: 'two-material-meridian', shapes: SHAPE_SET_B },
  { material: 'red-sandalwood', style: 'two-material-meridian', shapes: SHAPE_SET_C },

  { material: 'peach-wood', style: 'alternating-rhythm', shapes: SHAPE_SET_A },
  { material: 'obsidian', style: 'alternating-rhythm', shapes: SHAPE_SET_B },
  { material: 'moss-agate', style: 'alternating-rhythm', shapes: SHAPE_SET_C },
];
