import * as XLSX from 'xlsx';
import { ParsedSheetData, StructureChangeLevel, DetectionVerdict, DetectionLog } from '@/types';

// Text normalization - enhanced for full-width characters
const normalizeText = (text: string): string => {
  return text
    .replace(/＜/g, '<')
    .replace(/≤/g, '<=')
    .replace(/：/g, ':')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    // Normalize full-width alphanumeric to half-width
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    })
    .replace(/\s+/g, ' ')
    .trim();
};

// Sheet blacklist patterns
const SHEET_BLACKLIST = /(报价总目录|目录国家维度|偏远|邮编|附加费|清单|服务|分区|说明|税率|HPRA|药事法|紧急|保价|签名)/;

// Sheet whitelist for YunExpress
const YUNEXPRESS_WHITELIST = /(云途).*(挂号|平邮|专线|大货|服装|化妆|全球)/;

// Parse directory sheet to extract channel code mappings
const parseDirectorySheet = (workbook: XLSX.WorkBook): Map<string, { productName: string; channelCode: string }> => {
  const directoryMap = new Map<string, { productName: string; channelCode: string }>();
  
  // Look for directory sheet (报价总目录, 目录, Directory)
  const directorySheetName = workbook.SheetNames.find(name => 
    /(报价总目录|^目录$|Directory)/i.test(name)
  );
  
  if (!directorySheetName) return directoryMap;
  
  const worksheet = workbook.Sheets[directorySheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  // Find header row with 产品名称 and 运输代码
  let headerRowIndex = -1;
  let productNameCol = -1;
  let channelCodeCol = -1;
  
  for (let r = 0; r < Math.min(10, jsonData.length); r++) {
    const row = jsonData[r];
    if (!row) continue;
    
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const normalized = normalizeText(cell);
        if (/(产品名称|Product Name)/i.test(normalized)) {
          productNameCol = c;
          headerRowIndex = r;
        }
        if (/(运输代码|渠道代码|Channel Code)/i.test(normalized)) {
          channelCodeCol = c;
          headerRowIndex = r;
        }
      }
    }
    
    if (productNameCol >= 0 && channelCodeCol >= 0) break;
  }
  
  // Extract mappings
  if (headerRowIndex >= 0 && productNameCol >= 0 && channelCodeCol >= 0) {
    for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row) continue;
      
      const productName = row[productNameCol];
      const channelCode = row[channelCodeCol];
      
      if (productName && channelCode && typeof channelCode === 'string') {
        const normalizedCode = normalizeText(channelCode).toUpperCase();
        if (normalizedCode.length >= 4) {
          // Use both the code and normalized product name as keys
          directoryMap.set(normalizedCode, {
            productName: String(productName),
            channelCode: normalizedCode
          });
          // Also map by product name for fuzzy matching
          if (typeof productName === 'string') {
            const normalizedName = normalizeText(productName).toLowerCase();
            directoryMap.set(normalizedName, {
              productName: String(productName),
              channelCode: normalizedCode
            });
          }
        }
      }
    }
  }
  
  return directoryMap;
};

