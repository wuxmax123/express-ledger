import * as XLSX from 'xlsx';
import { ParsedSheetData, StructureChangeLevel, DetectionVerdict, DetectionLog, RateCardDetail } from '@/types';

// Comprehensive text normalization for full-width characters
const normalizeText = (text: string): string => {
  return text
    // Full-width punctuation to half-width
    .replace(/＜/g, '<')
    .replace(/＞/g, '>')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/：/g, ':')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/【/g, '[')
    .replace(/】/g, ']')
    .replace(/，/g, ',')
    .replace(/。/g, '.')
    .replace(/、/g, ',')
    .replace(/～/g, '-')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/　/g, ' ')
    // Normalize full-width alphanumeric to half-width
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    })
    .replace(/\s+/g, ' ')
    .trim();
};

// Country name normalization dictionary
const COUNTRY_NORMALIZATION: Record<string, string> = {
  // Chinese to ISO-2
  '美国': 'US',
  '美國': 'US',
  '加拿大': 'CA',
  '英国': 'GB',
  '英國': 'GB',
  '法国': 'FR',
  '法國': 'FR',
  '德国': 'DE',
  '德國': 'DE',
  '西班牙': 'ES',
  '意大利': 'IT',
  '澳大利亚': 'AU',
  '澳洲': 'AU',
  '日本': 'JP',
  '韩国': 'KR',
  '韓國': 'KR',
  '巴西': 'BR',
  '墨西哥': 'MX',
  '阿联酋': 'AE',
  '沙特': 'SA',
  '沙特阿拉伯': 'SA',
  '新加坡': 'SG',
  '泰国': 'TH',
  '泰國': 'TH',
  '马来西亚': 'MY',
  '马来': 'MY',
  '菲律宾': 'PH',
  '印度尼西亚': 'ID',
  '印尼': 'ID',
  '越南': 'VN',
  '中国': 'CN',
  '中國': 'CN',
  // English variants
  'united states': 'US',
  'usa': 'US',
  'united kingdom': 'GB',
  'uk': 'GB',
  'canada': 'CA',
  'france': 'FR',
  'germany': 'DE',
  'spain': 'ES',
  'italy': 'IT',
  'australia': 'AU',
  'japan': 'JP',
  'korea': 'KR',
  'south korea': 'KR',
  'brazil': 'BR',
  'mexico': 'MX',
  'uae': 'AE',
  'saudi arabia': 'SA',
  'singapore': 'SG',
  'thailand': 'TH',
  'malaysia': 'MY',
  'philippines': 'PH',
  'indonesia': 'ID',
  'vietnam': 'VN',
  'china': 'CN',
};

// Normalize country name
const normalizeCountry = (raw: string): { normalized: string; raw: string } => {
  const trimmed = raw.trim();
  const key = normalizeText(trimmed).toLowerCase();
  
  // Check if it's a region pattern (contains parentheses with exclusions)
  if (/[\(（].*[不除].*[\)）]/.test(trimmed)) {
    return { normalized: trimmed, raw: trimmed }; // Keep as region
  }
  
  const normalized = COUNTRY_NORMALIZATION[key] || trimmed;
  return { normalized, raw: trimmed };
};

// Normalize zone (extract number/letter from zone strings)
const normalizeZone = (raw: string): { normalized: string; raw: string } => {
  if (!raw) return { normalized: '', raw: '' };
  
  const trimmed = raw.trim();
  const normalized = normalizeText(trimmed);
  
  // Extract zone number/letter: 1区 → 1, Zone-2 → 2, A区 → A
  const match = normalized.match(/(?:zone[- ]?)?([a-z0-9]+)(?:区)?/i);
  if (match) {
    return { normalized: match[1].toUpperCase(), raw: trimmed };
  }
  
  return { normalized: trimmed, raw: trimmed };
};

// Parse ETA to extract minimum days
const parseETA = (raw: string): { etaMinDays: number | undefined; etaRaw: string } => {
  if (!raw) return { etaMinDays: undefined, etaRaw: '' };
  
  const trimmed = raw.trim();
  const normalized = normalizeText(trimmed);
  
  // Pattern: "5-10工作日" → 5, "7-14天" → 7
  const rangeMatch = normalized.match(/(\d+)\s*[-~]\s*(\d+)/);
  if (rangeMatch) {
    return { etaMinDays: parseInt(rangeMatch[1]), etaRaw: trimmed };
  }
  
  // Pattern: "7工作日" → 7
  const singleMatch = normalized.match(/(\d+)/);
  if (singleMatch) {
    return { etaMinDays: parseInt(singleMatch[1]), etaRaw: trimmed };
  }
  
  return { etaMinDays: undefined, etaRaw: trimmed };
};

