// ---------- statistics ----------
const sum = a => a.reduce((s,x) => s+x, 0);
const mean = a => a.length ? sum(a)/a.length : null;
const quant = (a, q) => { if(!a.length) return null; const s = [...a].sort((x,y)=>x-y), p = (s.length-1)*q, lo = Math.floor(p), hi = Math.ceil(p); return s[lo] + (s[hi]-s[lo])*(p-lo); };
// two-sided 95% t critical value (Cornish-Fisher expansion; exact enough for display)
const tcrit = df => { const z = 1.959964; if(df < 1) return NaN; if(df === 1) return 12.706; if(df === 2) return 4.303;
  return z + (z**3+z)/(4*df) + (5*z**5+16*z**3+3*z)/(96*df**2) + (3*z**7+19*z**5+17*z**3-15*z)/(384*df**3); };
function describe(a){
  const n = a.length, m = mean(a);
  if(!n) return {n:0};
  const v = n > 1 ? sum(a.map(x => (x-m)**2))/(n-1) : null, sd = v==null ? null : Math.sqrt(v);
  const m2 = sum(a.map(x => (x-m)**2))/n, m3 = sum(a.map(x => (x-m)**3))/n, m4 = sum(a.map(x => (x-m)**4))/n;
  const skew = n > 2 && m2 > 0 ? (m3/m2**1.5) * Math.sqrt(n*(n-1))/(n-2) : null;
  const kurt = n > 3 && m2 > 0 ? ((n+1)*(m4/m2**2) - 3*(n-1)) * (n-1)/((n-2)*(n-3)) : null;
  const se = sd==null ? null : sd/Math.sqrt(n);
  return { n, mean:m, median:quant(a,.5), v, sd, se, ci: se==null ? null : tcrit(n-1)*se, cv: sd!=null && m ? sd/m*100 : null,
    min:Math.min(...a), max:Math.max(...a), p10:quant(a,.1), p25:quant(a,.25), p75:quant(a,.75), p90:quant(a,.9),
    gmean: a.every(x => x>0) ? Math.exp(mean(a.map(Math.log))) : null, skew, kurt };
}
function wilson(x, n){ if(!n) return [null,null,null]; const z = 1.959964, p = x/n, d = 1+z*z/n, c = (p + z*z/(2*n))/d, h = z*Math.sqrt(p*(1-p)/n + z*z/(4*n*n))/d; return [p*100, (c-h)*100, (c+h)*100]; }
function pearson(xs, ys){ const n = xs.length; if(n < 3) return null; const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0; for(let i=0;i<n;i++){ const a = xs[i]-mx, b = ys[i]-my; sxy += a*b; sxx += a*a; syy += b*b; }
  if(!sxx || !syy) return null; return { r: sxy/Math.sqrt(sxx*syy), slope: sxy/sxx }; }
function ranks(a){ const idx = a.map((v,i) => [v,i]).sort((x,y) => x[0]-y[0]), r = new Array(a.length);
  for(let i=0;i<idx.length;){ let j = i; while(j+1<idx.length && idx[j+1][0]===idx[i][0]) j++; const avg = (i+j)/2 + 1; for(let k=i;k<=j;k++) r[idx[k][1]] = avg; i = j+1; } return r; }
const pct = (v, dp=1) => v==null || isNaN(v) ? "–" : (v < 0 && v.toFixed(dp) != 0 ? "−" : "") + Math.abs(v).toFixed(dp) + "%";
const num = (v, dp=2) => v==null || isNaN(v) ? "–" : (v<0 ? "−" : "") + Math.abs(v).toFixed(dp);
const fmtM = v => v==null ? "–" : (v/1e6 >= 100 ? Math.round(v/1e6).toLocaleString("en-US").replace(/,/g," ") : (v/1e6).toFixed(1));
const strength = r => { const a = Math.abs(r); return a < .1 ? "negligible" : a < .3 ? "weak" : a < .5 ? "moderate" : a < .7 ? "strong" : "very strong"; };