export const parseExcelFile = async (file: File, checkHistory: (channelCode: string) => Promise<boolean>): Promise<ParsedSheetData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Parse directory sheet first for channel code cross-reference
        const directoryMap = parseDirectorySheet(workbook);
        
        const sheets: ParsedSheetData[] = await Promise.all(
          workbook.SheetNames.map(async (sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            // Forward-fill merged cells in first 5 rows (increased from 3)
            jsonData = forwardFillMergedCells(jsonData, 5);
            
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
            
            // Cross-reference with directory sheet if no code was detected
            if (!channelCode && directoryMap.size > 0) {
              // Try to find by sheet name
              const sheetNameNorm = normalizeText(sheetName).toLowerCase();
              const directoryEntry = directoryMap.get(sheetNameNorm);
              if (directoryEntry) {
                channelCode = directoryEntry.channelCode;
                detection.verdict = 'rate';
                detection.log.reason = `Channel code found via directory cross-reference: ${channelCode}`;
                detection.totalScore = 100;
              } else {
                // Try fuzzy matching with product names in directory
                for (const [key, value] of directoryMap.entries()) {
                  if (key.length > 4 && sheetNameNorm.includes(key)) {
                    channelCode = value.channelCode;
                    detection.verdict = 'rate';
                    detection.log.reason = `Channel code found via directory fuzzy match: ${channelCode}`;
                    detection.totalScore = 100;
                    break;
                  }
                }
              }
            }
            
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

// Forward-fill merged cells - enhanced to handle more rows
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
  
  // Try to extract channel code from sheet name first
  // Pattern: uppercase letters + numbers (e.g., YTYCPREC, BKDDTK, THZXR)
  const sheetNameCodeMatch = sheetName.match(/^([A-Z]{2,}[A-Z0-9]+)$/);
  if (sheetNameCodeMatch && sheetNameCodeMatch[1].length >= 4) {
    const extractedCode = sheetNameCodeMatch[1];
    log.totalScore = 100;
    log.verdict = 'rate';
    log.reason = `Sheet name is a valid channel code: ${extractedCode}`;
    return {
      totalScore: 100,
      verdict: 'rate',
      channelCode: extractedCode,
      log
    };
  }
  
  // Signal 1: Header Signal (50 pts) - check for "运输代码：" in content
  const headerResult = detectHeaderSignal(jsonData);
  log.headerSignal = headerResult;
  totalScore += headerResult.points;
  
  if (headerResult.found && headerResult.channelCode && headerResult.channelCode.length > 0) {
    // Immediate classification as rate card - MUST have valid channel code
    log.totalScore = totalScore;
    log.verdict = 'rate';
    log.reason = 'Channel code found in header (渠道代码/运输代码): ' + headerResult.channelCode;
    return {
      totalScore,
      verdict: 'rate',
      channelCode: headerResult.channelCode,
      effectiveDate: headerResult.effectiveDate,
      log
    };
  }
  
  // If no header signal found, default to skipped (not a rate card)
  // Only sheets with 渠道代码 or 运输代码 are considered rate cards
  log.totalScore = 0;
  log.verdict = 'skipped';
  log.reason = 'No channel code (渠道代码) or transport code (运输代码) found - not a rate card';
  return { totalScore: 0, verdict: 'skipped', log };
};

// Header signal detector (50 pts) - Enhanced for merged cells and multi-line patterns
const detectHeaderSignal = (jsonData: any[][]): {
  found: boolean;
  channelCode?: string;
  effectiveDate?: string;
  points: number;
} => {
  // Multiple regex patterns for channel/transport code - enhanced patterns
  const channelRegexes = [
    /运输代码[:：\s]*([A-Za-z0-9\-]+)/,
    /渠道代码[:：\s]*([A-Za-z0-9\-]+)/,
    /Channel\s*Code[:：]?\s*([A-Za-z0-9\-]+)/i,
    /Transport\s*Code[:：]?\s*([A-Za-z0-9\-]+)/i,
    // Pattern for merged cells where label and value might be split
    /^(运输代码|渠道代码|Channel Code|Transport Code)[:：\s]*$/i
  ];
  const codeOnlyPattern = /^([A-Z]{2}[A-Z0-9]{2,})$/; // Match code-only cells like "YE123"
  const dateRegex = /(\d{4}[-\/]\d{2}[-\/]\d{2}\s*\d{2}:\d{2})/;
  
  const maxRows = Math.min(15, jsonData.length);
  
  // First pass: look for complete patterns
  for (let r = 0; r < maxRows; r++) {
    const row = jsonData[r];
    if (!row) continue;
    const maxCols = Math.min(10, row.length);
    
    for (let c = 0; c < maxCols; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const normalized = normalizeText(cell);
        
        // Try all channel code patterns
        for (const channelRegex of channelRegexes.slice(0, 4)) { // First 4 are complete patterns
          const channelMatch = normalized.match(channelRegex);
          if (channelMatch && channelMatch[1]) {
            const extractedCode = channelMatch[1].trim().toUpperCase();
            
            // Ensure channel code is valid format (2+ letters + digits)
            if (extractedCode.length >= 4 && /^[A-Z]{2}[A-Z0-9]+$/.test(extractedCode)) {
              // Look for date in same cell or nearby cells
              let effectiveDate: string | undefined;
              const dateMatch = normalized.match(dateRegex);
              if (dateMatch) {
                effectiveDate = dateMatch[1].replace('/', '-');
              } else {
                // Check adjacent cells for date
                for (let nc = Math.max(0, c - 2); nc < Math.min(maxCols, c + 3); nc++) {
                  if (row[nc] && typeof row[nc] === 'string') {
                    const dateM = normalizeText(row[nc]).match(dateRegex);
                    if (dateM) {
                      effectiveDate = dateM[1].replace('/', '-');
                      break;
                    }
                  }
                }
              }
              
              return {
                found: true,
                channelCode: extractedCode,
                effectiveDate,
                points: 50
              };
            }
          }
        }
      }
    }
  }
  
  // Second pass: look for split patterns (label in one cell, code in next cell/row)
  for (let r = 0; r < maxRows; r++) {
    const row = jsonData[r];
    if (!row) continue;
    const maxCols = Math.min(10, row.length);
    
    for (let c = 0; c < maxCols; c++) {
      const cell = row[c];
      if (typeof cell === 'string') {
        const normalized = normalizeText(cell);
        
        // Check if this cell contains label only (merged cell pattern)
        if (channelRegexes[4].test(normalized)) {
          // Look for code in adjacent cells (right, below, below-right)
          const checkCells = [
            { r, c: c + 1 },           // Right
            { r, c: c + 2 },           // Two cells right
            { r: r + 1, c },           // Below
            { r: r + 1, c: c + 1 },    // Below-right
            { r: r + 2, c }            // Two rows below
          ];
          
          for (const pos of checkCells) {
            if (pos.r < jsonData.length && jsonData[pos.r] && pos.c < jsonData[pos.r].length) {
              const targetCell = jsonData[pos.r][pos.c];
              if (typeof targetCell === 'string') {
                const targetNorm = normalizeText(targetCell);
                const codeMatch = targetNorm.match(codeOnlyPattern);
                if (codeMatch && codeMatch[1]) {
                  const extractedCode = codeMatch[1].toUpperCase();
                  
                  // Look for date nearby
                  let effectiveDate: string | undefined;
                  for (let nr = Math.max(0, r - 1); nr < Math.min(maxRows, r + 3); nr++) {
                    if (!jsonData[nr]) continue;
                    for (let nc = Math.max(0, c - 2); nc < Math.min(jsonData[nr].length, c + 5); nc++) {
                      if (jsonData[nr][nc] && typeof jsonData[nr][nc] === 'string') {
                        const dateM = normalizeText(jsonData[nr][nc]).match(dateRegex);
                        if (dateM) {
                          effectiveDate = dateM[1].replace('/', '-');
                          break;
                        }
                      }
                    }
                    if (effectiveDate) break;
                  }
                  
                  return {
                    found: true,
                    channelCode: extractedCode,
                    effectiveDate,
                    points: 50
                  };
                }
              }
            }
          }
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