// Parse weight range from string
const parseWeightRange = (raw: string): { weightFrom: number; weightTo: number; weightRaw: string } | null => {
  if (!raw) return null;
  
  const trimmed = raw.trim();
  const normalized = normalizeText(trimmed);
  
  // Pattern: "0<W<=0.3" or "0 < W <= 0.3"
  let match = normalized.match(/([\d.]+)\s*<\s*W\s*<=?\s*([\d.]+)/i);
  if (match) {
    return {
      weightFrom: parseFloat(match[1]),
      weightTo: parseFloat(match[2]),
      weightRaw: trimmed
    };
  }
  
  // Pattern: "[0.5, 1.0)" or "[0.5,1.0)"
  match = normalized.match(/\[\s*([\d.]+)\s*[,，]\s*([\d.]+)\s*\)/);
  if (match) {
    return {
      weightFrom: parseFloat(match[1]),
      weightTo: parseFloat(match[2]),
      weightRaw: trimmed
    };
  }
  
  // Pattern: "0.5-1.0" or "0.5~1.0"
  match = normalized.match(/([\d.]+)\s*[-~]\s*([\d.]+)/);
  if (match) {
    return {
      weightFrom: parseFloat(match[1]),
      weightTo: parseFloat(match[2]),
      weightRaw: trimmed
    };
  }
  
  // Pattern: "<0.3" or "≤0.3" (open low)
  match = normalized.match(/^0?\s*[<≤]\s*(?:W\s*[<≤]\s*)?([\d.]+)/);
  if (match) {
    return {
      weightFrom: 0,
      weightTo: parseFloat(match[1]),
      weightRaw: trimmed
    };
  }
  
  // Pattern: ">5" or "5<W" (open high)
  match = normalized.match(/([\d.]+)\s*<(?:\s*W)?(?:\s*<=?\s*(?:MAX|∞))?$/i);
  if (match) {
    return {
      weightFrom: parseFloat(match[1]),
      weightTo: 999999,
      weightRaw: trimmed
    };
  }
  
  return null;
};

// Safe number parsing
const parseNumber = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const str = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
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

// Enhanced header detection with alias sets
const COLUMN_ALIASES = {
  country: ['国家/地区', '国家', '目的地', 'Country', 'Destination'],
  zone: ['分区', '区域', '分区代码', 'Zone', 'Area'],
  eta: ['参考时效', '时效', '派送时效', 'ETA', 'Delivery Time', '交货时间'],
  weightRange: ['重量(KG)', '重量区间', '重量段', 'Weight', 'Weight Range', '重量范围'],
  weightFrom: ['起重', 'From(kg)', '下限(kg)', 'Weight From', '起始重量'],
  weightTo: ['至重', 'To(kg)', '上限(kg)', 'Weight To', '结束重量'],
  minWeight: ['最低计费重(KG)', '最低计费重', '最低计费重量', 'Min Weight', 'Minimum Chargeable Weight', '最小计费重'],
  price: ['运费(RMB/KG)', '运费(元/KG)', '价格', '运费', 'Rate', 'Price', '单价'],
  registerFee: ['挂号费(RMB/票)', '挂号费', '处理费', 'Registration Fee', 'Handling Fee', '挂号费用'],
  currency: ['币种', 'Currency'],
  roundingStep: ['进位制(KG)', '进位制', '计费进位', 'Increment', 'Rounding']
};

// Check if a cell matches any alias in a set
const matchesAlias = (cellValue: string, aliases: string[]): boolean => {
  const normalized = normalizeText(cellValue).toLowerCase();
  return aliases.some(alias => {
    const normalizedAlias = normalizeText(alias).toLowerCase();
    return normalized === normalizedAlias || normalized.includes(normalizedAlias);
  });
};

// Detect header row by finding row with maximum alias hits
const detectHeaderRow = (jsonData: any[][], maxScanRows: number = 8): {
  headerRowIndex: number;
  columnMap: Map<string, number>;
} => {
  let bestRowIndex = -1;
  let bestMatchCount = 0;
  let bestColumnMap = new Map<string, number>();
  
  const scanRows = Math.min(maxScanRows, jsonData.length);
  
  for (let r = 0; r < scanRows; r++) {
    const row = jsonData[r];
    if (!row) continue;
    
    let matchCount = 0;
    const columnMap = new Map<string, number>();
    
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (typeof cell === 'string' && cell.trim()) {
        // Check against each alias set
        for (const [fieldName, aliases] of Object.entries(COLUMN_ALIASES)) {
          if (matchesAlias(cell, aliases)) {
            columnMap.set(fieldName, c);
            matchCount++;
            break; // Only count each cell once
          }
        }
      }
    }
    
    // Update best match if this row has more matches
    if (matchCount > bestMatchCount && matchCount >= 3) {
      bestMatchCount = matchCount;
      bestRowIndex = r;
      bestColumnMap = columnMap;
    }
  }
  
  return { headerRowIndex: bestRowIndex, columnMap: bestColumnMap };
};

