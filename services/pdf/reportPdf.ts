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
export type CashExtraRow = { label: string; amount: number };
export type ToolRow = {
  toolName: string;
  quantity: number;
  purchasePrice: number;
};
export type ExtraRow = { category: string; label: string; amount: number };

// ====== Year mode types (mengikuti screen) ======
export type YearRow = {
  section: "penerimaan" | "biaya" | "pendapatan" | "rc";
  label: string;
  amount: number;
};

export type GenerateReportPdfParams = {
  fileName?: string;
  title?: string;
  profileAreaHa: number;
  effectiveArea: number;
  landFactor: number;
  perHaTitle?: string;
  production: ProductionRow[];
  cash: CashRow[];
  cashExtras?: CashExtraRow[];
  tools: ToolRow[];
  extras: ExtraRow[];
  laborNonCashNom: number;
  laborNonCashDetail?: {
    qty: number | null;
    unit: string | null;
    unitPrice: number | null;
    amount: number;
  };

  // Metadata tambahan
  cropType?: unknown; // bisa string atau array
  village?: string | null;

  // Year mode
  yearRows?: YearRow[];

  // Utilities
  prettyLabel: (raw: string) => string;
  share?: boolean;
};

type AnyFS = typeof FS & { Directory?: any; File?: any };

function prodValue(p: ProductionRow) {
  return p.quantity != null ? p.quantity * p.unitPrice : p.unitPrice;
}
function cashValue(c: CashRow) {
  return c.quantity != null ? c.quantity * c.unitPrice : c.unitPrice;
}
function cashExtraValue(e: CashExtraRow) {
  return e.amount || 0;
}
function toolValue(t: ToolRow) {
  return t.quantity * t.purchasePrice;
}
function extraValue(e: ExtraRow) {
  return e.amount || 0;
}

