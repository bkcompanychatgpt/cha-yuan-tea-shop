# One prompt: generate all 17 product images and return a ZIP

Copy everything in the block below and send it as a single message.

```text
You are producing the product imagery for Cha Yuan, a shop selling Chinese tea, jade and
fine jewellery. Complete the entire task below in one go and hand back a single ZIP file.
Do not stop to ask questions, and do not deliver the images one at a time.

TASK
Generate 17 photorealistic product images — one for every item listed at the
end of this message. Each image must be square (1:1) and must be saved under the exact
filename given for that item.

HOW TO BUILD EACH PROMPT
For an item, the image prompt is: that item's description, followed by the style block
below, copied verbatim. Do not paraphrase the style block and do not drop the last
sentence of it — the things it forbids are the ones generators add by default.

STYLE BLOCK (append to every item description, verbatim)
Photorealistic product photograph for a luxury Chinese tea and jewellery shop. A single object, centred, filling about 70% of the frame, shot square (1:1). Background: deep ink-green, almost black, smooth and uncluttered, with a soft radial falloff. Lighting: one large soft key light from the upper left, a subtle cool rim light along the right edge, gentle contact shadow beneath the object. Shallow depth of field, sharp on the object, background falling away. Colour: muted and natural, no saturation boost, no colour cast. No text, no lettering, no watermark, no logo, no brand marks, no price tag, no ruler, no hands, no people, no prop boxes, no packaging, no second object, no white studio backdrop.

REQUIREMENTS
1. Square 1:1. The shop crops to a square; a landscape or portrait image loses the object.
2. Filenames exactly as listed — for example jade-carved-pendant-tiger.jpg. They are matched
   programmatically, so a renamed file is a lost file.
3. One object per image, centred, filling about 70% of the frame.
4. No text, lettering, watermark, logo, brand mark, price tag, ruler, hand, person, prop box,
   packaging, second object, or white studio backdrop in any image.
5. Consistent lighting and background across all of them. The set has to read as one
   catalogue, not as 17 separate pictures.
6. Where a generator produces an off-centre or skewed object, regenerate it rather than
   shipping it.
7. Work through every one of the 17 items. Report any you could not produce.

DELIVERABLE
A single ZIP file named cha-yuan-product-images.zip containing all 17 images at the top level
(no nested folders), each named exactly as listed below, plus a plain-text file called
MANIFEST.txt listing every filename you included and any you had to leave out.

THE ITEMS

### Jade & Stone — 10 images

* jade-carved-pendant-tiger.jpg — Subject: Carved Nephrite Pendant, a finished hand-carved piece of Chinese jade. Material: Dark nephrite, hand-carved, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed in three-quarter view so both the carved face and the edge of the stone are visible.
* jadeite-bangle-certified.jpg — Subject: Certified Jadeite Bangle, a finished hand-carved piece of Chinese jade. Material: Jadeite, Type A, laboratory certified, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed as a complete circle in three-quarter view so the thickness of the ring is clear.
* jadeite-bangle-imperial.jpg — Subject: Imperial Green Bangle, a finished hand-carved piece of Chinese jade. Material: Jadeite, imperial green, certified, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed as a complete circle in three-quarter view so the thickness of the ring is clear.
* jade-deer-study.jpg — Subject: Jade Deer Study, a finished hand-carved piece of Chinese jade. Material: Nephrite, solid block carving, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed in three-quarter view so both the carved face and the edge of the stone are visible.
* jade-dragon-pendant.jpg — Subject: Jade Dragon Pendant, a finished hand-carved piece of Chinese jade. Material: Black nephrite, pierced and carved, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed in three-quarter view so both the carved face and the edge of the stone are visible.
* jade-leaf-and-grape-pendant.jpg — Subject: Jade Leaf and Grape Pendant, a finished hand-carved piece of Chinese jade. Material: Nephrite, carved on both faces, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed in three-quarter view so both the carved face and the edge of the stone are visible.
* jade-ruyi-sceptre.jpg — Subject: Jade Ruyi Sceptre, a finished hand-carved piece of Chinese jade. Material: Celadon nephrite, single shaft, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed in three-quarter view so both the carved face and the edge of the stone are visible.
* jadeite-bangle-classic-round.jpg — Subject: Jadeite Bangle, a finished hand-carved piece of Chinese jade. Material: Jadeite, round section, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed as a complete circle in three-quarter view so the thickness of the ring is clear.
* hetian-jade-buddha-pendant.jpg — Subject: White Jade Buddha Pendant, a finished hand-carved piece of Chinese jade. Material: Hetian white nephrite, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed in three-quarter view so both the carved face and the edge of the stone are visible.
* jade-and-nephrite-pair.jpg — Subject: White and Green Jade Pair, a finished hand-carved piece of Chinese jade. Material: White nephrite and green nephrite, matched, showing its true translucency, its fine internal clouding and the wet-looking polish of worked stone. Framed in three-quarter view so both the carved face and the edge of the stone are visible.

### Fine Jewellery — 7 images

* gold-filigree-cuff.jpg — Subject: Gold Filigree Cuff, a finished hand-made piece of fine jewellery. Material: Sterling silver with 24k gold plating, with the metal showing a soft worn polish rather than a mirror finish, and the stones lit so their colour reads clearly. Framed in three-quarter view, the object alone, standing or laid flat on the surface.
* gold-and-jade-ring.jpg — Subject: Gold and Jade Ring, a finished hand-made piece of fine jewellery. Material: 18k yellow gold, nephrite cabochon, with the metal showing a soft worn polish rather than a mirror finish, and the stones lit so their colour reads clearly. Framed in three-quarter view, the object alone, standing or laid flat on the surface.
* imperial-jadeite-earrings.jpg — Subject: Imperial Jadeite Earrings, a finished hand-made piece of fine jewellery. Material: 18k white gold, imperial green jadeite, diamonds, with the metal showing a soft worn polish rather than a mirror finish, and the stones lit so their colour reads clearly. Framed in three-quarter view, the object alone, standing or laid flat on the surface.
* jade-gold-necklace-beads.jpg — Subject: Jade Bead Necklace, a finished hand-made piece of fine jewellery. Material: 108 nephrite beads, 18k gold clasp, with the metal showing a soft worn polish rather than a mirror finish, and the stones lit so their colour reads clearly. Framed in three-quarter view, the object alone, standing or laid flat on the surface.
* jadeite-diamond-pendant.jpg — Subject: Jadeite and Diamond Ring, a finished hand-made piece of fine jewellery. Material: 18k white gold, Type A jadeite, diamond surround, with the metal showing a soft worn polish rather than a mirror finish, and the stones lit so their colour reads clearly. Framed in three-quarter view, the object alone, standing or laid flat on the surface.
* jadeite-and-gold-earrings.jpg — Subject: Jadeite and Gold Earrings, a finished hand-made piece of fine jewellery. Material: 18k white gold, matched jadeite pair, with the metal showing a soft worn polish rather than a mirror finish, and the stones lit so their colour reads clearly. Framed in three-quarter view, the object alone, standing or laid flat on the surface.
* pearl-strand-necklace.jpg — Subject: Pearl Strand Necklace, a finished hand-made piece of fine jewellery. Material: South Sea pearls, 11–13 mm, AAA lustre, with the metal showing a soft worn polish rather than a mirror finish, and the stones lit so their colour reads clearly. Framed in three-quarter view, the object alone, standing or laid flat on the surface.

Once the ZIP is ready, that is the deliverable. Nothing else is needed.
```

---

## What to do with the ZIP

Hand back cha-yuan-product-images.zip and it can be imported directly — the importer reads a zip without
being unpacked first:

```
node server/scripts/import-product-photos.mjs cha-yuan-product-images.zip --dry-run   # check first
node server/scripts/import-product-photos.mjs cha-yuan-product-images.zip
```

It crops and grades each image to the shop's look, writes the card, thumbnail and gallery
derivatives, records the credit, and points the product at them.