// Check if a row is a repeated header (contains multiple header aliases)
const isRepeatedHeader = (row: any[], columnMap: Map<string, number>): boolean => {
  if (!row) return false;
  
  let headerMatches = 0;
  for (let c = 0; c < row.length; c++) {
    const cell = row[c];
    if (typeof cell === 'string' && cell.trim()) {
      for (const aliases of Object.values(COLUMN_ALIASES)) {
        if (matchesAlias(cell, aliases)) {
          headerMatches++;
          break;
        }
      }
    }
  }
  
  return headerMatches >= 3;
};

// Check if a row is a valid rate data row
const isValidRateRow = (row: any[], columnMap: Map<string, number>): boolean => {
  if (!row) return false;
  
  // Must have at least one valid field
  const countryIdx = columnMap.get('country');
  const priceIdx = columnMap.get('price');
  const weightRangeIdx = columnMap.get('weightRange');
  const weightFromIdx = columnMap.get('weightFrom');
  
  // Check country (must match known patterns or be a valid country code)
  if (countryIdx !== undefined) {
    const country = String(row[countryIdx] || '').trim();
    if (country) {
      const normalized = normalizeText(country).toLowerCase();
      // Check if it's in our country dictionary or looks like a country code
      if (COUNTRY_NORMALIZATION[normalized] || /^[A-Z]{2}$/i.test(country)) {
        return true;
      }
    }
  }
  
  // Check if weight is numeric or parseable
  if (weightRangeIdx !== undefined) {
    const weight = String(row[weightRangeIdx] || '').trim();
    if (weight && parseWeightRange(weight)) {
      return true;
    }
  }
  
  if (weightFromIdx !== undefined) {
    const weightFrom = parseNumber(row[weightFromIdx]);
    if (weightFrom !== undefined) {
      return true;
    }
  }
  
  // Check if price is numeric
  if (priceIdx !== undefined) {
    const price = parseNumber(row[priceIdx]);
    if (price !== undefined && price > 0) {
      return true;
    }
  }
  
  return false;
};

// Extract notes/remarks from rows after last valid data row
const extractNotes = (jsonData: any[][], headerRowIndex: number, columnMap: Map<string, number>): string => {
  const notes: string[] = [];
  
  // Find last valid data row
  let lastValidRow = headerRowIndex;
  for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (row && isValidRateRow(row, columnMap)) {
      lastValidRow = r;
    }
  }
  
  // Extract text from rows after last valid row
  for (let r = lastValidRow + 1; r < jsonData.length; r++) {
    const row = jsonData[r];
    if (!row) continue;
    
    // Skip completely empty rows
    const hasContent = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
    if (!hasContent) continue;
    
    // Skip rows that are just repeated headers
    if (isRepeatedHeader(row, columnMap)) continue;
    
    // Combine all non-empty cells in the row
    const rowText = row
      .filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
      .map(cell => String(cell).trim())
      .join(' ');
    
    if (rowText) {
      notes.push(rowText);
    }
  }
  
  return notes.join('\n');
};

