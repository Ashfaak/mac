# Carbonite Mac Market

Interactive explorer for Apple Silicon Mac listings (M1 onwards) on the carbonite.co.za forums, from the M1 launch (Nov 2020) to Nov 2026: specs, asking and latest prices, damage severity, Geekbench 6 scores, and a statistics section (means, medians, SD, variance, CV, confidence intervals, percentiles, skewness, correlations, damage discounts and composition percentages). Everything follows the page's filters.

This is the public copy. It leaves out seller usernames, locations, thread titles and links, free-text notes, and the per-listing table.

- `docs/index.html`: the page (Chart.js from cdnjs)
- `docs/data.json`: 2,124 listings, stripped to specs, prices, damage and benchmark fields
- `build_public.py` with `public_stats.*`: rebuilds `docs/` from the private originals, which are git-ignored

To view it locally, serve the folder (the page fetches `data.json`):

```
python -m http.server 8765 --directory docs
```

Then open http://localhost:8765.