const CHIP_ORDER = ["M1","M1 Pro","M1 Max","M1 Ultra","M2","M2 Pro","M2 Max","M2 Ultra","M3","M3 Pro","M3 Max","M3 Ultra","M4","M4 Pro","M4 Max","M5","M5 Pro","M5 Max","M6","A18 Pro"];
const GROUPS = {
  chip:   { label:"Chip", key:d => d.chip, order:CHIP_ORDER },
  gen:    { label:"Generation", key:d => d.gen, order:GENS },
  tier:   { label:"Tier", key:d => d.tier, order:TIERS },
  model:  { label:"Model", key:d => d.model, order:MODELS },
  ram:    { label:"RAM", key:d => d.ram, fmt:v => v+"GB", num:true },
  storage:{ label:"Storage", key:d => d.storage, fmt:stoTxt, num:true },
  screen: { label:"Screen", key:d => d.screen, fmt:v => v+"″", num:true },
  damage: { label:"Damage", key:d => SEV[d.sevIdx], order:SEV },
  seller: { label:"Seller", key:d => d.seller_type, order:["Private","Reseller/Business"] },
  cond:   { label:"Condition", key:d => d.condition || null, order:["New/Sealed","Like new","Good","Fair","Poor","For parts"] },
  year:   { label:"Year listed", key:d => d.date.slice(0,4), num:true },
  type:   { label:"Ad type", key:d => d.type, order:TYPES },
};
let groupBy = "chip";
function buildGroupBy(){
  const el = document.getElementById("st-groupby"); el.innerHTML = "";
  Object.entries(GROUPS).forEach(([k,g]) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = g.label;
    b.setAttribute("aria-pressed", k===groupBy); b.onclick = () => { groupBy = k; buildGroupBy(); drawStats(); }; el.appendChild(b); });
}