// Parse rate card details with robust header detection and normalization
const parseRateCardDetails = (jsonData: any[][]): { details: RateCardDetail[]; notes: string } => {
  const details: RateCardDetail[] = [];
  
  // Detect header row
  const { headerRowIndex, columnMap } = detectHeaderRow(jsonData);
  
  if (headerRowIndex < 0 || columnMap.size < 3) {
    return { details, notes: '' }; // Not enough columns detected
  }
  
  // Extract notes before processing data
  const notes = extractNotes(jsonData, headerRowIndex, columnMap);
  
  // Extract data rows
  const dataStartRow = headerRowIndex + 1;
  const maxDataRows = Math.min(150, jsonData.length); // Increased limit for preview
  const seenRows = new Set<string>(); // For deduplication
  
  for (let r = dataStartRow; r < maxDataRows; r++) {
    const row = jsonData[r];
    if (!row) continue;
    
    // Skip rows that repeat the header
    if (isRepeatedHeader(row, columnMap)) {
      continue;
    }
    
    // Skip empty rows
    const hasData = row.some(cell => cell !== undefined && cell !== null && cell !== '');
    if (!hasData) continue;
    
    // Only process valid rate rows
    if (!isValidRateRow(row, columnMap)) {
      continue;
    }
    
    // Extract raw values
    const countryRaw = columnMap.has('country') ? String(row[columnMap.get('country')!] || '').trim() : '';
    const zoneRaw = columnMap.has('zone') ? String(row[columnMap.get('zone')!] || '').trim() : '';
    const etaRaw = columnMap.has('eta') ? String(row[columnMap.get('eta')!] || '').trim() : '';
    const weightRangeRaw = columnMap.has('weightRange') ? String(row[columnMap.get('weightRange')!] || '').trim() : '';
    const weightFromRaw = columnMap.has('weightFrom') ? row[columnMap.get('weightFrom')!] : undefined;
    const weightToRaw = columnMap.has('weightTo') ? row[columnMap.get('weightTo')!] : undefined;
    const minWeightRaw = columnMap.has('minWeight') ? row[columnMap.get('minWeight')!] : undefined;
    const priceRaw = columnMap.has('price') ? row[columnMap.get('price')!] : undefined;
    const registerFeeRaw = columnMap.has('registerFee') ? row[columnMap.get('registerFee')!] : undefined;
    const currencyRaw = columnMap.has('currency') ? String(row[columnMap.get('currency')!] || '').trim() : '';
    
    // Normalize country
    const { normalized: country, raw: countryRawFinal } = countryRaw ? normalizeCountry(countryRaw) : { normalized: '', raw: '' };
    
    // Normalize zone
    const { normalized: zone, raw: zoneRawFinal } = zoneRaw ? normalizeZone(zoneRaw) : { normalized: '', raw: '' };
    
    // Parse ETA
    const { etaMinDays, etaRaw: etaRawFinal } = etaRaw ? parseETA(etaRaw) : { etaMinDays: undefined, etaRaw: '' };
    
    // Parse weight range
    let weightFrom: number | undefined;
    let weightTo: number | undefined;
    let weightRawFinal = '';
    
    if (weightRangeRaw) {
      const parsed = parseWeightRange(weightRangeRaw);
      if (parsed) {
        weightFrom = parsed.weightFrom;
        weightTo = parsed.weightTo;
        weightRawFinal = parsed.weightRaw;
      }
    } else if (weightFromRaw !== undefined && weightToRaw !== undefined) {
      weightFrom = parseNumber(weightFromRaw);
      weightTo = parseNumber(weightToRaw);
      weightRawFinal = `${weightFrom}-${weightTo}`;
    }
    
    // Parse numeric fields
    const minChargeableWeight = parseNumber(minWeightRaw);
    const price = parseNumber(priceRaw);
    const registerFee = parseNumber(registerFeeRaw);
    const currency = currencyRaw || 'RMB';
    
    // Deduplication key
    const dedupKey = `${country}|${zone}|${weightFrom}|${weightTo}`;
    if (seenRows.has(dedupKey)) {
      continue; // Skip duplicate
    }
    seenRows.add(dedupKey);
    
    // Create detail object
    const detail: RateCardDetail = {
      country,
      countryRaw: countryRawFinal,
      zone,
      zoneRaw: zoneRawFinal,
      eta: etaRawFinal,
      etaRaw: etaRawFinal,
      etaMinDays,
      weightFrom,
      weightTo,
      weightRaw: weightRawFinal,
      minChargeableWeight,
      price,
      registerFee,
      currency
    };
    
    details.push(detail);
  }
  
  return { details, notes };
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
            let confidence = detection.confidence || 0;
            let needsMapping = false;
            
            // Determine if manual mapping is needed (confidence < 70)
            if (detection.verdict === 'uncertain' || (detection.verdict === 'rate' && confidence < 70)) {
              needsMapping = true;
            }
            
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
            
            // Parse rate card details if this is a rate card
            let rateCardDetails: RateCardDetail[] | undefined;
            let sheetNotes: string | undefined;
            if (detection.verdict === 'rate' || detection.verdict === 'uncertain') {
              const parseResult = parseRateCardDetails(jsonData);
              rateCardDetails = parseResult.details;
              sheetNotes = parseResult.notes || undefined;
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
              action: detection.verdict === 'skipped' ? 'skip' : 'import',
              rateCardDetails,
              notes: sheetNotes,
              confidence,
              needsMapping
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

// Three-signal detector with confidence scoring
const runThreeSignalDetector = (sheetName: string, jsonData: any[][]): {
  totalScore: number;
  verdict: DetectionVerdict;
  channelCode?: string;
  effectiveDate?: string;
  confidence?: number;
  log: DetectionLog;
} => {
  let totalScore = 0;
  let confidence = 0;
  const log: DetectionLog = {
    totalScore: 0,
    verdict: 'uncertain',
    reason: ''
  };
  
  // Check whitelist first - multiple vendor patterns
  const whitelistPatterns = [
    { pattern: /(云途).*(挂号|平邮|专线|大货|服装|化妆|全球)/, vendor: 'YunExpress' },
    { pattern: /(顺友).*(挂号|平邮|专线|大货)/, vendor: 'Sunyou' },
    { pattern: /(4PX|递四方).*(挂号|平邮|专线)/, vendor: '4PX' },
    { pattern: /(万邦).*(专线|挂号)/, vendor: 'Wanb' },
    { pattern: /(燕文).*(挂号|平邮|专线|包裹|小包|全球)/, vendor: 'Yanwen' }
  ];
  
  for (const { pattern, vendor } of whitelistPatterns) {
    if (pattern.test(sheetName)) {
      totalScore = 100;
      confidence = 100;
      log.totalScore = 100;
      log.verdict = 'rate';
      log.reason = `Sheet name matches ${vendor} whitelist pattern`;
      return { totalScore, verdict: 'rate', confidence, log };
    }
  }
  
  // Try to extract channel code from sheet name first
  // Pattern: uppercase letters + numbers (e.g., YTYCPREC, BKDDTK, THZXR)
  const sheetNameCodeMatch = sheetName.match(/^([A-Z]{2,}[A-Z0-9]+)$/);
  if (sheetNameCodeMatch && sheetNameCodeMatch[1].length >= 4) {
    const extractedCode = sheetNameCodeMatch[1];
    log.totalScore = 100;
    log.verdict = 'rate';
    log.reason = `Sheet name is a valid channel code: ${extractedCode}`;
    confidence = 95; // High confidence
    return {
      totalScore: 100,
      verdict: 'rate',
      channelCode: extractedCode,
      confidence,
      log
    };
  }
  
  // Signal 1: Header Signal (50 pts) - check for "运输代码：" in content
  const headerResult = detectHeaderSignal(jsonData);
  log.headerSignal = headerResult;
  totalScore += headerResult.points;
  
  if (headerResult.found && headerResult.channelCode && headerResult.channelCode.length > 0) {
    // Immediate classification as rate card - MUST have valid channel code
    // Calculate confidence based on header detection strength
    const hasDate = headerResult.effectiveDate ? 20 : 0;
    const codeQuality = headerResult.channelCode.length >= 6 ? 20 : 10;
    confidence = 60 + hasDate + codeQuality; // 60-100 range
    
    log.totalScore = totalScore;
    log.verdict = 'rate';
    log.reason = 'Channel code found in header (渠道代码/运输代码): ' + headerResult.channelCode;
    return {
      totalScore,
      verdict: 'rate',
      channelCode: headerResult.channelCode,
      effectiveDate: headerResult.effectiveDate,
      confidence,
      log
    };
  }
  
  // Signal 2: Column header detection (30 pts)
  const { headerRowIndex, columnMap } = detectHeaderRow(jsonData);
  
  if (headerRowIndex >= 0 && columnMap.size >= 3) {
    const columnPoints = Math.min(30, columnMap.size * 5);
    totalScore += columnPoints;
    confidence = Math.min(70, columnMap.size * 10); // 30-70 range based on columns
    
    log.columnSignal = {
      matchedHeaders: Array.from(columnMap.keys()),
      points: columnPoints
    };
    
    // If we have key columns (country, weight, price), mark as uncertain for manual review
    const hasKeyColumns = columnMap.has('country') && 
                          (columnMap.has('weightRange') || columnMap.has('weightFrom')) &&
                          columnMap.has('price');
    
    if (hasKeyColumns) {
      log.totalScore = totalScore;
      log.verdict = 'uncertain';
      log.reason = `Found ${columnMap.size} rate card columns but no channel code - needs manual confirmation`;
      return { totalScore, verdict: 'uncertain', confidence, log };
    }
  }
  
  // If no header signal found, default to skipped (not a rate card)
  // Only sheets with 渠道代码 or 运输代码 are considered rate cards
  log.totalScore = 0;
  log.verdict = 'skipped';
  log.reason = 'No channel code (渠道代码) or transport code (运输代码) found - not a rate card';
  return { totalScore: 0, verdict: 'skipped', confidence: 0, log };
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
