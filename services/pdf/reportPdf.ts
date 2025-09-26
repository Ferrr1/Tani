import { currency } from "@/utils/currency";
import * as FS from "expo-file-system";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

export type ProductionRow = {
  label: string;
  quantity: number | null;
  unitType: string | null;
  unitPrice: number;
};
export type CashRow = {
  category: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number;
};
export type ToolRow = {
  toolName: string;
  quantity: number;
  purchasePrice: number;
};
export type ExtraRow = { category: string; label: string; amount: number };

export type GenerateReportPdfParams = {
  fileName?: string;
  title?: string; // default: "Report"
  filterText: string; // contoh: "Filter: Musim Ke-1" / "Filter: Tahun 2024"
  profileAreaHa: number; // luas profil
  effectiveArea: number; // luas konversi aktif
  landFactor: number; // faktor konversi (hanya ditampilkan)
  perHaTitle?: string; // default: `Tabel Analisis Kelayakan Usaha Tani per ${profileAreaHa} Ha`
  production: ProductionRow[];
  cash: CashRow[];
  tools: ToolRow[];
  extras: ExtraRow[];
  // NONCASH TK:
  laborNonCashNom: number; // total nominal (fallback)
  laborNonCashDetail?: {
    // opsional: kalau ada, tampil qty/unit/harga/nilai persis seperti UI
    qty: number | null;
    unit: string | null;
    unitPrice: number | null;
    amount: number;
  };

  // Tambahan metadata yang diminta
  cropType?: string | null; // jenis tanaman
  village?: string | null; // nama desa

  // Utilities
  prettyLabel: (raw: string) => string;
  share?: boolean;
};

type AnyFS = typeof FS & {
  Directory?: any;
  File?: any;
};

function prodValue(p: ProductionRow) {
  return p.quantity != null ? p.quantity * p.unitPrice : p.unitPrice;
}
function cashValue(c: CashRow) {
  return c.quantity != null ? c.quantity * c.unitPrice : c.unitPrice;
}
function toolValue(t: ToolRow) {
  return t.quantity * t.purchasePrice;
}
function extraValue(e: ExtraRow) {
  return e.amount || 0;
}