function drawStats(){
  const sale = VIEW.filter(isSaleAd), priced = sale.filter(d => priceOf(d)!=null), P = priced.map(priceOf);
  const D = describe(P);
  // overall
  const bat = sale.map(d => d.battery_health).filter(v => v!=null), B = describe(bat);
  const drops = priced.filter(d => d.asking_price && d.final_price && d.final_price < d.asking_price), cuts = describe(drops.map(d => (1-d.final_price/d.asking_price)*100));
  const withAsk = priced.filter(d => d.asking_price && d.final_price).length;
  const vpk = describe(priced.filter(d => d.sevIdx===0 && d.gb_multi).map(d => priceOf(d)/d.gb_multi*1000));
  const dm = wilson(sale.filter(d => d.sevIdx>0).length, sale.length), so = wilson(sale.filter(d => d.sold).length, sale.length),
        rs = wilson(sale.filter(d => d.seller_type==="Reseller/Business").length, sale.length), dr = wilson(drops.length, withAsk);
  const ci = (lo, hi) => lo==null ? "" : `95% CI ${pct(lo)} – ${pct(hi)}`;
  const items = D.n ? [
    ["Priced ads (n)", D.n.toLocaleString(), `of ${sale.length.toLocaleString()} sale/trade ads`],
    ["Mean", fmtR(D.mean), D.ci!=null ? `95% CI ${fmtR(Math.max(0, D.mean-D.ci))} – ${fmtR(D.mean+D.ci)}` : ""],
    ["Median", fmtR(D.median), `mean is ${pct((D.mean/D.median-1)*100,0)} ${D.mean>=D.median?"above":"below"} it`],
    ["Standard deviation", fmtR(D.sd), `standard error of mean ${fmtR(D.se)}`],
    ["Variance", D.v!=null ? fmtM(D.v)+"M" : "–", "rand², in millions"],
    ["Coefficient of variation", pct(D.cv), "SD as % of mean"],
    ["Geometric mean", fmtR(D.gmean), "less pulled by expensive outliers"],
    ["Interquartile range", fmtR(D.p75-D.p25), `P25 ${fmtR(D.p25)} · P75 ${fmtR(D.p75)}`],
    ["10th – 90th percentile", `${fmtK(Math.round(D.p10))} – ${fmtK(Math.round(D.p90))}`, "middle 80% of prices"],
    ["Range", `${fmtK(D.min)} – ${fmtK(D.max)}`, `spread ${fmtR(D.max-D.min)}`],
    ["Skewness", num(D.skew), D.skew==null ? "" : D.skew > 1 ? "strong right skew (long tail of pricey Macs)" : D.skew > .5 ? "moderate right skew" : D.skew < -.5 ? "left skew" : "roughly symmetric"],
    ["Excess kurtosis", num(D.kurt), D.kurt==null ? "" : D.kurt > 1 ? "heavier tails than normal" : D.kurt < -1 ? "lighter tails than normal" : "close to normal tails"],
    ["Damaged", pct(dm[0]), ci(dm[1], dm[2])],
    ["Marked sold", pct(so[0]), ci(so[1], so[2])],
    ["Reseller ads", pct(rs[0]), ci(rs[1], rs[2])],
    ["Ads with a price drop", pct(dr[0]), drops.length ? `mean cut ${pct(cuts.mean)} ± ${pct(cuts.sd)} SD` : "none"],
    ["Battery health", B.n ? pct(B.mean) : "–", B.n ? `mean · SD ${num(B.sd,1)} pts · median ${pct(B.median,0)} · n${B.n}` : "not stated"],
    ["Below 80% battery", B.n ? pct(bat.filter(v => v<80).length/B.n*100) : "–", B.n ? `${bat.filter(v => v<80).length} of ${B.n} that state it` : ""],
    ["Rand per 1k multi-core pts", vpk.n ? "R"+Math.round(vpk.mean) : "–", vpk.n ? `mean · SD R${Math.round(vpk.sd||0)} · median R${Math.round(vpk.median)} (undamaged)` : ""],
  ] : [];
  document.getElementById("st-overall").innerHTML = items.length ? items.map(([k,v,s]) => `<div><span class="k">${k}</span><span class="v">${v}</span><span class="s">${s}</span></div>`).join("")
    : `<div class="empty" style="grid-column:1/-1">No priced listings match these filters.</div>`;
  document.getElementById("st-ov-note").textContent = priceMode==="final" ? "latest price" : "original asking price";

  // by group
  const g = GROUPS[groupBy], bucket = new Map();
  priced.forEach(d => { const k = g.key(d); if(k==null || k==="") return; if(!bucket.has(k)) bucket.set(k, []); bucket.get(k).push(d); });
  let keys = [...bucket.keys()];
  if(g.order) keys.sort((a,b) => (g.order.indexOf(a)+1 || 99) - (g.order.indexOf(b)+1 || 99)); else if(g.num) keys.sort((a,b) => a-b); else keys.sort();
  const head = ["", "n", "Share", "Mean", "Median", "SD", "Variance (R² M)", "CV", "95% CI of mean", "P25", "P75", "Min", "Max", "Damaged", "Sold", "Price drop"];
  const row = (label, ds, cls="") => { const x = describe(ds.map(priceOf)), n = ds.length;
    const withA = ds.filter(d => d.asking_price && d.final_price);
    return `<tr class="${cls}"><td>${esc(label)}</td><td>${n.toLocaleString()}</td><td>${pct(n/priced.length*100)}</td><td>${fmtR(x.mean)}</td><td>${fmtR(x.median)}</td>
      <td>${fmtR(x.sd)}</td><td>${fmtM(x.v)}</td><td>${pct(x.cv,0)}</td><td class="${x.ci==null?"mut":""}">${x.ci==null ? "n too small" : fmtK(Math.max(0, Math.round(x.mean-x.ci)))+" – "+fmtK(Math.round(x.mean+x.ci))}</td>
      <td>${fmtR(x.p25)}</td><td>${fmtR(x.p75)}</td><td>${fmtR(x.min)}</td><td>${fmtR(x.max)}</td>
      <td>${pct(ds.filter(d => d.sevIdx>0).length/n*100,0)}</td><td>${pct(ds.filter(d => d.sold).length/n*100,0)}</td><td>${withA.length ? pct(withA.filter(d => d.final_price < d.asking_price).length/withA.length*100,0) : "–"}</td></tr>`; };
  const unk = priced.filter(d => { const k = g.key(d); return k==null || k===""; });
  document.getElementById("st-group").innerHTML = priced.length ? `<thead><tr>${head.map((h,i) => `<th>${i===0 ? g.label : h}</th>`).join("")}</tr></thead><tbody>`
    + keys.map(k => row(g.fmt ? g.fmt(k) : k, bucket.get(k))).join("") + (unk.length ? row("Not stated", unk).replace("<tr", '<tr style="color:var(--fg-3)"') : "")
    + row("All priced ads", priced, "tot") + `</tbody>` : `<tbody><tr><td class="empty">No priced listings match these filters.</td></tr></tbody>`;

  // correlations
  const t0 = Date.parse("2020-11-10");
  const VARS = [
    ["Geekbench multi-core", d => d.gb_multi && d.gb_multi/1000, "per 1k points"],
    ["Geekbench single-core", d => d.gb_single && d.gb_single/100, "per 100 points"],
    ["Geekbench Metal (GPU)", d => d.gb_metal && d.gb_metal/10000, "per 10k points"],
    ["RAM", d => d.ram, "per GB"],
    ["Storage", d => d.storage && d.storage/1024, "per TB"],
    ["Chip generation (M1 = 1)", d => /^M\d$/.test(d.gen) ? +d.gen.slice(1) : null, "per generation"],
    ["Battery health", d => d.battery_health, "per % point"],
    ["Damage severity (0–5)", d => d.sevIdx, "per step"],
    ["Date listed", d => (Date.parse(d.date)-t0)/31557600000, "per year"],
  ];
  const crow = ([name, f, unit]) => { const pts = priced.map(d => [f(d), priceOf(d)]).filter(([x]) => x!=null && x!==false && !isNaN(x));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), pr = pearson(xs, ys), sp = pr ? pearson(ranks(xs), ranks(ys)) : null;
    if(!pr) return `<tr><td>${name}</td><td>${pts.length}</td><td class="mut" colspan="5">not enough variation</td></tr>`;
    return `<tr><td>${name}</td><td>${pts.length.toLocaleString()}</td><td>${num(pr.r)}</td><td>${pct(pr.r**2*100,0)}</td><td>${sp ? num(sp.r) : "–"}</td><td>${strength(pr.r)}</td>
      <td>${pr.slope<0?"−":"+"}${fmtR(Math.abs(pr.slope))} ${unit}</td></tr>`; };
  document.getElementById("st-corr").innerHTML = `<thead><tr><th>Variable</th><th>n</th><th>r</th><th>R²</th><th>ρ</th><th>Strength</th><th>Slope</th></tr></thead><tbody>${VARS.map(crow).join("")}</tbody>`;

  // damage discount
  const ref = {};
  priced.filter(d => d.sevIdx===0).forEach(d => { (ref[d.chip+"|"+d.ram] ||= []).push(priceOf(d)); });
  Object.keys(ref).forEach(k => ref[k] = ref[k].length>=2 ? median(ref[k]) : null);
  const drows = SEV.map((s,i) => { const r = priced.filter(d => d.sevIdx===i && ref[d.chip+"|"+d.ram]).map(d => (priceOf(d)/ref[d.chip+"|"+d.ram]-1)*100); const x = describe(r);
    if(!x.n) return `<tr><td>${s}</td><td>0</td><td class="mut" colspan="5">no comparable ads</td></tr>`;
    return `<tr><td>${s}</td><td>${x.n}</td><td>${x.mean>0?"+":""}${pct(x.mean,0)}</td><td>${x.median>0?"+":""}${pct(x.median,0)}</td><td>${num(x.sd,0)} pp</td>
      <td class="${x.ci==null?"mut":""}">${x.ci==null ? "–" : pct(x.mean-x.ci,0)+" – "+pct(x.mean+x.ci,0)}</td><td>${pct(r.filter(v => v<0).length/x.n*100,0)}</td></tr>`; });
  document.getElementById("st-dmg").innerHTML = `<thead><tr><th>Severity</th><th>n</th><th>Mean</th><th>Median</th><th>SD</th><th>95% CI of mean</th><th>Priced below ref.</th></tr></thead><tbody>${drows.join("")}</tbody>`;

  // composition
  const batBand = v => v==null ? null : v>=95 ? "95–100%" : v>=90 ? "90–94%" : v>=85 ? "85–89%" : v>=80 ? "80–84%" : "Below 80%";
  const COMP = [
    ["Model", d => d.model, MODELS], ["Chip generation", d => d.gen, GENS], ["Chip tier", d => d.tier, TIERS],
    ["RAM", d => d.ram ? d.ram+"GB" : null, RAMS.map(r => r+"GB")], ["Storage", d => d.storage ? stoTxt(d.storage) : null, STOS.map(stoTxt)],
    ["Damage", d => SEV[d.sevIdx], SEV], ["Condition", d => d.condition || null, GROUPS.cond.order],
    ["Battery health (where stated)", d => batBand(d.battery_health), ["95–100%","90–94%","85–89%","80–84%","Below 80%"]],
    ["Seller", d => d.seller_type, ["Private","Reseller/Business"]], ["Ad type", d => d.type, TYPES],
    ["Status", d => d.sold ? "Marked sold" : "Not marked sold", ["Marked sold","Not marked sold"]],
    ["Year listed", d => d.date.slice(0,4), null],
  ];
  document.getElementById("st-comp").innerHTML = sale.length ? COMP.map(([title, f, order]) => {
    const c = new Map(); let n = 0; sale.forEach(d => { const k = f(d); if(k==null) return; n++; c.set(k, (c.get(k)||0)+1); });
    let ks = [...c.keys()]; ks.sort(order ? (a,b) => (order.indexOf(a)+1||99)-(order.indexOf(b)+1||99) : undefined);
    const mx = Math.max(...c.values(), 1);
    return `<div><h3>${title} <span class="note">n${n.toLocaleString()}</span></h3>` + ks.map(k => { const [p, lo, hi] = wilson(c.get(k), n);
      return `<div class="cr" title="${esc(k)}: ${c.get(k)} of ${n} · ${pct(p)} (95% CI ${pct(lo)} – ${pct(hi)})"><span class="cl">${esc(k)}</span><span class="cb"><i style="width:${c.get(k)/mx*100}%"></i></span><span class="cp">${pct(p)}</span><span class="cn">±${num((hi-lo)/2,1)} · n${c.get(k)}</span></div>`; }).join("") + `</div>`;
  }).join("") : `<div class="empty">No listings match these filters.</div>`;
}
buildGroupBy();
