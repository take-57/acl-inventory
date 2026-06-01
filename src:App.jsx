import { useState, useMemo } from "react";

// ══════════════════════════════════════════════════════════
//  定数
// ══════════════════════════════════════════════════════════
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (s) => { if (!s) return "-"; const d = new Date(s); return `${d.getMonth()+1}/${d.getDate()}`; };
const fmtDateFull = (s) => { if (!s) return "-"; const d = new Date(s); return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`; };

const STATUS_CFG = {
  "在庫あり": { bg:"#dcfce7", color:"#15803d", border:"#86efac" },
  "残少":     { bg:"#fef3c7", color:"#b45309", border:"#fcd34d" },
  "在庫なし": { bg:"#fee2e2", color:"#b91c1c", border:"#fca5a5" },
  "発注済":   { bg:"#e0f2fe", color:"#0369a1", border:"#7dd3fc" },
};
const STATUS_LIST = Object.keys(STATUS_CFG);

const INIT_CATEGORIES = ["電気","配管","建材","金属","化学品","工具","消耗品","その他"];
const INIT_MAKERS     = ["パナソニック","クボタ","吉野石膏","三菱電機","東芝","日立","未記入"];
const INIT_LOCATIONS  = ["A棚-1","A棚-2","B棚-1","B棚-2","B棚-3","C棚-1","外倉庫","車両内","その他"];
const INIT_UNITS      = ["個","本","m","枚","箱","袋","缶","セット","式"];

const INIT_MATERIALS = [
  { id:1, category:"電気",  partNumber:"EL-001", maker:"パナソニック", nickname:"白ケーブル3P",     officialName:"VVF ケーブル 2.0mm 3芯",        quantity:50, unit:"m",  minStock:20, status:"在庫あり", location:"A棚-1",  supplierId:1, notes:"屋内配線用", lastUpdated:"2026-05-20" },
  { id:2, category:"配管",  partNumber:"PI-045", maker:"クボタ",       nickname:"VP管25",           officialName:"硬質ポリ塩化ビニル管 VP-25",     quantity:8,  unit:"本", minStock:10, status:"残少",    location:"B棚-3",  supplierId:2, notes:"",          lastUpdated:"2026-05-22" },
  { id:3, category:"建材",  partNumber:"BM-112", maker:"吉野石膏",     nickname:"プラスターボード", officialName:"タイガーボード 9.5mm×910×1820",  quantity:0,  unit:"枚", minStock:30, status:"在庫なし", location:"外倉庫", supplierId:null, notes:"要発注",  lastUpdated:"2026-05-25" },
];
const INIT_SUPPLIERS = [
  { id:1, name:"山田電材株式会社", contact:"山田 太郎", phone:"03-1234-5678", email:"yamada@yamada-elec.jp",    address:"東京都千代田区1-1-1",  fax:"03-1234-5679", notes:"" },
  { id:2, name:"関西配管工業",     contact:"田中 花子", phone:"06-2345-6789", email:"tanaka@kansai-pipe.co.jp", address:"大阪府大阪市北区2-3-4", fax:"06-2345-6790", notes:"" },
];
let matId=4, supId=3, ordIdSeq=1;

// ══════════════════════════════════════════════════════════
//  グローバルCSS（レスポンシブ）
// ══════════════════════════════════════════════════════════
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f1f5f9; }
  input, select, textarea, button { font-family: inherit; }
  /* スクロールバー細め */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d1fae5; border-radius: 4px; }

  .page { max-width: 1100px; margin: 0 auto; padding: 16px 14px; }

  /* 統計カード */
  .stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }

  /* 材料カードグリッド */
  .mat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }

  /* 操作ボタン行 */
  .adj-row { display: flex; gap: 6px; flex-wrap: wrap; }

  /* フィルタ行 */
  .filter-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
  .filter-row input  { flex: 1; min-width: 160px; }
  .filter-row select { min-width: 100px; }

  /* ナビ */
  .nav-row { display: flex; align-items: center; gap: 6px; }
  .nav-label { }

  /* ボトムナビ（スマホ用） */
  .bottom-nav { display: none; }

  /* ── レスポンシブ ── */
  @media (max-width: 700px) {
    .page { padding: 12px 10px; padding-bottom: 80px; }
    .stat-grid { gap: 8px; }
    .stat-num  { font-size: 30px !important; }
    .stat-label { font-size: 11px !important; }
    .mat-grid { grid-template-columns: 1fr; }
    .nav-row { display: none !important; }
    .bottom-nav { display: flex !important; }
    .filter-row select { min-width: 90px; font-size: 12px; }
  }
  @media (max-width: 440px) {
    .stat-grid { grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  }

  /* ボタン押下アニメ */
  button:active { transform: scale(0.94); }
  button { transition: transform .1s, box-shadow .1s; }

  /* PC テーブルビュー */
  .pc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .pc-table th { padding: 10px 12px; text-align: left; color: #111827; font-weight: 700; font-size: 12px; white-space: nowrap; user-select: none; cursor: pointer; background: #f0fdf4; border-bottom: 2px solid #d1fae5; }
  .pc-table td { padding: 11px 12px; border-bottom: 1px solid #f0fdf4; vertical-align: middle; }
  .pc-table tr:hover td { background: #ecfdf5 !important; }

  /* カード（スマホ・タブレット） */
  .mat-card { background: #fff; border: 1.5px solid #d1fae5; border-radius: 14px; padding: 16px; box-shadow: 0 2px 8px #05966910; }
  .mat-card:active { transform: scale(0.99); }
`;

// ══════════════════════════════════════════════════════════
//  共通コンポーネント
// ══════════════════════════════════════════════════════════

// コンボボックス
function ComboInput({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const filtered = options.filter(o => o.toLowerCase().includes((value||"").toLowerCase()));
  return (
    <div style={{ position:"relative", width:"100%" }}>
      <input value={value||""} onChange={e=>{onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),160)}
        placeholder={placeholder} autoComplete="off"
        style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:"1.5px solid #d1fae5", background:"#fff", color:"#111827", fontSize:15, outline:"none" }}/>
      {open && filtered.length>0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1.5px solid #d1fae5", borderRadius:10, zIndex:600, maxHeight:220, overflowY:"auto", boxShadow:"0 8px 24px #05966920", marginTop:3 }}>
          {filtered.map(o=>(
            <div key={o} onMouseDown={()=>{onChange(o);setOpen(false);}} onTouchEnd={()=>{onChange(o);setOpen(false);}}
              style={{ padding:"12px 16px", cursor:"pointer", fontSize:15, color:"#111827", borderBottom:"1px solid #f0fdf4" }}
              onMouseEnter={e=>e.currentTarget.style.background="#ecfdf5"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// マスタ編集モーダル
function MasterModal({ title, items, onSave, onClose }) {
  const [list, setList] = useState([...items]);
  const [newVal, setNewVal] = useState("");
  const add = () => { if(newVal.trim()&&!list.includes(newVal.trim())){ setList(l=>[...l,newVal.trim()]); setNewVal(""); }};
  return (
    <Overlay onClose={onClose}>
      <div style={{ background:"#fff", borderRadius:16, padding:24, width:"min(420px,92vw)" }}>
        <div style={{ fontWeight:800, fontSize:17, color:"#065f46", marginBottom:16 }}>⚙ {title}の編集</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16, minHeight:36 }}>
          {list.map(item=>(
            <span key={item} style={{ background:"#ecfdf5", border:"1.5px solid #6ee7b7", borderRadius:20, padding:"5px 14px", fontSize:13, color:"#065f46", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              {item}
              <button onClick={()=>setList(l=>l.filter(x=>x!==item))} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:15, lineHeight:1, padding:0 }}>✕</button>
            </span>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          <input value={newVal} onChange={e=>setNewVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}}
            placeholder="追加する項目を入力…" style={{ flex:1, padding:"10px 14px", borderRadius:10, border:"1.5px solid #d1fae5", background:"#fff", color:"#111827", fontSize:14, outline:"none" }}/>
          <button onClick={add} style={{ padding:"10px 18px", borderRadius:10, border:"none", background:"#059669", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:14 }}>追加</button>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"10px 20px", borderRadius:10, border:"1.5px solid #d1fae5", background:"#f0fdf4", color:"#065f46", cursor:"pointer", fontWeight:600 }}>キャンセル</button>
          <button onClick={()=>{onSave(list);onClose();}} style={{ padding:"10px 20px", borderRadius:10, border:"none", background:"#059669", color:"#fff", fontWeight:700, cursor:"pointer" }}>保存</button>
        </div>
      </div>
    </Overlay>
  );
}

// オーバーレイ
function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"#00000066", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e=>e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ステータスバッジ
function StatusBadge({ status, size="md" }) {
  const c = STATUS_CFG[status]||{ bg:"#f1f5f9", color:"#64748b", border:"#cbd5e1" };
  const p = size==="lg" ? "7px 16px" : "4px 12px";
  const fs = size==="lg" ? 14 : 12;
  return <span style={{ display:"inline-block", background:c.bg, color:c.color, border:`2px solid ${c.border}`, borderRadius:10, padding:p, fontSize:fs, fontWeight:700, whiteSpace:"nowrap" }}>{status}</span>;
}

// 在庫数表示
function QtyDisplay({ quantity, minStock, unit, size="md" }) {
  const color = quantity===0 ? "#b91c1c" : quantity<=minStock ? "#b45309" : "#059669";
  const fs = size==="lg" ? 32 : size==="sm" ? 16 : 22;
  return (
    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, fontSize:fs, color, letterSpacing:"-1px" }}>
      {quantity}<span style={{ fontSize:fs*0.55, color:"#6b7280", fontWeight:500, marginLeft:3, letterSpacing:"normal" }}>{unit}</span>
    </span>
  );
}

// 在庫±ボタン行
function AdjButtons({ matId, onAdj, onCustom }) {
  return (
    <div className="adj-row">
      {[-5,-1].map(d=>(
        <button key={d} onClick={e=>{e.stopPropagation();onAdj(matId,d);}}
          style={{ flex:1, minWidth:44, padding:"10px 0", background:"#fee2e2", border:"2px solid #fca5a5", color:"#b91c1c", borderRadius:10, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>
          {d}
        </button>
      ))}
      {[+1,+5].map(d=>(
        <button key={d} onClick={e=>{e.stopPropagation();onAdj(matId,d);}}
          style={{ flex:1, minWidth:44, padding:"10px 0", background:"#dcfce7", border:"2px solid #86efac", color:"#15803d", borderRadius:10, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>
          +{d}
        </button>
      ))}
      <button onClick={e=>{e.stopPropagation();onCustom(matId);}}
        style={{ padding:"10px 14px", background:"#f3f4f6", border:"2px solid #d1d5db", color:"#374151", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer" }}>…</button>
    </div>
  );
}

// CSV / Print
function exportCSV(supplier, items, myCompany) {
  const rows = [["発注書"],["発注日",today()],["発注先",supplier.name],["担当者",supplier.contact],["発注元",myCompany.name],[],
    ["No","品番","材料名（正式）","通称","発注数","単位","備考"],
    ...items.map((it,i)=>[i+1,it.partNumber,it.officialName,it.nickname,it.orderQty,it.unit,it.notes||""])];
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
  a.download=`発注書_${supplier.name}_${today()}.csv`; a.click();
}
function printOrder(supplier, items, myCompany) {
  const html=`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>発注書</title>
  <style>body{font-family:'Noto Sans JP',sans-serif;font-size:13px;padding:32px 40px;color:#111}h1{font-size:22px;text-align:center;border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:20px}.meta{display:flex;justify-content:space-between;margin-bottom:24px}.co{font-size:16px;font-weight:700;margin-bottom:4px}table{width:100%;border-collapse:collapse}th{background:#059669;color:#fff;padding:8px 10px;text-align:left;font-size:12px}td{padding:7px 10px;border-bottom:1px solid #e5e5e5}tr:nth-child(even) td{background:#f9f9f9}.seals{display:flex;justify-content:flex-end;gap:12px;margin-top:24px}.seal{width:60px;height:60px;border:1px solid #999;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999}</style></head><body>
  <h1>発　注　書</h1><div class="meta"><div><div class="co">${supplier.name} 御中</div>${supplier.contact?`<p>担当：${supplier.contact} 様</p>`:""} ${supplier.phone?`<p>TEL: ${supplier.phone}</p>`:""}</div>
  <div style="text-align:right"><div class="co">${myCompany.name}</div>${myCompany.phone?`<p>TEL: ${myCompany.phone}</p>`:""} ${myCompany.contact?`<p>担当：${myCompany.contact}</p>`:""}<p><b>発注日：${fmtDateFull(today())}</b></p></div></div>
  <table><thead><tr><th>No</th><th>品番</th><th>正式名称</th><th>通称</th><th>数量</th><th>単位</th><th>備考</th></tr></thead><tbody>
  ${items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.partNumber}</td><td>${it.officialName}</td><td>${it.nickname}</td><td style="text-align:right;font-weight:bold">${it.orderQty}</td><td>${it.unit}</td><td>${it.notes||""}</td></tr>`).join("")}
  </tbody></table><div class="seals"><div class="seal">承認</div><div class="seal">確認</div><div class="seal">担当</div></div></body></html>`;
  const w=window.open("","_blank"); w.document.write(html); w.document.close(); w.onload=()=>w.print();
}

// フォームフィールド
function Field({ label, children, half }) {
  return (
    <div style={{ gridColumn: half ? undefined : "1/-1" }}>
      <div style={{ fontSize:12, color:"#6b7280", fontWeight:600, marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}

const INP = { width:"100%", padding:"12px 14px", borderRadius:10, border:"1.5px solid #d1fae5", background:"#fff", color:"#111827", fontSize:15, outline:"none", fontFamily:"inherit" };
const SEL = { ...INP, cursor:"pointer" };

// ══════════════════════════════════════════════════════════
//  メインアプリ
// ══════════════════════════════════════════════════════════
export default function App() {
  const [categories, setCategories] = useState(INIT_CATEGORIES);
  const [makers,     setMakers]     = useState(INIT_MAKERS);
  const [locations,  setLocations]  = useState(INIT_LOCATIONS);
  const [units,      setUnits]      = useState(INIT_UNITS);
  const [masterModal, setMasterModal] = useState(null);

  const [materials,  setMaterials]  = useState(INIT_MATERIALS);
  const [suppliers,  setSuppliers]  = useState(INIT_SUPPLIERS);
  const [orders,     setOrders]     = useState([]);
  const [myCompany,  setMyCompany]  = useState({ name:"株式会社 〇〇工務店", address:"", phone:"", contact:"" });

  const [view,       setView]       = useState("list");
  const [editTarget, setEditTarget] = useState(null);
  const [detailTarget,setDetailTarget]=useState(null);
  const [search,     setSearch]     = useState("");
  const [filterStat, setFilterStat] = useState("すべて");
  const [filterCat,  setFilterCat]  = useState("すべて");
  const [filterSup,  setFilterSup]  = useState("すべて");
  const [toast,      setToast]      = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [customAdj,  setCustomAdj]  = useState(null); // {id, delta}
  const [adjInput,   setAdjInput]   = useState("");
  const [matForm,    setMatForm]    = useState(null);
  const [supForm,    setSupForm]    = useState(null);
  const [editMyComp, setEditMyComp] = useState(false);
  const [myCompForm, setMyCompForm] = useState(null);
  const [orderSupId,  setOrderSupId]  = useState(null);
  const [orderItems,  setOrderItems]  = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [inspectOrder,setInspectOrder]=useState(null);
  const [inspectQtys, setInspectQtys] =useState({});
  const [orderDetail, setOrderDetail] = useState(null);

  // ── 🛒 カート ─────────────────────────────────────────
  // cart: [{ id, partNumber, officialName, nickname, unit, supplierId, qty, memo }]
  const [cart,      setCart]      = useState([]);
  const [cartOpen,  setCartOpen]  = useState(false);

  const cartAdd = (mat) => {
    setCart(prev => {
      if (prev.find(c => c.id === mat.id)) {
        showToast("すでにカートにあります","warn"); return prev;
      }
      showToast(`🛒 ${mat.nickname} をカートに追加`);
      return [...prev, { id:mat.id, partNumber:mat.partNumber, officialName:mat.officialName, nickname:mat.nickname, unit:mat.unit, supplierId:mat.supplierId, qty:Math.max(1, (mat.minStock||0) - mat.quantity), memo:"" }];
    });
  };
  const cartRemove  = (id)        => setCart(prev => prev.filter(c => c.id !== id));
  const cartSetQty  = (id, val)   => setCart(prev => prev.map(c => c.id===id ? {...c, qty:Math.max(1,parseInt(val)||1)} : c));
  const cartSetMemo = (id, val)   => setCart(prev => prev.map(c => c.id===id ? {...c, memo:val} : c));
  const cartClear   = ()          => { setCart([]); showToast("カートをクリアしました","warn"); };
  const cartInCart  = (id)        => cart.some(c => c.id === id);

  // カートから発注画面へ引き継ぐ
  const cartToOrder = () => {
    if (cart.length === 0) return;
    setOrderItems(cart.map(c => ({
      materialId:   c.id,
      partNumber:   c.partNumber,
      officialName: c.officialName,
      nickname:     c.nickname,
      unit:         c.unit,
      notes:        c.memo,
      orderQty:     c.qty,
    })));
    setOrderSupId(suppliers[0]?.id || null);
    setOrderSearch("");
    setCartOpen(false);
    setView("orderNew");
    showToast("カートの内容を発注画面に引き継ぎました");
  };

  // ── フィルタ ─────────────────────────────────────────
  const filteredMats = useMemo(()=>{
    let list=[...materials];
    if(filterStat==="_low")  list=list.filter(m=>m.status==="残少"||m.status==="在庫なし");
    else if(filterStat!=="すべて") list=list.filter(m=>m.status===filterStat);
    if(filterCat!=="すべて") list=list.filter(m=>m.category===filterCat);
    if(filterSup!=="すべて") list=list.filter(m=>String(m.supplierId)===filterSup);
    if(search.trim()){ const q=search.toLowerCase(); list=list.filter(m=>m.nickname.toLowerCase().includes(q)||m.partNumber.toLowerCase().includes(q)||m.maker.toLowerCase().includes(q)||m.officialName.toLowerCase().includes(q)); }
    return list;
  },[materials,filterStat,filterCat,filterSup,search]);

  const lowCount     = materials.filter(m=>m.minStock>0&&m.quantity<=m.minStock).length;
  const pendingCount = orders.filter(o=>o.status!=="received").length;

  // ── 在庫調整 ─────────────────────────────────────────
  const applyAdj = (id, delta) => {
    if(!delta||isNaN(delta)||delta===0){ showToast("数値を入力してください","err"); return; }
    setMaterials(prev=>prev.map(m=>{ if(m.id!==id) return m; const q=Math.max(0,m.quantity+delta); const st=q===0?"在庫なし":q<=m.minStock?"残少":"在庫あり"; return {...m,quantity:q,status:st,lastUpdated:today()}; }));
    setCustomAdj(null); setAdjInput("");
    showToast(`${delta>0?"+":""}${delta} 更新しました`);
  };

  // ── 材料 CRUD ─────────────────────────────────────────
  const emptyMat = { category:categories[0], partNumber:"", maker:makers[0], nickname:"", officialName:"", quantity:0, unit:units[0], minStock:0, status:"在庫あり", location:locations[0], supplierId:null, notes:"", lastUpdated:today() };
  const saveMat = () => {
    if(!matForm.nickname||!matForm.partNumber){ showToast("品番と材料名は必須です","err"); return; }
    if(editTarget!==null){ setMaterials(prev=>prev.map(m=>m.id===editTarget?{...matForm,id:editTarget}:m)); showToast("更新しました"); }
    else { setMaterials(prev=>[...prev,{...matForm,id:matId++}]); showToast("追加しました"); }
    setView("list");
  };
  const deleteMat = (id) => { setMaterials(prev=>prev.filter(m=>m.id!==id)); setConfirmDel(null); setView("list"); showToast("削除しました","warn"); };

  // ── 仕入先 CRUD ───────────────────────────────────────
  const emptySup = { name:"", contact:"", phone:"", email:"", fax:"", address:"", notes:"" };
  const saveSup = () => {
    if(!supForm.name){ showToast("会社名は必須です","err"); return; }
    if(editTarget!==null){ setSuppliers(prev=>prev.map(s=>s.id===editTarget?{...supForm,id:editTarget}:s)); showToast("更新しました"); }
    else { setSuppliers(prev=>[...prev,{...supForm,id:supId++}]); showToast("追加しました"); }
    setView("supList");
  };
  const deleteSup = (id) => { setSuppliers(prev=>prev.filter(s=>s.id!==id)); setConfirmDel(null); setView("supList"); showToast("削除しました","warn"); };

  // ── 発注 ──────────────────────────────────────────────
  const toggleOrderItem = (mat) => {
    setOrderItems(prev=>{ const e=prev.find(i=>i.materialId===mat.id); if(e) return prev.filter(i=>i.materialId!==mat.id); return [...prev,{ materialId:mat.id,partNumber:mat.partNumber,officialName:mat.officialName,nickname:mat.nickname,unit:mat.unit,notes:mat.notes||"",orderQty:Math.max(1,mat.minStock-mat.quantity) }]; });
  };
  const submitOrder = () => {
    if(!orderSupId||orderItems.length===0) return;
    const o={ id:ordIdSeq++,supplierId:orderSupId,orderDate:today(),deliveryDate:null,status:"ordered",items:orderItems.map(it=>({...it,receivedQty:0,inspected:false})) };
    setOrders(prev=>[...prev,o]);
    setMaterials(prev=>prev.map(m=>orderItems.find(i=>i.materialId===m.id)?{...m,status:"発注済",lastUpdated:today()}:m));
    showToast("発注を登録しました 🚚"); setView("orderList");
  };
  const receiveAll = (order) => {
    setOrders(prev=>prev.map(o=>o.id!==order.id?o:{...o,status:"received",deliveryDate:today(),items:o.items.map(it=>({...it,receivedQty:it.orderQty,inspected:true}))}));
    setMaterials(prev=>prev.map(m=>{ const oi=order.items.find(i=>i.materialId===m.id); if(!oi) return m; const q=m.quantity+oi.orderQty; return {...m,quantity:q,status:q===0?"在庫なし":q<=m.minStock?"残少":"在庫あり",lastUpdated:today()}; }));
    setOrderDetail(null); showToast("全数入荷しました ✅");
  };
  const openInspect = (order) => { const init={}; order.items.forEach(it=>{init[it.materialId]=it.orderQty-it.receivedQty;}); setInspectQtys(init); setInspectOrder({...order}); };
  const applyInspect = () => {
    const order=inspectOrder;
    const newItems=order.items.map(it=>({...it,receivedQty:it.receivedQty+(parseInt(inspectQtys[it.materialId])||0),inspected:true}));
    const allDone=newItems.every(it=>it.receivedQty>=it.orderQty);
    setOrders(prev=>prev.map(o=>o.id===order.id?{...o,items:newItems,status:allDone?"received":newItems.some(it=>it.receivedQty>0)?"partial":"ordered",deliveryDate:allDone?today():o.deliveryDate}:o));
    setMaterials(prev=>prev.map(m=>{ const delta=parseInt(inspectQtys[m.id])||0; if(!delta) return m; const q=m.quantity+delta; return {...m,quantity:q,status:q===0?"在庫なし":q<=m.minStock?"残少":"在庫あり",lastUpdated:today()}; }));
    setInspectOrder(null); setOrderDetail(null);
    showToast(allDone?"検品完了・全数入荷 ✅":"一部入荷を記録しました");
  };

  const isMatView=["list","form","detail"].includes(view);
  const isSupView=["supList","supForm","supDetail"].includes(view);
  const isOrdView=["orderList","orderNew","orderPreview","orderDetail"].includes(view);

  const masterMap = { categories:{get:categories,set:setCategories,title:"分類"}, makers:{get:makers,set:setMakers,title:"メーカー"}, locations:{get:locations,set:setLocations,title:"保管場所"}, units:{get:units,set:setUnits,title:"単位"} };

  // ── ボタンスタイル共通 ────────────────────────────────
  const btnPrimary = { padding:"13px 22px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:15 };
  const btnGhost   = { padding:"12px 20px", borderRadius:12, border:"1.5px solid #d1fae5", background:"#f0fdf4", color:"#065f46", fontWeight:600, cursor:"pointer", fontSize:14 };
  const btnDanger  = { padding:"12px 20px", borderRadius:12, border:"none", background:"#ef4444", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:14 };
  const btnAmber   = { padding:"12px 20px", borderRadius:12, border:"none", background:"#f59e0b", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:14 };

  // ══════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily:"'Noto Sans JP','BIZ UDPGothic',sans-serif", background:"#f1f5f9", minHeight:"100vh", color:"#111827" }}>
      <style>{GLOBAL_CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet"/>

      {/* ── Toast ──────────────────────────────────────── */}
      {toast&&<div style={{ position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", zIndex:9999, background:toast.type==="err"?"#fee2e2":toast.type==="warn"?"#fef3c7":"#dcfce7", border:`1.5px solid ${toast.type==="err"?"#fca5a5":toast.type==="warn"?"#fcd34d":"#86efac"}`, borderRadius:14, padding:"12px 24px", fontSize:14, fontWeight:700, color:toast.type==="err"?"#b91c1c":toast.type==="warn"?"#b45309":"#15803d", boxShadow:"0 8px 24px #00000022", whiteSpace:"nowrap" }}>
        {toast.type==="err"?"✕ ":toast.type==="warn"?"⚠ ":"✓ "}{toast.msg}
      </div>}

      {/* ── 削除確認 ────────────────────────────────────── */}
      {confirmDel&&<Overlay onClose={()=>setConfirmDel(null)}>
        <div style={{ background:"#fff", borderRadius:16, padding:28, width:"min(360px,90vw)", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🗑️</div>
          <div style={{ fontWeight:800, fontSize:17, marginBottom:8 }}>削除の確認</div>
          <div style={{ color:"#6b7280", fontSize:14, marginBottom:24 }}>「{confirmDel.name||confirmDel.nickname}」を削除しますか？</div>
          <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
            <button onClick={()=>setConfirmDel(null)} style={btnGhost}>キャンセル</button>
            <button onClick={()=>confirmDel._type==="sup"?deleteSup(confirmDel.id):deleteMat(confirmDel.id)} style={btnDanger}>削除する</button>
          </div>
        </div>
      </Overlay>}

      {/* ── カスタム在庫調整 ───────────────────────────── */}
      {customAdj&&<Overlay onClose={()=>setCustomAdj(null)}>
        <div style={{ background:"#fff", borderRadius:16, padding:28, width:"min(360px,90vw)" }}>
          <div style={{ fontWeight:800, fontSize:16, color:"#065f46", marginBottom:6 }}>在庫数の調整</div>
          <div style={{ color:"#6b7280", fontSize:13, marginBottom:16 }}>
            {materials.find(m=>m.id===customAdj)?.nickname}（現在: {materials.find(m=>m.id===customAdj)?.quantity}{materials.find(m=>m.id===customAdj)?.unit}）
          </div>
          <input type="number" value={adjInput} onChange={e=>setAdjInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") applyAdj(customAdj, parseInt(adjInput,10)); }}
            placeholder="例: -3 または +10" autoFocus
            style={{ ...INP, fontSize:20, fontFamily:"'JetBrains Mono',monospace", fontWeight:700, marginBottom:16, textAlign:"center" }}/>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={()=>setCustomAdj(null)} style={btnGhost}>キャンセル</button>
            <button onClick={()=>applyAdj(customAdj, parseInt(adjInput,10))} style={btnPrimary}>適用</button>
          </div>
        </div>
      </Overlay>}

      {/* ── 検品モーダル ────────────────────────────────── */}
      {inspectOrder&&<Overlay onClose={()=>setInspectOrder(null)}>
        <div style={{ background:"#fff", borderRadius:16, padding:24, width:"min(500px,95vw)", maxHeight:"85vh", overflowY:"auto" }}>
          <div style={{ fontWeight:800, fontSize:16, color:"#065f46", marginBottom:4 }}>📦 検品・入荷数入力</div>
          <div style={{ color:"#6b7280", fontSize:13, marginBottom:18 }}>届いた数量を入力してください。</div>
          {inspectOrder.items.map(it=>{
            const rem=it.orderQty-it.receivedQty;
            return (
              <div key={it.materialId} style={{ background:"#f0fdf4", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{it.nickname}</div>
                <div style={{ fontSize:12, color:"#6b7280", marginBottom:10 }}>発注 {it.orderQty}{it.unit} ／ 既入荷 {it.receivedQty}{it.unit} ／ 残 {rem}{it.unit}</div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, color:"#374151", flexShrink:0 }}>今回入荷数：</span>
                  <input type="number" value={inspectQtys[it.materialId]??rem}
                    onChange={e=>setInspectQtys(p=>({...p,[it.materialId]:Math.min(rem,Math.max(0,parseInt(e.target.value)||0))}))}
                    style={{ width:80, padding:"9px 12px", borderRadius:10, border:"1.5px solid #d1fae5", background:"#fff", color:"#111827", fontSize:16, outline:"none", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, textAlign:"center" }}/>
                  <span style={{ fontSize:13, color:"#6b7280" }}>{it.unit}</span>
                  <button onClick={()=>setInspectQtys(p=>({...p,[it.materialId]:rem}))} style={{ padding:"8px 12px", borderRadius:8, border:"1.5px solid #86efac", background:"#dcfce7", color:"#15803d", fontWeight:700, cursor:"pointer", fontSize:12 }}>全数</button>
                  <button onClick={()=>setInspectQtys(p=>({...p,[it.materialId]:0}))} style={{ padding:"8px 12px", borderRadius:8, border:"1.5px solid #d1d5db", background:"#f3f4f6", color:"#374151", fontWeight:700, cursor:"pointer", fontSize:12 }}>0</button>
                </div>
              </div>
            );
          })}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
            <button onClick={()=>setInspectOrder(null)} style={btnGhost}>キャンセル</button>
            <button onClick={applyInspect} style={btnPrimary}>入荷を記録する</button>
          </div>
        </div>
      </Overlay>}

      {/* ── マスタ編集 ──────────────────────────────────── */}
      {masterModal&&<MasterModal title={masterMap[masterModal].title} items={masterMap[masterModal].get} onSave={list=>masterMap[masterModal].set(list)} onClose={()=>setMasterModal(null)}/>}

      {/* ══════════════════════════════════════════════════
          🛒 カートドロワー
      ══════════════════════════════════════════════════ */}
      {/* 背景オーバーレイ */}
      {cartOpen && <div onClick={()=>setCartOpen(false)} style={{ position:"fixed", inset:0, background:"#00000044", zIndex:300 }}/>}

      {/* ドロワー本体 */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, zIndex:310,
        width:"min(420px,100vw)",
        background:"#fff",
        boxShadow:"-4px 0 32px #00000022",
        display:"flex", flexDirection:"column",
        transform: cartOpen ? "translateX(0)" : "translateX(100%)",
        transition:"transform .3s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* ドロワーヘッダー */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"2px solid #d1fae5", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:26 }}>🛒</span>
            <div>
              <div style={{ fontWeight:800, fontSize:18, color:"#065f46" }}>発注カート</div>
              <div style={{ fontSize:12, color:"#6b7280" }}>{cart.length}件 キープ中</div>
            </div>
          </div>
          <button onClick={()=>setCartOpen(false)} style={{ background:"#f0fdf4", border:"1.5px solid #d1fae5", borderRadius:10, padding:"7px 12px", cursor:"pointer", fontSize:16, color:"#065f46", fontWeight:700 }}>✕</button>
        </div>

        {/* カート中身 */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
          {cart.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 20px", color:"#9ca3af" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>カートは空です</div>
              <div style={{ fontSize:13 }}>材料一覧の「🛒」ボタンで<br/>追加できます</div>
            </div>
          )}
          {cart.map((c, i) => {
            const sup = suppliers.find(s => s.id === c.supplierId);
            return (
              <div key={c.id} style={{ background:"#f0fdf4", border:"1.5px solid #d1fae5", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                {/* 材料名 */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:"#111827" }}>{c.nickname}</div>
                    <div style={{ fontSize:11, color:"#6b7280", marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.officialName}</div>
                    {sup && <div style={{ fontSize:11, color:"#059669", fontWeight:600, marginTop:2 }}>🏢 {sup.name}</div>}
                  </div>
                  <button onClick={()=>cartRemove(c.id)} style={{ background:"#fee2e2", border:"1.5px solid #fca5a5", borderRadius:8, padding:"5px 9px", cursor:"pointer", color:"#b91c1c", fontSize:13, fontWeight:700, flexShrink:0, marginLeft:8 }}>✕</button>
                </div>

                {/* 数量 */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:13, color:"#374151", fontWeight:600 }}>発注予定数：</span>
                  <button onClick={()=>cartSetQty(c.id, c.qty-1)} style={{ width:34, height:34, borderRadius:8, border:"1.5px solid #fca5a5", background:"#fee2e2", color:"#b91c1c", fontWeight:800, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                  <input type="number" value={c.qty} onChange={e=>cartSetQty(c.id, e.target.value)}
                    style={{ width:64, padding:"6px 0", borderRadius:8, border:"1.5px solid #d1fae5", background:"#fff", color:"#111827", fontSize:16, outline:"none", fontFamily:"'JetBrains Mono',monospace", fontWeight:800, textAlign:"center" }}/>
                  <button onClick={()=>cartSetQty(c.id, c.qty+1)} style={{ width:34, height:34, borderRadius:8, border:"1.5px solid #86efac", background:"#dcfce7", color:"#15803d", fontWeight:800, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>＋</button>
                  <span style={{ fontSize:13, color:"#6b7280" }}>{c.unit}</span>
                </div>

                {/* メモ */}
                <input value={c.memo} onChange={e=>cartSetMemo(c.id, e.target.value)}
                  placeholder="メモ（任意）"
                  style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1.5px solid #d1fae5", background:"#fff", color:"#374151", fontSize:13, outline:"none", fontFamily:"inherit" }}/>
              </div>
            );
          })}
        </div>

        {/* ドロワーフッター */}
        {cart.length > 0 && (
          <div style={{ padding:"14px 16px", borderTop:"2px solid #d1fae5", flexShrink:0, background:"#fff" }}>
            {/* 仕入先ごとのサマリ */}
            {(() => {
              const bySupplier = {};
              cart.forEach(c => {
                const key = c.supplierId ?? "__none__";
                if (!bySupplier[key]) bySupplier[key] = { name: suppliers.find(s=>s.id===c.supplierId)?.name || "仕入先未設定", count:0 };
                bySupplier[key].count++;
              });
              return (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                  {Object.values(bySupplier).map(s=>(
                    <span key={s.name} style={{ background:"#ecfdf5", border:"1.5px solid #6ee7b7", borderRadius:20, padding:"3px 12px", fontSize:12, color:"#065f46", fontWeight:600 }}>
                      🏢 {s.name}：{s.count}件
                    </span>
                  ))}
                </div>
              );
            })()}

            <button onClick={cartToOrder} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#059669,#10b981)", color:"#fff", fontWeight:800, cursor:"pointer", fontSize:16, marginBottom:8 }}>
              📋 発注画面に引き継ぐ（{cart.length}件）
            </button>
            <button onClick={cartClear} style={{ width:"100%", padding:"10px", borderRadius:12, border:"1.5px solid #fca5a5", background:"#fee2e2", color:"#b91c1c", fontWeight:700, cursor:"pointer", fontSize:14 }}>
              🗑 カートをクリア
            </button>
          </div>
        )}
      </div>

      {/* 🛒 フローティングカートボタン */}
      <button onClick={()=>setCartOpen(o=>!o)} style={{
        position:"fixed", bottom:86, right:20, zIndex:299,
        width:60, height:60, borderRadius:"50%",
        background:"linear-gradient(135deg,#f59e0b,#f97316)",
        border:"none", cursor:"pointer",
        boxShadow:"0 4px 18px #f59e0b66",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:26,
        transition:"transform .2s",
      }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
      >
        🛒
        {cart.length > 0 && (
          <div style={{ position:"absolute", top:-4, right:-4, width:22, height:22, borderRadius:"50%", background:"#ef4444", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff" }}>
            {cart.length}
          </div>
        )}
      </button>

      {/* ══════════════════════════════════════════════════
          HEADER（PC・タブレット）
      ══════════════════════════════════════════════════ */}
      <header style={{ background:"#fff", borderBottom:"2px solid #d1fae5", padding:"0 20px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200, boxShadow:"0 2px 10px #05966912" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, background:"linear-gradient(135deg,#059669,#10b981)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📦</div>
          <div>
            <div style={{ fontWeight:800, fontSize:17, color:"#065f46", letterSpacing:"-0.5px", lineHeight:1.1 }}>ACL Inventory</div>
            <div style={{ fontSize:10, color:"#10b981", fontWeight:600, letterSpacing:"0.5px" }}>材料管理システム</div>
          </div>
        </div>
        <div className="nav-row">
          {lowCount>0&&<div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:20, padding:"5px 14px", fontSize:12, color:"#b91c1c", fontWeight:700 }}>⚠️ 在庫不足 {lowCount}件</div>}
          {pendingCount>0&&<div style={{ background:"#ecfdf5", border:"1.5px solid #6ee7b7", borderRadius:20, padding:"5px 14px", fontSize:12, color:"#065f46", fontWeight:700 }}>🚚 入荷待ち {pendingCount}件</div>}
          {[{id:"mat",label:"📦 材料",active:isMatView},{id:"sup",label:"🏢 仕入先",active:isSupView},{id:"ord",label:"📋 発注",active:isOrdView}].map(t=>(
            <button key={t.id} onClick={()=>{if(t.id==="mat")setView("list");else if(t.id==="sup")setView("supList");else setView("orderList");}}
              style={{ padding:"8px 18px", borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:700, background:t.active?"linear-gradient(135deg,#059669,#10b981)":"#f0fdf4", color:t.active?"#fff":"#065f46" }}>{t.label}</button>
          ))}
          <button onClick={()=>setMasterModal("categories")} style={{ padding:"8px 12px", borderRadius:10, border:"1.5px solid #d1fae5", background:"#f0fdf4", color:"#059669", cursor:"pointer", fontSize:15, fontWeight:700 }}>⚙</button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          BOTTOM NAV（スマホ用）
      ══════════════════════════════════════════════════ */}
      <nav className="bottom-nav" style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"2px solid #d1fae5", display:"flex", zIndex:200, boxShadow:"0 -2px 10px #05966912" }}>
        {[{id:"mat",icon:"📦",label:"材料",active:isMatView},{id:"sup",icon:"🏢",label:"仕入先",active:isSupView},{id:"ord",icon:"📋",label:"発注",active:isOrdView},{id:"cfg",icon:"⚙",label:"設定",active:false}].map(t=>(
          <button key={t.id} onClick={()=>{if(t.id==="mat")setView("list");else if(t.id==="sup")setView("supList");else if(t.id==="ord")setView("orderList");else setMasterModal("categories");}}
            style={{ flex:1, padding:"10px 0 8px", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <span style={{ fontSize:22 }}>{t.icon}</span>
            <span style={{ fontSize:10, fontWeight:700, color:t.active?"#059669":"#6b7280" }}>{t.label}</span>
            {t.active&&<div style={{ width:20, height:3, background:"#059669", borderRadius:2 }}/>}
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════
          メインコンテンツ
      ══════════════════════════════════════════════════ */}
      <div className="page">

        {/* ── 材料 一覧 ─────────────────────────────────── */}
        {view==="list"&&<>
          {/* 統計カード */}
          <div className="stat-grid">
            {[
              { label:"在庫あり",    value:materials.filter(m=>m.status==="在庫あり").length,                                                  color:"#15803d", bg:"#dcfce7", border:"#86efac", fs:"_low"===filterStat?false:filterStat==="在庫あり", key:"在庫あり" },
              { label:"残少・なし",  value:materials.filter(m=>m.status==="残少"||m.status==="在庫なし").length,                              color:"#b45309", bg:"#fef3c7", border:"#fcd34d", fs:filterStat==="_low",                                key:"_low" },
              { label:"発注済",      value:materials.filter(m=>m.status==="発注済").length,                                                   color:"#0369a1", bg:"#e0f2fe", border:"#7dd3fc", fs:filterStat==="発注済",                              key:"発注済" },
            ].map(s=>(
              <div key={s.key} onClick={()=>setFilterStat(filterStat===s.key?"すべて":s.key)}
                style={{ background:s.fs?s.bg:"#fff", border:`2px solid ${s.fs?s.color:s.border}`, borderRadius:14, padding:"14px 16px", cursor:"pointer", boxShadow:s.fs?`0 4px 14px ${s.color}22`:"0 1px 4px #0000000a", transition:"all .15s", userSelect:"none" }}
                onMouseEnter={e=>{e.currentTarget.style.background=s.bg;e.currentTarget.style.borderColor=s.color;}}
                onMouseLeave={e=>{e.currentTarget.style.background=s.fs?s.bg:"#fff";e.currentTarget.style.borderColor=s.fs?s.color:s.border;}}>
                <div style={{ fontSize:12, color:"#6b7280", fontWeight:600, marginBottom:6 }} className="stat-label">{s.label}</div>
                <div style={{ fontSize:38, fontWeight:800, color:s.color, fontFamily:"'JetBrains Mono',monospace", lineHeight:1, letterSpacing:"-2px" }} className="stat-num">{s.value}</div>
                <div style={{ fontSize:10, color:s.fs?s.color:"#d1d5db", fontWeight:600, marginTop:6 }}>{s.fs?"● 絞り込み中（タップで解除）":"タップで絞り込み"}</div>
              </div>
            ))}
          </div>

          {/* フィルタ */}
          <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:12, padding:"12px 14px", marginBottom:14, boxShadow:"0 1px 4px #0000000a" }}>
            <div className="filter-row">
              <input placeholder="🔍 品番・材料名・メーカー" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ ...INP, flex:1, minWidth:160, fontSize:14 }}/>
              <select value={filterCat}  onChange={e=>setFilterCat(e.target.value)}  style={{ ...SEL, width:"auto", fontSize:14 }}><option>すべて</option>{categories.map(c=><option key={c}>{c}</option>)}</select>
              <select value={filterSup}  onChange={e=>setFilterSup(e.target.value)}  style={{ ...SEL, width:"auto", fontSize:14 }}><option value="すべて">仕入先：全て</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
              <button onClick={()=>{setMatForm({...emptyMat});setEditTarget(null);setView("form");}} style={btnPrimary}>＋ 追加</button>
            </div>
            <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>{filteredMats.length}件 / 全{materials.length}件</div>
          </div>

          {/* 材料カード一覧 */}
          {filteredMats.length===0&&<div style={{ textAlign:"center", padding:48, color:"#6b7280", background:"#fff", borderRadius:14 }}>該当する材料が見つかりません</div>}
          <div className="mat-grid">
            {filteredMats.map(m=>{
              const sup=suppliers.find(s=>s.id===m.supplierId);
              return (
                <div key={m.id} className="mat-card" onClick={()=>{setDetailTarget(m);setView("detail");}} style={{ cursor:"pointer" }}>
                  {/* カードヘッダー */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6, alignItems:"center" }}>
                        <span style={{ background:"#ecfdf5", border:"1.5px solid #6ee7b7", borderRadius:8, padding:"3px 10px", fontSize:11, color:"#065f46", fontWeight:700 }}>{m.category}</span>
                        <StatusBadge status={m.status}/>
                      </div>
                      <div style={{ fontWeight:800, fontSize:17, color:"#111827", lineHeight:1.2 }}>{m.nickname}</div>
                      <div style={{ fontSize:12, color:"#6b7280", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.officialName}</div>
                    </div>
                    {/* 在庫数 */}
                    <div style={{ textAlign:"right", marginLeft:12, flexShrink:0 }}>
                      <QtyDisplay quantity={m.quantity} minStock={m.minStock} unit={m.unit} size="lg"/>
                    </div>
                  </div>

                  {/* 詳細情報 */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 12px", marginBottom:12, fontSize:12, color:"#6b7280" }}>
                    <div><span style={{ color:"#9ca3af" }}>品番 </span><span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:"#059669", fontSize:13 }}>{m.partNumber}</span></div>
                    <div><span style={{ color:"#9ca3af" }}>メーカー </span><span style={{ color:"#374151", fontWeight:600 }}>{m.maker}</span></div>
                    <div><span style={{ color:"#9ca3af" }}>保管 </span><span style={{ color:"#374151", fontWeight:600 }}>{m.location||"-"}</span></div>
                    <div><span style={{ color:"#9ca3af" }}>仕入先 </span><span style={{ color:"#374151", fontWeight:600, fontSize:11 }}>{sup?.name||"-"}</span></div>
                  </div>

                  {/* 在庫調整ボタン */}
                  <div onClick={e=>e.stopPropagation()}>
                    <AdjButtons matId={m.id} onAdj={applyAdj} onCustom={id=>{setCustomAdj(id);setAdjInput("");}}/>
                  </div>

                  {/* 編集・削除 */}
                  <div style={{ display:"flex", gap:8, marginTop:10 }} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>cartAdd(m)}
                      style={{ flex:1, padding:"9px", borderRadius:10, border:`1.5px solid ${cartInCart(m.id)?"#fcd34d":"#6ee7b7"}`, background:cartInCart(m.id)?"#fef3c7":"#ecfdf5", color:cartInCart(m.id)?"#92400e":"#065f46", fontWeight:700, cursor:"pointer", fontSize:13 }}>
                      {cartInCart(m.id) ? "🛒 カート追加済" : "🛒 カートに追加"}
                    </button>
                    <button onClick={()=>{setMatForm({...m});setEditTarget(m.id);setView("form");}}
                      style={{ padding:"9px 14px", borderRadius:10, border:"1.5px solid #fcd34d", background:"#fef3c7", color:"#92400e", fontWeight:700, cursor:"pointer", fontSize:13 }}>✏</button>
                    <button onClick={()=>setConfirmDel({...m})}
                      style={{ padding:"9px 12px", borderRadius:10, border:"1.5px solid #fca5a5", background:"#fee2e2", color:"#b91c1c", fontWeight:700, cursor:"pointer", fontSize:13 }}>🗑</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 在庫不足バナー */}
          {lowCount>0&&<div style={{ marginTop:14, background:"#fff1f2", border:"1.5px solid #fecdd3", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontWeight:700, color:"#b91c1c", marginBottom:10, fontSize:14 }}>⚠️ 在庫不足 — 発注が必要な材料</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
              {materials.filter(m=>m.minStock>0&&m.quantity<=m.minStock).map(m=>(
                <span key={m.id} style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:20, padding:"4px 12px", fontSize:12, color:"#b91c1c", fontWeight:600 }}>
                  {m.nickname}（{m.quantity}/{m.minStock}{m.unit}）
                </span>
              ))}
            </div>
            <button onClick={()=>{ setView("orderNew"); setOrderSupId(suppliers[0]?.id||null); const low=materials.filter(m=>m.minStock>0&&m.quantity<=m.minStock); setOrderItems(low.map(m=>({materialId:m.id,partNumber:m.partNumber,officialName:m.officialName,nickname:m.nickname,unit:m.unit,notes:m.notes||"",orderQty:Math.max(1,m.minStock-m.quantity)}))); setOrderSearch(""); }}
              style={{ ...btnPrimary, fontSize:14 }}>→ まとめて発注</button>
          </div>}
        </>}

        {/* ── 材料 詳細 ─────────────────────────────────── */}
        {view==="detail"&&detailTarget&&(()=>{
          const m=materials.find(x=>x.id===detailTarget.id)||detailTarget;
          const sup=suppliers.find(s=>s.id===m.supplierId);
          const relOrders=orders.filter(o=>o.items.some(i=>i.materialId===m.id));
          return (
            <div>
              <button onClick={()=>setView("list")} style={{ ...btnGhost, marginBottom:14, fontSize:13, padding:"8px 16px" }}>← 一覧に戻る</button>
              <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:16, padding:22, boxShadow:"0 2px 10px #05966910" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18, flexWrap:"wrap", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                      <span style={{ background:"#ecfdf5", border:"1.5px solid #6ee7b7", borderRadius:8, padding:"3px 10px", fontSize:12, color:"#065f46", fontWeight:700 }}>{m.category}</span>
                      <StatusBadge status={m.status} size="lg"/>
                    </div>
                    <div style={{ fontWeight:800, fontSize:22, color:"#111827" }}>{m.nickname}</div>
                    <div style={{ color:"#6b7280", fontSize:13, marginTop:3 }}>{m.officialName}</div>
                  </div>
                  <QtyDisplay quantity={m.quantity} minStock={m.minStock} unit={m.unit} size="lg"/>
                </div>

                {/* 在庫調整 */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, color:"#6b7280", fontWeight:600, marginBottom:8 }}>在庫調整</div>
                  <AdjButtons matId={m.id} onAdj={applyAdj} onCustom={id=>{setCustomAdj(id);setAdjInput("");}}/>
                </div>

                {/* 情報グリッド */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10, marginBottom:16 }}>
                  {[{l:"品番",v:m.partNumber,mono:true,accent:"#059669"},{l:"メーカー",v:m.maker},{l:"保管場所",v:m.location||"-"},{l:"最低在庫",v:`${m.minStock} ${m.unit}`,mono:true},{l:"仕入先",v:sup?.name||"-"},{l:"更新日",v:fmtDateFull(m.lastUpdated)}].map(f=>(
                    <div key={f.l} style={{ background:"#f0fdf4", borderRadius:10, padding:"12px 14px" }}>
                      <div style={{ fontSize:11, color:"#6b7280", marginBottom:4, fontWeight:600 }}>{f.l}</div>
                      <div style={{ fontFamily:f.mono?"'JetBrains Mono',monospace":"inherit", fontSize:14, fontWeight:700, color:f.accent||"#111827" }}>{f.v}</div>
                    </div>
                  ))}
                </div>

                {m.notes&&<div style={{ background:"#f0fdf4", borderRadius:10, padding:"12px 14px", marginBottom:16 }}><div style={{ fontSize:11, color:"#6b7280", marginBottom:4 }}>備考</div><div style={{ color:"#374151" }}>{m.notes}</div></div>}

                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <button onClick={()=>{setMatForm({...m});setEditTarget(m.id);setView("form");}} style={btnAmber}>✏ 編集</button>
                  <button onClick={()=>setConfirmDel({...m})} style={btnDanger}>🗑 削除</button>
                </div>

                {relOrders.length>0&&<div style={{ marginTop:20 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#065f46", marginBottom:8 }}>発注履歴</div>
                  {relOrders.map(o=>{
                    const oi=o.items.find(i=>i.materialId===m.id);
                    const stl={"ordered":"発注済","partial":"一部入荷","received":"入荷完了"}[o.status]||o.status;
                    const stc={"ordered":"#0369a1","partial":"#b45309","received":"#15803d"}[o.status]||"#666";
                    return <div key={o.id} style={{ background:"#f0fdf4", borderRadius:10, padding:"10px 14px", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13 }}>
                      <span style={{ color:"#6b7280" }}>{fmtDateFull(o.orderDate)}　{oi?.orderQty}{m.unit} 発注 / {oi?.receivedQty||0}{m.unit} 入荷</span>
                      <span style={{ background:stc+"18", color:stc, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 }}>{stl}</span>
                    </div>;
                  })}
                </div>}
              </div>
            </div>
          );
        })()}

        {/* ── 材料 フォーム ──────────────────────────────── */}
        {view==="form"&&matForm&&(
          <div>
            <button onClick={()=>setView("list")} style={{ ...btnGhost, marginBottom:14, fontSize:13, padding:"8px 16px" }}>← 一覧に戻る</button>
            <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:16, padding:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                <div style={{ fontWeight:800, fontSize:18, color:"#065f46" }}>{editTarget?"材料を編集":"材料を追加"}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {[{key:"categories",label:"分類"},{key:"makers",label:"メーカー"},{key:"locations",label:"保管場所"},{key:"units",label:"単位"}].map(({key,label})=>(
                    <button key={key} onClick={()=>setMasterModal(key)} style={{ padding:"6px 12px", borderRadius:8, border:"1.5px solid #d1fae5", background:"#f0fdf4", color:"#065f46", cursor:"pointer", fontSize:12, fontWeight:600 }}>⚙ {label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Field label="分類 *" half><ComboInput value={matForm.category} onChange={v=>setMatForm(p=>({...p,category:v}))} options={categories} placeholder="分類"/></Field>
                <Field label="品番 *" half><input value={matForm.partNumber} onChange={e=>setMatForm(p=>({...p,partNumber:e.target.value}))} placeholder="EL-001" style={INP}/></Field>
                <Field label="メーカー" half><ComboInput value={matForm.maker} onChange={v=>setMatForm(p=>({...p,maker:v}))} options={makers} placeholder="メーカー"/></Field>
                <Field label="材料名（通称）*" half><input value={matForm.nickname} onChange={e=>setMatForm(p=>({...p,nickname:e.target.value}))} placeholder="白ケーブル3P" style={INP}/></Field>
                <Field label="正式名称"><input value={matForm.officialName} onChange={e=>setMatForm(p=>({...p,officialName:e.target.value}))} placeholder="VVF ケーブル 2.0mm 3芯" style={INP}/></Field>
                <Field label="在庫数" half>
                  <div style={{ display:"flex", gap:8 }}>
                    <input type="number" value={matForm.quantity} onChange={e=>setMatForm(p=>({...p,quantity:parseInt(e.target.value)||0}))} style={{ ...INP, flex:1 }}/>
                    <div style={{ width:90 }}><ComboInput value={matForm.unit} onChange={v=>setMatForm(p=>({...p,unit:v}))} options={units} placeholder="単位"/></div>
                  </div>
                </Field>
                <Field label="最低在庫数" half><input type="number" value={matForm.minStock} onChange={e=>setMatForm(p=>({...p,minStock:parseInt(e.target.value)||0}))} style={INP}/></Field>
                <Field label="状態" half>
                  <select value={matForm.status} onChange={e=>setMatForm(p=>({...p,status:e.target.value}))} style={SEL}>
                    {STATUS_LIST.map(s=><option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="保管場所" half><ComboInput value={matForm.location} onChange={v=>setMatForm(p=>({...p,location:v}))} options={locations} placeholder="A棚-1"/></Field>
                <Field label="仕入先" half>
                  <select value={matForm.supplierId||""} onChange={e=>setMatForm(p=>({...p,supplierId:e.target.value?parseInt(e.target.value):null}))} style={SEL}>
                    <option value="">未設定</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="備考"><textarea value={matForm.notes} onChange={e=>setMatForm(p=>({...p,notes:e.target.value}))} rows={3} style={{ ...INP, resize:"vertical" }}/></Field>
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:22 }}>
                <button onClick={()=>setView("list")} style={btnGhost}>キャンセル</button>
                <button onClick={saveMat} style={btnPrimary}>{editTarget?"更新する":"追加する"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── 仕入先 一覧 ───────────────────────────────── */}
        {view==="supList"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:20, color:"#065f46" }}>🏢 仕入先管理</div>
              <button onClick={()=>{setSupForm({...emptySup});setEditTarget(null);setView("supForm");}} style={btnPrimary}>＋ 追加</button>
            </div>
            {/* 自社情報 */}
            <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:13, color:"#6b7280", fontWeight:700 }}>自社情報（発注書の発注元）</span>
                {!editMyComp&&<button onClick={()=>{setMyCompForm({...myCompany});setEditMyComp(true);}} style={{ padding:"6px 14px", borderRadius:8, border:"1.5px solid #fcd34d", background:"#fef3c7", color:"#92400e", fontWeight:700, cursor:"pointer", fontSize:12 }}>編集</button>}
              </div>
              {editMyComp?(
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
                  {[["name","会社名"],["address","住所"],["phone","電話番号"],["contact","担当者"]].map(([k,l])=>(
                    <div key={k}><div style={{ fontSize:12, color:"#6b7280", marginBottom:4, fontWeight:600 }}>{l}</div><input value={myCompForm[k]||""} onChange={e=>setMyCompForm(p=>({...p,[k]:e.target.value}))} style={INP}/></div>
                  ))}
                  <div style={{ gridColumn:"1/-1", display:"flex", gap:10, justifyContent:"flex-end", marginTop:6 }}>
                    <button onClick={()=>setEditMyComp(false)} style={btnGhost}>キャンセル</button>
                    <button onClick={()=>{setMyCompany({...myCompForm});setEditMyComp(false);showToast("自社情報を更新しました");}} style={btnPrimary}>保存</button>
                  </div>
                </div>
              ):(
                <div style={{ display:"flex", gap:20, flexWrap:"wrap", fontSize:13 }}>
                  {[["会社名",myCompany.name],["住所",myCompany.address],["電話",myCompany.phone],["担当者",myCompany.contact]].map(([l,v])=>(
                    <div key={l}><span style={{ color:"#9ca3af" }}>{l}：</span><span style={{ fontWeight:600, color:v?"#111827":"#d1d5db" }}>{v||"未設定"}</span></div>
                  ))}
                </div>
              )}
            </div>
            <div className="mat-grid">
              {suppliers.map(s=>(
                <div key={s.id} style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:14, padding:18, cursor:"pointer", boxShadow:"0 1px 4px #0000000a" }}
                  onClick={()=>{setDetailTarget(s);setView("supDetail");}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="#10b981"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="#d1fae5"}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ fontWeight:800, fontSize:16 }}>{s.name}</div>
                    <div style={{ display:"flex", gap:6 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>{setSupForm({...s});setEditTarget(s.id);setView("supForm");}} style={{ padding:"6px 10px", borderRadius:8, border:"1.5px solid #fcd34d", background:"#fef3c7", color:"#92400e", fontWeight:700, cursor:"pointer" }}>✏</button>
                      <button onClick={()=>setConfirmDel({...s,_type:"sup"})} style={{ padding:"6px 10px", borderRadius:8, border:"1.5px solid #fca5a5", background:"#fee2e2", color:"#b91c1c", fontWeight:700, cursor:"pointer" }}>🗑</button>
                    </div>
                  </div>
                  {[["担当者",s.contact],["電話",s.phone],["メール",s.email],["住所",s.address]].filter(([,v])=>v).map(([l,v])=>(
                    <div key={l} style={{ fontSize:12, color:"#6b7280", marginBottom:3 }}><span style={{ color:"#9ca3af" }}>{l}：</span>{v}</div>
                  ))}
                  <div style={{ marginTop:10, fontSize:11, color:"#9ca3af", display:"flex", gap:16 }}>
                    <span>登録材料 {materials.filter(m=>m.supplierId===s.id).length}件</span>
                    <span>発注履歴 {orders.filter(o=>o.supplierId===s.id).length}件</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 仕入先フォーム */}
        {view==="supForm"&&supForm&&(
          <div>
            <button onClick={()=>setView("supList")} style={{ ...btnGhost, marginBottom:14, fontSize:13, padding:"8px 16px" }}>← 一覧に戻る</button>
            <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:16, padding:22 }}>
              <div style={{ fontWeight:800, fontSize:18, color:"#065f46", marginBottom:20 }}>{editTarget?"仕入先を編集":"仕入先を追加"}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <Field label="会社名 *"><input value={supForm.name} onChange={e=>setSupForm(p=>({...p,name:e.target.value}))} style={INP}/></Field>
                <Field label="担当者" half><input value={supForm.contact} onChange={e=>setSupForm(p=>({...p,contact:e.target.value}))} style={INP}/></Field>
                <Field label="電話番号" half><input value={supForm.phone} onChange={e=>setSupForm(p=>({...p,phone:e.target.value}))} style={INP}/></Field>
                <Field label="FAX" half><input value={supForm.fax} onChange={e=>setSupForm(p=>({...p,fax:e.target.value}))} style={INP}/></Field>
                <Field label="メールアドレス" half><input value={supForm.email} onChange={e=>setSupForm(p=>({...p,email:e.target.value}))} style={INP}/></Field>
                <Field label="住所" half><input value={supForm.address} onChange={e=>setSupForm(p=>({...p,address:e.target.value}))} style={INP}/></Field>
                <Field label="備考"><textarea value={supForm.notes} onChange={e=>setSupForm(p=>({...p,notes:e.target.value}))} rows={2} style={{ ...INP, resize:"vertical" }}/></Field>
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end", marginTop:20 }}>
                <button onClick={()=>setView("supList")} style={btnGhost}>キャンセル</button>
                <button onClick={saveSup} style={btnPrimary}>{editTarget?"更新する":"追加する"}</button>
              </div>
            </div>
          </div>
        )}

        {/* 仕入先詳細 */}
        {view==="supDetail"&&detailTarget&&(()=>{
          const s=suppliers.find(x=>x.id===detailTarget.id)||detailTarget;
          const linked=materials.filter(m=>m.supplierId===s.id);
          return (
            <div>
              <button onClick={()=>setView("supList")} style={{ ...btnGhost, marginBottom:14, fontSize:13, padding:"8px 16px" }}>← 一覧に戻る</button>
              <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:16, padding:22 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10 }}>
                  <div><div style={{ fontWeight:800, fontSize:20 }}>{s.name}</div>{s.address&&<div style={{ color:"#6b7280", fontSize:13 }}>{s.address}</div>}</div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>{setSupForm({...s});setEditTarget(s.id);setView("supForm");}} style={btnAmber}>✏ 編集</button>
                    <button onClick={()=>setConfirmDel({...s,_type:"sup"})} style={btnDanger}>🗑 削除</button>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:18 }}>
                  {[["担当者",s.contact],["電話",s.phone],["FAX",s.fax],["メール",s.email]].map(([l,v])=>(
                    <div key={l} style={{ background:"#f0fdf4", borderRadius:10, padding:"10px 12px" }}><div style={{ fontSize:11, color:"#6b7280", marginBottom:3 }}>{l}</div><div style={{ fontSize:13, fontWeight:600 }}>{v||"-"}</div></div>
                  ))}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#065f46", marginBottom:8 }}>登録材料 ({linked.length}件)</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {linked.map(m=><span key={m.id} onClick={()=>{setDetailTarget(m);setView("detail");}} style={{ background:"#ecfdf5", border:"1.5px solid #6ee7b7", borderRadius:20, padding:"5px 14px", fontSize:13, color:"#065f46", fontWeight:600, cursor:"pointer" }}>{m.nickname}</span>)}
                  {linked.length===0&&<span style={{ color:"#6b7280", fontSize:13 }}>なし</span>}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 発注 一覧 ─────────────────────────────────── */}
        {view==="orderList"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:20, color:"#065f46" }}>📋 発注管理</div>
              <button onClick={()=>{setOrderSupId(suppliers[0]?.id||null);setOrderItems([]);setOrderSearch("");setView("orderNew");}} style={btnPrimary}>＋ 新規発注</button>
            </div>
            {orders.length===0&&<div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:14, padding:48, textAlign:"center", color:"#6b7280" }}>発注履歴がありません</div>}
            {[{label:"入荷待ち・一部入荷",filter:o=>o.status!=="received"},{label:"入荷完了",filter:o=>o.status==="received"}].map(({label,filter})=>{
              const list=orders.filter(filter); if(!list.length) return null;
              return (
                <div key={label} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#374151", marginBottom:10 }}>{label}（{list.length}件）</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {list.map(o=>{
                      const sup=suppliers.find(s=>s.id===o.supplierId);
                      const stc={"ordered":"#0369a1","partial":"#b45309","received":"#15803d"}[o.status]||"#888";
                      const stl={"ordered":"📦 入荷待ち","partial":"⏳ 一部入荷","received":"✅ 完了"}[o.status]||o.status;
                      return (
                        <div key={o.id} style={{ background:"#fff", border:`1.5px solid ${stc}33`, borderRadius:14, padding:18, cursor:"pointer", boxShadow:"0 1px 4px #0000000a" }}
                          onClick={()=>{setOrderDetail(o);setView("orderDetail");}}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                            <div>
                              <div style={{ fontWeight:800, fontSize:16 }}>{sup?.name||"不明"}</div>
                              <div style={{ fontSize:12, color:"#6b7280" }}>発注日: {fmtDateFull(o.orderDate)}{o.deliveryDate&&`　入荷: ${fmtDateFull(o.deliveryDate)}`}</div>
                            </div>
                            <span style={{ background:stc+"18", color:stc, border:`2px solid ${stc}66`, borderRadius:10, padding:"5px 14px", fontSize:13, fontWeight:700 }}>{stl}</span>
                          </div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:o.status!=="received"?10:0 }}>
                            {o.items.map(it=>{ const done=it.receivedQty>=it.orderQty; return <span key={it.materialId} style={{ background:done?"#dcfce7":"#f3f4f6", border:`1.5px solid ${done?"#86efac":"#d1d5db"}`, borderRadius:20, padding:"3px 10px", fontSize:11, color:done?"#15803d":"#374151", fontWeight:600 }}>{it.nickname} {it.receivedQty}/{it.orderQty}{it.unit}</span>; })}
                          </div>
                          {o.status!=="received"&&(
                            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>receiveAll(o)} style={{ ...btnPrimary, fontSize:13, padding:"10px 18px" }}>✅ 全数入荷</button>
                              <button onClick={()=>openInspect(o)} style={{ ...btnGhost, fontSize:13, padding:"10px 18px" }}>🔍 数量指定</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 発注詳細 */}
        {view==="orderDetail"&&orderDetail&&(()=>{
          const o=orders.find(x=>x.id===orderDetail.id)||orderDetail;
          const sup=suppliers.find(s=>s.id===o.supplierId);
          const stc={"ordered":"#0369a1","partial":"#b45309","received":"#15803d"}[o.status]||"#888";
          const stl={"ordered":"発注済・入荷待ち","partial":"一部入荷","received":"入荷完了"}[o.status]||o.status;
          return (
            <div>
              <button onClick={()=>setView("orderList")} style={{ ...btnGhost, marginBottom:14, fontSize:13, padding:"8px 16px" }}>← 発注一覧に戻る</button>
              <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:16, padding:22 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:20 }}>{sup?.name}</div>
                    <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>発注日: {fmtDateFull(o.orderDate)}{o.deliveryDate&&`　入荷日: ${fmtDateFull(o.deliveryDate)}`}</div>
                  </div>
                  <span style={{ background:stc+"18", color:stc, border:`2px solid ${stc}66`, borderRadius:10, padding:"6px 16px", fontSize:14, fontWeight:700 }}>{stl}</span>
                </div>
                {o.status!=="received"&&<div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:18 }}>
                  <button onClick={()=>receiveAll(o)} style={btnPrimary}>✅ 全数入荷（ワンクリック）</button>
                  <button onClick={()=>openInspect(o)} style={btnGhost}>🔍 数量を指定して検品</button>
                </div>}
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                  {o.items.map(it=>{ const rem=it.orderQty-it.receivedQty; const done=rem<=0; return (
                    <div key={it.materialId} style={{ background:"#f0fdf4", borderRadius:12, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>{it.nickname}</div>
                        <div style={{ fontSize:12, color:"#6b7280", fontFamily:"'JetBrains Mono',monospace" }}>{it.partNumber}</div>
                      </div>
                      <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                        <div style={{ textAlign:"center" }}><div style={{ fontSize:10, color:"#9ca3af" }}>発注</div><div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, fontSize:18 }}>{it.orderQty}<span style={{ fontSize:11, fontWeight:400, marginLeft:2 }}>{it.unit}</span></div></div>
                        <div style={{ textAlign:"center" }}><div style={{ fontSize:10, color:"#9ca3af" }}>入荷済</div><div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, fontSize:18, color:it.receivedQty>0?"#15803d":"#d1d5db" }}>{it.receivedQty}<span style={{ fontSize:11, fontWeight:400, marginLeft:2 }}>{it.unit}</span></div></div>
                        <div style={{ textAlign:"center" }}><div style={{ fontSize:10, color:"#9ca3af" }}>残り</div><div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, fontSize:18, color:done?"#15803d":"#b91c1c" }}>{done?"✓":rem}<span style={{ fontSize:11, fontWeight:400, marginLeft:2 }}>{done?"":it.unit}</span></div></div>
                      </div>
                    </div>
                  );})}
                </div>
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button onClick={()=>{if(sup)exportCSV(sup,o.items.map(i=>({...i,orderQty:i.orderQty})),myCompany);}} style={btnGhost}>📥 CSV</button>
                  <button onClick={()=>{if(sup)printOrder(sup,o.items.map(i=>({...i,orderQty:i.orderQty})),myCompany);}} style={btnPrimary}>🖨 印刷/PDF</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 発注 新規 */}
        {view==="orderNew"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:20, color:"#065f46" }}>📋 新規発注</div>
              <button onClick={()=>setView("orderList")} style={{ ...btnGhost, padding:"8px 16px", fontSize:13 }}>← 戻る</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"minmax(0,340px) 1fr", gap:14, alignItems:"start" }}>
              <div>
                <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:14, padding:16, marginBottom:12 }}>
                  <div style={{ fontWeight:700, color:"#065f46", marginBottom:12, fontSize:14 }}>① 仕入先を選択</div>
                  {suppliers.map(s=>(
                    <div key={s.id} onClick={()=>setOrderSupId(s.id)} style={{ padding:"11px 14px", borderRadius:10, border:`1.5px solid ${orderSupId===s.id?"#059669":"#e5e7eb"}`, background:orderSupId===s.id?"#ecfdf5":"transparent", marginBottom:8, cursor:"pointer" }}>
                      <div style={{ fontWeight:700, color:orderSupId===s.id?"#065f46":"#111827" }}>{s.name}</div>
                      {s.contact&&<div style={{ fontSize:12, color:"#6b7280" }}>{s.contact}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:14, padding:16 }}>
                  <div style={{ fontWeight:700, color:"#065f46", marginBottom:10, fontSize:14 }}>② 選択中（{orderItems.length}件）</div>
                  {orderItems.length===0?<div style={{ color:"#9ca3af", fontSize:13 }}>右から材料を選んでください</div>:(
                    <>
                      {orderItems.map(it=>(
                        <div key={it.materialId} style={{ background:"#f0fdf4", borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                          <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{it.nickname}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:12, color:"#6b7280" }}>発注数：</span>
                            <input type="number" value={it.orderQty} onChange={e=>setOrderItems(prev=>prev.map(i=>i.materialId===it.materialId?{...i,orderQty:Math.max(1,parseInt(e.target.value)||1)}:i))}
                              style={{ width:64, padding:"6px 10px", borderRadius:8, border:"1.5px solid #d1fae5", background:"#fff", color:"#111827", fontSize:15, outline:"none", fontFamily:"'JetBrains Mono',monospace", fontWeight:700, textAlign:"center" }}/>
                            <span style={{ fontSize:12, color:"#6b7280" }}>{it.unit}</span>
                            <button onClick={()=>setOrderItems(prev=>prev.filter(i=>i.materialId!==it.materialId))} style={{ marginLeft:"auto", padding:"5px 9px", borderRadius:8, border:"1.5px solid #fca5a5", background:"#fee2e2", color:"#b91c1c", fontWeight:700, cursor:"pointer", fontSize:12 }}>✕</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={()=>setView("orderPreview")} disabled={!orderSupId} style={{ ...btnPrimary, width:"100%", marginTop:8, opacity:orderSupId?1:.5 }}>③ プレビュー →</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:14, padding:16 }}>
                <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                  <input placeholder="🔍 材料名・品番" value={orderSearch} onChange={e=>setOrderSearch(e.target.value)} style={{ ...INP, flex:1, minWidth:120 }}/>
                  <button onClick={()=>{ const low=materials.filter(m=>m.minStock>0&&m.quantity<=m.minStock&&!orderItems.find(i=>i.materialId===m.id)); low.forEach(m=>toggleOrderItem(m)); showToast(`${low.length}件追加`); }}
                    style={{ padding:"11px 14px", borderRadius:10, border:"1.5px solid #fcd34d", background:"#fef3c7", color:"#92400e", fontWeight:700, cursor:"pointer", fontSize:13, whiteSpace:"nowrap" }}>⚠ 不足品全追加</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:500, overflowY:"auto" }}>
                  {(orderSearch.trim()?materials.filter(m=>m.nickname.toLowerCase().includes(orderSearch.toLowerCase())||m.partNumber.toLowerCase().includes(orderSearch.toLowerCase())):materials).map(m=>{
                    const selected=!!orderItems.find(i=>i.materialId===m.id);
                    return (
                      <div key={m.id} onClick={()=>toggleOrderItem(m)} style={{ padding:"12px 14px", borderRadius:10, border:`1.5px solid ${selected?"#059669":"#e5e7eb"}`, background:selected?"#ecfdf5":"#fff", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", color:"#059669", fontSize:12, fontWeight:700, marginRight:8 }}>{m.partNumber}</span>
                          <span style={{ fontWeight:700, fontSize:14 }}>{m.nickname}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <QtyDisplay quantity={m.quantity} minStock={m.minStock} unit={m.unit} size="sm"/>
                          {selected&&<span style={{ color:"#059669", fontSize:18, fontWeight:800 }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 発注プレビュー */}
        {view==="orderPreview"&&(()=>{
          const sup=suppliers.find(s=>s.id===orderSupId);
          if(!sup) return null;
          return (
            <div>
              <button onClick={()=>setView("orderNew")} style={{ ...btnGhost, marginBottom:14, fontSize:13, padding:"8px 16px" }}>← 編集に戻る</button>
              <div style={{ background:"#fff", border:"1.5px solid #d1fae5", borderRadius:16, padding:22 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:20 }}>発注書プレビュー</div>
                    <div style={{ color:"#6b7280", fontSize:13 }}>{sup.name}　{fmtDateFull(today())}</div>
                  </div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <button onClick={()=>exportCSV(sup,orderItems,myCompany)} style={btnGhost}>📥 CSV</button>
                    <button onClick={()=>printOrder(sup,orderItems,myCompany)} style={btnGhost}>🖨 印刷/PDF</button>
                    <button onClick={submitOrder} style={{ ...btnPrimary, background:"linear-gradient(135deg,#f59e0b,#f97316)" }}>✅ 発注を確定</button>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {orderItems.map((it,i)=>(
                    <div key={it.materialId} style={{ background:"#f0fdf4", borderRadius:12, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                      <div>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", color:"#059669", fontSize:12, fontWeight:700, marginRight:10 }}>{it.partNumber}</span>
                        <span style={{ fontWeight:700, fontSize:15 }}>{it.nickname}</span>
                        <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{it.officialName}</div>
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:800, fontSize:22, color:"#065f46" }}>
                        {it.orderQty}<span style={{ fontSize:13, fontWeight:500, marginLeft:4 }}>{it.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
