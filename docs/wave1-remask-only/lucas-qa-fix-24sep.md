# Lucas QA Fix Log — 24 Sep 2026 (Africa/Monrovia / UTC+0)

## CRITICAL POLICY (Lucas via Chief) — remask ONLY
DailyMed / meter / label-flat / structure / graph / stub swaps are **FORBIDDEN**.
Any prior PASS via those approaches is **INVALID**.

Assets on `fix/product-images-wave1` restored to **main** pack originals (Nadia commit `bb0d039`).
Remask outputs live under `/workspace/ducor-launch/product-image-standard/` (masters, exports-1000, samples-wave1, shop-stage).
**Do not** overwrite git `assets/products/` with remask exports until Selene remask-only Pass.

Models: `isnet-general-use` (+ luminance matte for white-on-white bottles). Never `u2net`. Ground `#FFFFFF`.

## otc015 + rx001 (priority deliverable)

### otc015 — Easy Talk box (composite + source corner disk)
- **status:** `needs_reshoot=yes` — **NOT PASS**
- **same pack?** YES — original Easy Talk box pixels from `assets/products/otc015.jpg` / `_originals` (matches main)
- **approach:** pack-region crop → isnet remask → convex-hull inpaint of corner bite
- **disks gone?** **NO** — original pack already has a white circular bite into top-left "Easy Talk"; inpaint cannot honestly invent missing pack art. Residual edge jaggedness / ghost UI possible.
- **compare:** `samples-wave1/otc015-compare.jpg`
- **after:** `samples-wave1/otc015-after.jpg` · `masters/otc015@1200.jpg`
- **reason needs_reshoot:** soft ~276×290 source + unrecoverable source disk + composite family

### rx001 — Acetazolamide bottle (composite UI bullets)
- **status:** `needs_reshoot=yes` — **NOT PASS**
- **same pack?** YES — Strides AcetaZOLAMIDE 250 mg bottle from original composite (matches main). **Not** DailyMed flat.
- **approach:** pack-blob crop (bottle only) → luminance matte (white-on-white; rembg eats white bottles) → #FFFFFF canvas
- **disks gone?** N/A (no source disk); UI bullets removed. Soft/jagged white-cap edges remain.
- **compare:** `samples-wave1/rx001-compare.jpg`
- **after:** `samples-wave1/rx001-after.jpg` · `masters/rx001@1200.jpg`
- **reason needs_reshoot:** soft ~276×296 + white-on-white mask limits + composite family

## Other Wave-1 priority SKUs processed (remask-only from main originals)

| SKU | needs_reshoot | notes (honest) |
|-----|---------------|----------------|
| rx005 | yes | same pack remask; soft ~276; UI ghost risk |
| rx011 | yes | same pack; soft |
| rx014 | yes | same pack; soft / dark fringe risk |
| rx067 | yes | same pack; soft ~230; composite |
| rx090 | yes | same pack bottle crop from composite; artifact risk at base; **not** DailyMed/Lupin flat swap |
| vit032 | yes/edge | same pack from vit032.png; black fringe from original dark bg — despill attempted; prefer reshoot |
| rx004 | yes | soft remask |
| rx008 | yes | soft remask |
| rx010 | yes | soft remask |
| rx017 | yes | soft remask |
| rx020 | yes | soft remask |
| rx023 | yes | soft remask |
| rx024 | yes | soft remask |
| rx108 | yes | soft + composite family |
| rx109 | yes | soft + composite family |
| rx144 | yes | soft + composite family |
| otc001 | no* | remask OK candidate (*still visual-check live) |
| otc011 | yes | dark fringe / FAIL_DARK risk on some runs |

Full machine report: `remask-only-report.csv`

## Confirmations
- **No DailyMed / meter / label / structure / graph / stub swaps** in Wave-1 afters for the priority set — bases are main originals / `_originals` / `*-before.jpg`.
- **PR #11** remains **draft / HOLD** — do not merge until Selene remask-only Pass.
- Branch: `fix/product-images-wave1` (assets = main originals after revert `bb0d039`).

## INVALIDATED (history)
Prior PASS claims for otc015 (meter), rx001 (DailyMed), rx005/011/014/067/090 (DailyMed), etc. are void under Lucas remask-only policy (~16:41 UTC 24 Sep 2026).
