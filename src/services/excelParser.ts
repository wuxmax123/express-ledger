import * as XLSX from 'xlsx';
import { ParsedSheetData, StructureChangeLevel, DetectionVerdict, DetectionLog } from '@/types';

// Text normalization
const normalizeText = (text: string): string => {
  return text
    .replace(/＜/g, '<')
    .replace(/≤/g, '<=')
    .replace(/：/g, ':')
    .replace(/\s+/g, ' ')
    .trim();
};

// Sheet blacklist patterns
const SHEET_BLACKLIST = /(报价总目录|目录国家维度|偏远|邮编|附加费|清单|服务|分区|说明|税率|HPRA|药事法|紧急|保价|签名)/;

// Sheet whitelist for YunExpress
const YUNEXPRESS_WHITELIST = /(云途).*(挂号|平邮|专线|大货|服装|化妆|全球)/;

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
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            // Forward-fill merged cells in first 3 rows
            jsonData = forwardFillMergedCells(jsonData, 3);
            
            // Check blacklist/whitelist
            if (SHEET_BLACKLIST.test(sheetName)) {
              return {
                sheetName,
                sheetType: 'OTHER',
                rows: jsonData,
                detectionScore: 0,
                detectionVerdict: 'skipped' as DetectionVerdict,
                detectionLog: {
                  totalScore: 0,
                  verdict: 'skipped' as DetectionVerdict,
                  reason: 'Sheet name matches blacklist pattern'
                },
                isFirstVersion: true,
                action: 'skip'
              };
            }
            
            // Run three-signal detector
            const detection = runThreeSignalDetector(sheetName, jsonData);
            
            // Determine sheet type and channel code
            let sheetType = 'OTHER';
            let channelCode = detection.channelCode || '';
            let effectiveDate = detection.effectiveDate;
            
            if (detection.verdict === 'rate') {
              sheetType = 'RATE_CARD';
            } else if (detection.verdict === 'uncertain') {
              sheetType = 'UNCERTAIN';
            }
            
            // Check if this channel has historical versions
            const hasHistoricalVersion = channelCode ? await checkHistory(channelCode) : false;
            
            // Only perform structure validation if there's a historical version
            let structureChangeLevel: StructureChangeLevel | undefined;
            let structureChangeMessage: string | undefined;
            
            if (hasHistoricalVersion && channelCode) {
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
              effectiveDate,
              structureChangeLevel,
              structureChangeMessage,
              hasHistoricalVersion,
              isFirstVersion: !hasHistoricalVersion,
              detectionScore: detection.totalScore,
              detectionVerdict: detection.verdict,
              detectionLog: detection.log,
              action: detection.verdict === 'skipped' ? 'skip' : 'import'
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

// Forward-fill merged cells
const forwardFillMergedCells = (jsonData: any[][], rows: number): any[][] => {
  const maxRows = Math.min(rows, jsonData.length);
  for (let r = 0; r < maxRows; r++) {
    if (!jsonData[r]) continue;
    let lastValue: any = null;
    for (let c = 0; c < jsonData[r].length; c++) {
      if (jsonData[r][c] !== undefined && jsonData[r][c] !== null && jsonData[r][c] !== '') {
        lastValue = jsonData[r][c];
      } else if (lastValue !== null) {
        jsonData[r][c] = lastValue;
      }
    }
  }
  return jsonData;
};

// Three-signal detector
const runThreeSignalDetector = (sheetName: string, jsonData: any[][]): {
  totalScore: number;
  verdict: DetectionVerdict;
  channelCode?: string;
  effectiveDate?: string;
  log: DetectionLog;
} => {
  let totalScore = 0;
  const log: DetectionLog = {
    totalScore: 0,
    verdict: 'uncertain',
    reason: ''
  };
  
  // Check whitelist first
  if (YUNEXPRESS_WHITELIST.test(sheetName)) {
    totalScore = 100;
    log.totalScore = 100;
    log.verdict = 'rate';
    log.reason = 'Sheet name matches YunExpress whitelist pattern';
    return { totalScore, verdict: 'rate', log };
  }
  
  // Signal 1: Header Signal (50 pts)
  const headerResult = detectHeaderSignal(jsonData);
  log.headerSignal = headerResult;
  totalScore += headerResult.points;
  
  if (headerResult.found && headerResult.channelCode) {
    // Immediate classification as rate card
    log.totalScore = totalScore;
    log.verdict = 'rate';
    log.reason = 'Channel code found in header (priority signal)';
    return {
      totalScore,
      verdict: 'rate',
      channelCode: headerResult.channelCode,
      effectiveDate: headerResult.effectiveDate,
      log
    };
  }
  
  // Signal 2: Column Mapping Signal (≤50 pts, base 30)
  const columnResult = detectColumnSignal(jsonData);
  log.columnSignal = columnResult;
  totalScore += columnResult.points;
  
  // Signal 3: Weight-Range Signal (20 pts)
  const weightResult = detectWeightSignal(jsonData);
  log.weightSignal = weightResult;
  totalScore += weightResult.points;
  
  // Decision logic
  log.totalScore = totalScore;
  
  if (totalScore >= 60) {
    log.verdict = 'rate';
    log.reason = `Total score ${totalScore} ≥ 60 threshold`;
    return { totalScore, verdict: 'rate', log };
  } else if (columnResult.points >= 40 && weightResult.found) {
    log.verdict = 'rate';
    log.reason = 'Strong column mapping + weight range detected';
    return { totalScore, verdict: 'rate', log };
  } else {
    log.verdict = 'uncertain';
    log.reason = `Total score ${totalScore} < 60, requires manual annotation`;
    return { totalScore, verdict: 'uncertain', log };
  }
};

// Header signal detector (50 pts)
const detectHeaderSignal = (jsonData: any[][]): {
  found: boolean;
  channelCode?: string;
  effectiveDate?: string;
  points: number;
} => {
  const channelRegex = /运输代码[:：]\s*([A-Za-z0-9\-]+)/;
  const dateRegex = /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/;
  
  const maxRows = Math.min(12, jsonData.length);
  for (let r = 0; r < maxRows; r++) {
    const row = jsonData[r];
    if (!row) continue;
    const maxCols = Math.min(6, row.length);
    for (let c = 0; c < maxCols; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const normalized = normalizeText(cell);
        const channelMatch = normalized.match(channelRegex);
        if (channelMatch) {
          const dateMatch = normalized.match(dateRegex);
          return {
            found: true,
            channelCode: channelMatch[1].toUpperCase(),
            effectiveDate: dateMatch ? dateMatch[1] : undefined,
            points: 50
          };
        }
      }
    }
  }
  
  return { found: false, points: 0 };
};

