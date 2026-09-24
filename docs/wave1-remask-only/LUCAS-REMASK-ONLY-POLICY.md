# Lucas hard policy — 24 Sep 2026

**Rule:** Same original pack photo. Fix white circular/halo disks + cutting-off only (remask + inpaint on `#FFFFFF`).

**Forbidden as Wave 1 “after” assets:**
- Meter-only swaps (e.g. EasyTalk meter replacing bitten box)
- DailyMed label flats replacing bottle/box packs
- Chemical structures, clinical graphs
- Ducor vector stubs / baked chrome

**Allowed:**
1. Original pack from `assets/products/{sku}.jpg` (or samples-wave1 `{sku}-before.jpg`) as base
2. Remask with `isnet-general-use` or `birefnet-general-lite` (not `u2net`)
3. Inpaint holes so silhouette has **zero** white disks
4. Soft ~276px / unrecoverable → `needs_reshoot=yes` — do **not** invent a different product image

**PR #11:** HOLD until Selene Pass clears under this rule. No live merge.

## Enforcement note (24 Sep 2026 ~16:41 UTC)
DailyMed/meter/label swap PASS commits are INVALID. Working tree assets/products restored from main. Afters for swapped SKUs reset to original packs pending remask-only. PR #11 not Pass 3 ready.
