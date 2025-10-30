import * as XLSX from 'xlsx';
import { ParsedSheetData, StructureChangeLevel } from '@/types';

export const parseExcelFile = async (file: File, checkHistory: (channelCode: string) => Promise<boolean>): Promise<ParsedSheetData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const sheets: ParsedSheetData[] = await Promise.all(
          workbook.SheetNames.map(async (sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Detect sheet type
            const sheetType = detectSheetType(sheetName);
            const channelCode = extractChannelCode(sheetName, jsonData);
            
            // Check if this channel has historical versions
            const hasHistoricalVersion = await checkHistory(channelCode);
            
            // Only perform structure validation if there's a historical version
            let structureChangeLevel: StructureChangeLevel | undefined;
            let structureChangeMessage: string | undefined;
            
            if (hasHistoricalVersion) {
              const { ranges: currentRanges, signature: currentSig } = computeStructureSignature(jsonData);
              const storageKey = `channelStructure:${channelCode}`;
              let prevSig: string | null = null;
              let prevRanges: Array<{ l: number; u: number }> = [];
              try {
                const prev = localStorage.getItem(storageKey);
                if (prev) {
                  const parsed = JSON.parse(prev);
                  prevSig = parsed.signature;
                  prevRanges = parsed.ranges || [];
                }
              } catch {}

              if (prevSig) {
                const { level, message } = compareStructure(prevRanges, currentRanges);
                structureChangeLevel = level;
                structureChangeMessage = message;
              } else {
                structureChangeLevel = 'MINOR';
                structureChangeMessage = 'Detected existing history but no local baseline; tentatively marked as minor changes';
              }

              try {
                localStorage.setItem(storageKey, JSON.stringify({ signature: currentSig, ranges: currentRanges }));
              } catch {}
            }
            
            return {
              sheetName,
              sheetType,
              rows: jsonData,
              channelCode,
              structureChangeLevel,
              structureChangeMessage,
              hasHistoricalVersion,
              isFirstVersion: !hasHistoricalVersion
            };
          })
        );
        
        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

const detectSheetType = (sheetName: string): string => {
  if (sheetName.includes('目录') || sheetName.toLowerCase().includes('index')) {
    return 'OTHER';
  }
  if (sheetName.includes('偏远') || sheetName.includes('附加费') || sheetName.includes('燃油')) {
    return 'SURCHARGE';
  }
  return 'RATE_CARD';
};

const extractChannelCode = (sheetName: string, jsonData: any[]): string => {
  // Try from sheet name first (letters + digits, more flexible)
  const matchName = sheetName.match(/[A-Za-z]{2,}\d{2,}/);
  if (matchName) return matchName[0].toUpperCase();

  // Scan top-left cells for channel code patterns (运输代码/渠道代码/Channel Code)
  const codeRegexes = [
    /运输代码[:：]\s*([A-Za-z0-9_-]+)/,
    /渠道代码[:：]\s*([A-Za-z0-9_-]+)/,
    /Channel\s*Code[:：]?\s*([A-Za-z0-9_-]+)/i,
    /Channel\s*ID[:：]?\s*([A-Za-z0-9_-]+)/i,
  ];
  const maxRows = Math.min(12, jsonData.length);
  for (let r = 0; r < maxRows; r++) {
    const row = jsonData[r] as any[];
    const maxCols = row ? Math.min(8, row.length) : 0;
    for (let c = 0; c < maxCols; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        for (const re of codeRegexes) {
          const m = cell.match(re);
          if (m && m[1]) {
            return m[1].toUpperCase();
          }
        }
      }
    }
  }

  // Vendor hint fallback
  if (/云途|YunExpress/i.test(sheetName)) {
    return 'YE000';
  }

  // Fallback random code
  return `CH${Math.floor(Math.random() * 1000)}`;
};

const simulateStructureValidation = (index: number): StructureChangeLevel => {
  // Simulate different validation results for demo
  const levels: StructureChangeLevel[] = ['NONE', 'MINOR', 'MAJOR'];
  return levels[index % 3];
};

const getStructureMessage = (level: StructureChangeLevel): string => {
  switch (level) {
    case 'NONE':
      return 'Weight structure is identical to previous version';
    case 'MINOR':
      return 'Minor weight boundary adjustments detected (≤0.01kg)';
    case 'MAJOR':
      return 'Major structure changes: new weight ranges or significant boundary modifications detected';
    default:
      return '';
  }
};

// ---- Structure helpers ----

type Range = { l: number; u: number };

function extractWeightRanges(jsonData: any[]): Range[] {
  const ranges: Range[] = [];
  const seen = new Set<string>();
  const maxRows = Math.min(500, jsonData.length);
  const reDash = /(?<!\d)(\d+(?:\.\d+)?)\s*[-–~－—至到]\s*(\d+(?:\.\d+)?)(?!\d)/;
  const reIneq = /(\d+(?:\.\d+)?)\s*[＜<]\s*W\s*[≤<=]\s*(\d+(?:\.\d+)?)/i;
  for (let r = 0; r < maxRows; r++) {
    const row = jsonData[r] as any[];
    const cols = row ? row.length : 0;
    for (let c = 0; c < cols; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const m = cell.match(reDash) || cell.match(reIneq);
        if (m) {
          let l = parseFloat(m[1]);
          let u = parseFloat(m[2]);
          if (isFinite(l) && isFinite(u)) {
            if (u < l) [l, u] = [u, l];
            l = Math.round(l * 1000) / 1000;
            u = Math.round(u * 1000) / 1000;
            const key = `${l.toFixed(3)}-${u.toFixed(3)}`;
            if (!seen.has(key)) {
              seen.add(key);
              ranges.push({ l, u });
            }
          }
        }
      }
    }
  }
  ranges.sort((a, b) => a.l - b.l || a.u - b.u);
  return ranges;
}

function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function computeStructureSignature(jsonData: any[]) {
  const ranges = extractWeightRanges(jsonData);
  const sigBase = ranges.map((r) => `${r.l.toFixed(3)}_${r.u.toFixed(3)}`).join('|');
  const signature = hashString(sigBase);
  return { ranges, signature };
}

function compareStructure(prev: Range[], curr: Range[]): { level: StructureChangeLevel; message: string } {
  const sameLength = prev.length === curr.length;
  const keysPrev = prev.map((r) => `${r.l.toFixed(3)}-${r.u.toFixed(3)}`);
  const keysCurr = curr.map((r) => `${r.l.toFixed(3)}-${r.u.toFixed(3)}`);
  if (sameLength && keysPrev.every((k, i) => k === keysCurr[i])) {
    return { level: 'NONE', message: 'Weight structure is identical to previous version' };
  }
  let maxShift = 0;
  const minLen = Math.min(prev.length, curr.length);
  for (let i = 0; i < minLen; i++) {
    maxShift = Math.max(maxShift, Math.abs(prev[i].l - curr[i].l), Math.abs(prev[i].u - curr[i].u));
  }
  const lenDiff = Math.abs(prev.length - curr.length);
  if (lenDiff <= 1 && maxShift <= 0.01) {
    return { level: 'MINOR', message: 'Minor weight boundary adjustments detected (≤0.01kg)' };
  }
  return { level: 'MAJOR', message: 'Major structure changes: new ranges/overlaps/gaps likely' };
}

export const exportToCsv = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