// Column mapping signal detector (≤50 pts, base 30)
const detectColumnSignal = (jsonData: any[][]): {
  matchedHeaders: string[];
  points: number;
} => {
  const headerPatterns = [
    { regex: /(国家\/地区|国家|目的地)/, name: '国家/地区' },
    { regex: /(分区|区域|分区代码)/, name: '分区' },
    { regex: /(参考时效|时效|派送时效)/, name: '时效' },
    { regex: /(重量\(KG\)|重量区间|重量段|重量)/, name: '重量' },
    { regex: /(进位制\(KG\)|进位制|计费进位)/, name: '进位制' },
    { regex: /(最低计费重\(KG\)|最低计费重|最低计费重量)/, name: '最低计费重' },
    { regex: /(运费\(RMB\/KG\)|运费\(元\/KG\)|价格|运费)/, name: '运费' },
    { regex: /(挂号费\(RMB\/票\)|挂号费|处理费)/, name: '挂号费' }
  ];
  
  const matchedHeaders: string[] = [];
  const maxRows = Math.min(15, jsonData.length);
  
  for (let r = 0; r < maxRows; r++) {
    const row = jsonData[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const normalized = normalizeText(cell);
        for (const pattern of headerPatterns) {
          if (pattern.regex.test(normalized) && !matchedHeaders.includes(pattern.name)) {
            matchedHeaders.push(pattern.name);
          }
        }
      }
    }
  }
  
  const hitCount = matchedHeaders.length;
  let points = 0;
  if (hitCount >= 3) {
    points = 30 + Math.min(20, (hitCount - 3) * 5);
  }
  
  return { matchedHeaders, points };
};

// Weight-range signal detector (20 pts)
const detectWeightSignal = (jsonData: any[][]): {
  found: boolean;
  samples: string[];
  points: number;
} => {
  const weightPatterns = [
    /(?<l>\d+(?:\.\d+)?)\s*[<＜]\s*W\s*[<=≤]\s*(?<u>\d+(?:\.\d+)?)/i,
    /^0\s*[<＜]\s*W\s*[<=≤]\s*(?<u>\d+(?:\.\d+)?)$/i,
    /^(?<l>\d+(?:\.\d+)?)\s*[<＜]\s*W\s*[<=≤]\s*MAX$/i
  ];
  
  const samples: string[] = [];
  const maxRows = Math.min(100, jsonData.length);
  
  for (let r = 0; r < maxRows; r++) {
    const row = jsonData[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const normalized = normalizeText(cell);
        for (const pattern of weightPatterns) {
          if (pattern.test(normalized)) {
            if (samples.length < 3) {
              samples.push(normalized);
            }
            return { found: true, samples, points: 20 };
          }
        }
      }
    }
  }
  
  return { found: false, samples: [], points: 0 };
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