export async function generateReportPdf({
  fileName,
  title = "Report",
  filterText,
  cropType,
  village,
  perHaTitle,
  profileAreaHa,
  effectiveArea,
  landFactor,
  production,
  cash,
  tools,
  extras,
  laborNonCashNom,
  laborNonCashDetail,
  prettyLabel,
  share = true,
}: GenerateReportPdfParams): Promise<{ uri: string }> {
  const _perHaTitle =
    perHaTitle ?? `Tabel Analisis Kelayakan Usaha Tani per ${profileAreaHa} Ha`;

  // Totals (tanpa * landFactor)
  const totalProduksi = production.reduce((acc, p) => acc + prodValue(p), 0);
  const totalBiayaTunai = cash.reduce((acc, c) => acc + cashValue(c), 0);
  const totalTools = tools.reduce((acc, t) => acc + toolValue(t), 0);
  const totalExtras = extras.reduce((acc, e) => acc + extraValue(e), 0);

  // TK Non Tunai: gunakan detail jika tersedia; kalau tidak, pakai nominal total
  const tkDetailAmount = laborNonCashDetail?.amount ?? null;
  const totalBiayaNonTunaiTK =
    tkDetailAmount != null ? tkDetailAmount : laborNonCashNom;

  const totalBiayaNonTunaiLain = totalTools + totalExtras;
  const totalBiayaNonTunai = totalBiayaNonTunaiTK + totalBiayaNonTunaiLain;
  const totalBiaya = totalBiayaTunai + totalBiayaNonTunai;

  const pendapatanAtasBiayaTunai = totalProduksi - totalBiayaTunai;
  const pendapatanAtasBiayaTotal = totalProduksi - totalBiaya;
  const rcTunai = totalBiayaTunai > 0 ? totalProduksi / totalBiayaTunai : 0;
  const rcTotal = totalBiaya > 0 ? totalProduksi / totalBiaya : 0;

  const cropVillageLine = [
    cropType ? `Jenis Tanaman: <b>${cropType}</b>` : `Jenis Tanaman: <b>-</b>`,
    village ? `Desa: <b>${village}</b>` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const html = `
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .muted { color: #6b7280; }
  .pill { display:inline-block; padding: 2px 8px; border-radius: 999px; background:#f3f4f6; color:#374151; font-size: 11px; }
  .section-title { margin: 16px 0 8px; font-weight: 800; }
  .sub-title { margin: 8px 0 4px; font-weight: 700; }
  .sub-mini { margin: 6px 0; color:#6b7280; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 8px 6px; font-weight: 800; color:#6b7280;}
  tbody td { border-bottom: 1px solid #f3f4f6; padding: 8px 6px; }
  .td-uraian { width: 40%; }
  .td-small { width: 15%; }
  .td-right { width: 20%; text-align: right; font-weight: 800; }
  .totals { margin-top: 8px; }
  .totals .row { display:flex; justify-content:space-between; margin-top:6px; }
  .bold { font-weight:900; }
  .meta { font-size: 12px; }
</style>
</head>
<body>

  <h1>${title}</h1>
  <div class="pill">${filterText}</div>
  <div class="meta muted" style="display:flex; flex-direction:column;">
    ${_perHaTitle}
    <p style="margin-top:-4px">${
      cropVillageLine ? "<br/>" + cropVillageLine : ""
    }<br/></p>
    <p style="margin-top:-4px">Luas Profil: <b>${profileAreaHa} Ha</b></p>
    <p style="margin-top:-4px">Luas Konversi: <b>${effectiveArea} Ha</b></p>
    <p style="margin-top:-4px">Faktor: <b>${landFactor.toFixed(2)}</b></p>
  </div>

  <!-- Header Kolom -->
  <table style="margin-top:12px">
    <thead>
      <tr>
        <th class="td-uraian">Uraian</th>
        <th class="td-small">Jumlah</th>
        <th class="td-small">Satuan</th>
        <th class="td-small">Harga (Rp)</th>
        <th class="td-right">Nilai (Rp)</th>
      </tr>
    </thead>
    <tbody>

      <!-- PRODUKSI -->
      <tr><td colspan="5" class="section-title">Produksi</td></tr>
      ${production
        .map((p) => {
          const value = prodValue(p);
          const qtyStr = p.quantity != null ? String(p.quantity) : "-";
          const unitStr = p.unitType ?? "-";
          const priceStr = p.unitPrice != null ? currency(p.unitPrice) : "-";
          return `
            <tr>
              <td>${p.label ?? "Penerimaan"}</td>
              <td>${qtyStr}</td>
              <td>${unitStr}</td>
              <td>${priceStr}</td>
              <td class="td-right">${currency(value)}</td>
            </tr>
          `;
        })
        .join("")}

      <!-- BIAYA PRODUKSI -->
      <tr><td colspan="5" class="section-title">Biaya Produksi</td></tr>
      <tr><td colspan="5" class="sub-title">I. Biaya Tunai</td></tr>
      ${cash
        .map((c) => {
          const label = prettyLabel(c.category || "");
          const value = cashValue(c);
          const qtyStr = c.quantity != null ? String(c.quantity) : "-";
          const unitStr = c.unit ?? "-";
          // harga hanya bila ada qty (konsisten UI)
          const priceStr =
            c.quantity != null && c.unitPrice != null
              ? currency(c.unitPrice)
              : "-";
          return `
            <tr>
              <td>${label}</td>
              <td>${qtyStr}</td>
              <td>${unitStr}</td>
              <td>${priceStr}</td>
              <td class="td-right">${currency(value)}</td>
            </tr>
          `;
        })
        .join("")}

      <tr><td colspan="5" class="sub-title">II. Biaya Non Tunai</td></tr>

      <!-- TK Dalam Keluarga -->
      ${
        laborNonCashDetail && laborNonCashDetail.amount > 0
          ? `
        <tr>
          <td>TK Dalam Keluarga</td>
          <td>${laborNonCashDetail.qty ?? "-"}</td>
          <td>${laborNonCashDetail.unit ?? "-"}</td>
          <td>${
            laborNonCashDetail.unitPrice != null
              ? currency(laborNonCashDetail.unitPrice)
              : "-"
          }</td>
          <td class="td-right">${currency(laborNonCashDetail.amount)}</td>
        </tr>`
          : totalBiayaNonTunaiTK > 0
          ? `
        <tr>
          <td>TK Dalam Keluarga</td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td class="td-right">${currency(totalBiayaNonTunaiTK)}</td>
        </tr>`
          : ""
      }

      <tr><td colspan="5" class="sub-mini">Biaya Lain</td></tr>
      ${tools
        .map((t) => {
          const value = toolValue(t);
          return `
            <tr>
              <td>Alat${t.toolName ? ` | ${t.toolName}` : ""}</td>
              <td>${t.quantity}</td>
              <td>-</td>
              <td>${currency(t.purchasePrice)}</td>
              <td class="td-right">${currency(value)}</td>
            </tr>
          `;
        })
        .join("")}
      ${extras
        .map((e) => {
          const value = extraValue(e);
          const label = prettyLabel(e.label ?? e.category ?? "Biaya Lain");
          return `
            <tr>
              <td>${label}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td class="td-right">${currency(value)}</td>
            </tr>
          `;
        })
        .join("")}

    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals">
    <div class="row"><div>Total Biaya Tunai</div><div>${currency(
      totalBiayaTunai
    )}</div></div>
    <div class="row"><div>Total Biaya Non Tunai</div><div>${currency(
      totalBiayaNonTunai
    )}</div></div>
    <div class="row"><div class="bold">Total Biaya</div><div class="bold">${currency(
      totalBiaya
    )}</div></div>

    <div class="section-title">Pendapatan</div>
    <div class="row"><div>Pendapatan Atas Biaya Tunai</div><div>${currency(
      pendapatanAtasBiayaTunai
    )}</div></div>
    <div class="row"><div>Pendapatan Atas Biaya Total</div><div>${currency(
      pendapatanAtasBiayaTotal
    )}</div></div>
    <div class="row"><div>R/C Biaya Tunai</div><div>${(rcTunai || 0).toFixed(
      2
    )}</div></div>
    <div class="row"><div>R/C Biaya Total</div><div>${(rcTotal || 0).toFixed(
      2
    )}</div></div>
  </div>

</body>
</html>
`.trim();

  // 1) Print to a temporary file
  const { uri: tmpUri } = await Print.printToFileAsync({ html });

  // 2) Save under a deterministic name using the **new FS API** if present; otherwise fall back to legacy API
  const FSAny = FS as AnyFS;
  let outUri = tmpUri;

  if (FSAny.Directory && FSAny.File) {
    // ===== New API path (SDK 54+): Directory / File classes =====
    try {
      const { Directory, File } = FSAny;

      // Use the cache scope for generated documents (safe & ephemeral)
      // Create (or ensure) a "reports" directory in cache
      // NOTE: the exact method names come from the new object-based API.
      // These have stable names in SDK 54+ docs/blog.
      const reportsDir = await Directory.cache.createDirectoryAsync("reports", {
        intermediates: true,
      });

      // Create a file handle with your final name
      const finalName = (fileName || title) + ".pdf";
      const target = await reportsDir.createFileAsync(finalName, {
        overwrite: true,
      });

      // Move the tmp print result to the target file
      await File.fromUri(tmpUri).moveAsync(target.uri);
      outUri = target.uri;
    } catch (e) {
      // If something goes wrong with the new API, we’ll fall back to legacy below.
      console.warn("New FS API failed, falling back to legacy:", e);
    }
  }

  if (outUri === tmpUri) {
    // ===== Legacy API path (explicit, no warnings) =====
    // Import from "expo-file-system/legacy" so your app doesn't show deprecation warnings.
    const Legacy = await import("expo-file-system/legacy");

    const reportsDir = Legacy.cacheDirectory + "reports/";
    try {
      const info = await Legacy.getInfoAsync(reportsDir);
      if (!info.exists) {
        await Legacy.makeDirectoryAsync(reportsDir, { intermediates: true });
      }
    } catch {}

    const finalName = (fileName || title) + ".pdf";
    const target = reportsDir + finalName;

    try {
      await Legacy.moveAsync({ from: tmpUri, to: target });
      outUri = target;
    } catch {
      // keep tmpUri if move fails
      outUri = tmpUri;
    }
  }

  if (share) {
    await shareAsync(outUri, {
      mimeType: "application/pdf",
      dialogTitle: "Bagikan Report PDF",
    });
  }

  return { uri: outUri };
}