// ===== Helpers Year Mode =====
function extractMtNo(label: string): number | null {
  const m = label.match(/MT\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}
function yr(yearRows: YearRow[] | undefined, lbl: string): number {
  if (!yearRows?.length) return 0;
  const row = yearRows.find((r) => r.label.toLowerCase() === lbl.toLowerCase());
  return row ? Number(row.amount || 0) : 0;
}

// ===== Title Case helper (sederhana) =====
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ===== Format crop type (robust: string/array/nested) =====
function formatCropTypeLine(cropType: unknown): string | null {
  const collectParts = (input: unknown): string[] => {
    if (Array.isArray(input)) {
      // flatten lalu kumpulkan
      return input.flat(Infinity as 1).flatMap(collectParts);
    }
    if (typeof input === "string") {
      const raw = input.trim();
      if (!raw) return [];
      // pecah bila user menaruh separator campur
      return raw
        .split(/[,\|/]+/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    // tipe lain diabaikan
    return [];
  };

  const parts = collectParts(cropType).map(titleCase);

  if (parts.length === 0) return null;

  const label = parts.length === 1 ? parts[0] : parts.join(" dan ");
  return `Jenis Tanaman: <b>${label}</b>`;
}

export async function generateReportPdf({
  fileName,
  title = "Report",
  cropType,
  village,
  perHaTitle,
  profileAreaHa,
  effectiveArea,
  landFactor,
  production,
  cash,
  cashExtras = [],
  tools,
  extras,
  laborNonCashNom,
  laborNonCashDetail,
  prettyLabel,
  yearRows,
  share = true,
}: GenerateReportPdfParams): Promise<{ uri: string }> {
  const _perHaTitle =
    perHaTitle ?? `Tabel Analisis Kelayakan Usaha Tani per ${profileAreaHa} Ha`;

  // Totals untuk season mode
  const totalProduksi = production.reduce((acc, p) => acc + prodValue(p), 0);
  const totalBiayaTunai =
    cash.reduce((acc, c) => acc + cashValue(c), 0) +
    cashExtras.reduce((acc, e) => acc + cashExtraValue(e), 0);
  const totalTools = tools.reduce((acc, t) => acc + toolValue(t), 0);
  const totalExtras = extras.reduce((acc, e) => acc + extraValue(e), 0);

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

  // ===== meta atas (crop & village)
  const cropLine = formatCropTypeLine(cropType);
  const villageLine = village ? `Desa: <b>${village}</b>` : null;
  const cropVillageLine = [cropLine, villageLine].filter(Boolean).join(" | ");

  // ===== Year mode detection
  const isYearMode = !!(yearRows && yearRows.length > 0);
  const mtList = isYearMode
    ? Array.from(
        new Set(
          yearRows!
            .map((r) => extractMtNo(r.label || ""))
            .filter((n): n is number => Number.isFinite(n))
        )
      ).sort((a, b) => a - b)
    : [];

  // ===== HTML parts =====
  const baseStyles = `
  @page { size: A4; margin: 18mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .muted { color: #6b7280; }
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
  `;

  // ===== TABLE HEADERS
  const headSeason = `
    <thead>
      <tr>
        <th class="td-uraian">Uraian</th>
        <th class="td-small">Jumlah</th>
        <th class="td-small">Satuan</th>
        <th class="td-small">Harga (Rp)</th>
        <th class="td-right">Nilai (Rp)</th>
      </tr>
    </thead>
  `;

  const headYear = `
    <thead>
      <tr>
        <th class="td-uraian">Uraian</th>
        <th class="td-right">Nilai (Rp)</th>
      </tr>
    </thead>
  `;

  // ===== BODY: Season mode rows
  const bodySeason = `
    <!-- PRODUKSI -->
    <tr><td colspan="5" class="section-title">Penerimaan</td></tr>
    ${production
      .map((p) => {
        const value = prodValue(p);
        const qtyStr =
          p.quantity != null ? Number(p.quantity)?.toFixed(0) : "-";
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
        const qtyStr =
          c.quantity != null ? Number(c.quantity)?.toFixed(0) : "-";
        const unitStr = c.unit ?? "-";
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

    ${
      cashExtras.length
        ? `
    <tr><td colspan="5" class="sub-mini">Biaya Lain</td></tr>
    ${cashExtras
      .map((e) => {
        const value = cashExtraValue(e);
        const label = prettyLabel(e.label ?? "Biaya Lain");
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
    `
        : ""
    }

    <tr><td colspan="5" class="sub-title">II. Biaya Non Tunai</td></tr>

    ${
      laborNonCashDetail && laborNonCashDetail.amount > 0
        ? `
      <tr>
        <td>TK Dalam Keluarga</td>
        <td>${laborNonCashDetail.qty?.toFixed(0) ?? "-"}</td>
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
            <td>${t.quantity.toFixed(0)}</td>
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
  `;

  // ===== BODY: Year mode rows (tanpa kolom Jumlah)
  const bodyYear = `
    <!-- PENERIMAAN -->
    <tr><td colspan="2" class="section-title">Penerimaan</td></tr>
    ${mtList
      .map(
        (n) => `
      <tr>
        <td>Penerimaan MT ${n}</td>
        <td class="td-right">${currency(
          yr(yearRows, `Penerimaan MT ${n}`)
        )}</td>
      </tr>`
      )
      .join("")}

    <!-- BIAYA PRODUKSI -->
    <tr><td colspan="2" class="section-title">Biaya Produksi</td></tr>
    ${mtList
      .map(
        (n) => `
      <tr><td class="sub-title" colspan="2">MT ${n}</td></tr>
      <tr>
        <td>Biaya Non Tunai MT ${n}</td>
        <td class="td-right">${currency(
          yr(yearRows, `Biaya Non Tunai MT ${n}`)
        )}</td>
      </tr>
      <tr>
        <td>Biaya Tunai MT ${n}</td>
        <td class="td-right">${currency(
          yr(yearRows, `Biaya Tunai MT ${n}`)
        )}</td>
      </tr>
      <tr>
        <td>Biaya Total MT ${n}</td>
        <td class="td-right">${currency(
          yr(yearRows, `Biaya Total MT ${n}`)
        )}</td>
      </tr>`
      )
      .join("")}

    <!-- PENDAPATAN -->
    <tr><td colspan="2" class="section-title">Pendapatan</td></tr>
    ${mtList
      .map(
        (n) => `
      <tr>
        <td>Pendapatan Atas Biaya Tunai MT ${n}</td>
        <td class="td-right">${currency(
          yr(yearRows, `Pendapatan Atas Biaya Tunai MT ${n}`)
        )}</td>
      </tr>
      <tr>
        <td>Pendapatan Atas Biaya Non Tunai MT ${n}</td>
        <td class="td-right">${currency(
          yr(yearRows, `Pendapatan Atas Biaya Non Tunai MT ${n}`)
        )}</td>
      </tr>
      <tr>
        <td>Pendapatan Atas Biaya Total MT ${n}</td>
        <td class="td-right">${currency(
          yr(yearRows, `Pendapatan Atas Biaya Total MT ${n}`)
        )}</td>
      </tr>`
      )
      .join("")}

    <!-- R/C -->
    <tr><td colspan="2" class="section-title">R/C</td></tr>
    ${mtList
      .map(
        (n) => `
      <tr>
        <td>R/C Biaya Tunai MT ${n}</td>
        <td class="td-right">${(
          yr(yearRows, `R/C Biaya Tunai MT ${n}`) || 0
        ).toFixed(2)}</td>
      </tr>
      <tr>
        <td>R/C Biaya Non Tunai MT ${n}</td>
        <td class="td-right">${(
          yr(yearRows, `R/C Biaya Non Tunai MT ${n}`) || 0
        ).toFixed(2)}</td>
      </tr>
      <tr>
        <td>R/C Biaya Total MT ${n}</td>
        <td class="td-right">${(
          yr(yearRows, `R/C Biaya Total MT ${n}`) || 0
        ).toFixed(2)}</td>
      </tr>`
      )
      .join("")}
  `;

  // ===== FINAL HTML =====
  const html = `
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${baseStyles}</style>
</head>
<body>

  <h1>${title}</h1>
  <div class="meta muted" style="display:flex; flex-direction:column;">
    ${_perHaTitle}
    ${
      cropVillageLine
        ? `<p style="margin-top:-4px"><br/>${cropVillageLine}<br/></p>`
        : ""
    }
    <p style="margin-top:-4px">Luas Profil: <b>${profileAreaHa} Ha</b></p>
    <p style="margin-top:-4px">Luas Konversi: <b>${effectiveArea} Ha</b></p>
    <p style="margin-top:-4px">Faktor: <b>${landFactor.toFixed(2)}</b></p>
  </div>

  <table style="margin-top:12px">
    ${isYearMode ? headYear : headSeason}
    <tbody>
      ${isYearMode ? bodyYear : bodySeason}
    </tbody>
  </table>

  ${
    isYearMode
      ? ""
      : `
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
  `
  }

</body>
</html>
`.trim();

  // Cetak & simpan
  const { uri: tmpUri } = await Print.printToFileAsync({ html });

  const FSAny = FS as AnyFS;
  let outUri = tmpUri;

  if (FSAny.Directory && FSAny.File) {
    try {
      const { Directory, File } = FSAny;
      const reportsDir = await Directory.cache.createDirectoryAsync("reports", {
        intermediates: true,
      });
      const finalName = (fileName || title) + ".pdf";
      const target = await reportsDir.createFileAsync(finalName, {
        overwrite: true,
      });
      await File.fromUri(tmpUri).moveAsync(target.uri);
      outUri = target.uri;
    } catch (e) {
      console.warn("New FS API failed, falling back to legacy:", e);
    }
  }

  if (outUri === tmpUri) {
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
      outUri = tmpUri;
    }
  }

  if (share) {
    await shareAsync(outUri, {
      mimeType: "application/pdf",
      dialogTitle: "Bagikan Laporan PDF",
    });
  }

  return { uri: outUri };
}
