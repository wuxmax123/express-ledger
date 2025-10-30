export type StructureChangeLevel = 'NONE' | 'MINOR' | 'MAJOR';

export type ImportStatus = 'PENDING' | 'VALIDATING' | 'NEED_CONFIRM' | 'READY' | 'FAILED' | 'SUCCESS';

export interface Vendor {
  id: number;
  name: string;
  code: string;
  contactInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingChannel {
  id: number;
  vendorId: number;
  name: string;
  channelCode: string;
  currency: string;
  region: string;
  serviceType: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelRateSheet {
  id: number;
  channelId: number;
  versionCode: string;
  effectiveDate: string;
  fileName: string;
  uploadedBy: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ChannelRateItem {
  id: number;
  sheetId: number;
  country: string;
  zone?: string;
  weightFrom: number;
  weightTo: number;
  price: number;
  currency: string;
  eta?: string;
}

export interface ImportJob {
  id: number;
  vendorId: number;
  fileName: string;
  fileUrl?: string;
  startedAt: string;
  finishedAt?: string;
  status: ImportStatus;
  uploadedBy: string;
  message?: string;
}

export interface ImportSheet {
  id: number;
  jobId: number;
  sheetName: string;
  sheetType: 'RATE_CARD' | 'FUEL' | 'REMOTE' | 'OTHER';
  parsedRows: number;
  validateErrors?: string;
  structureChangeLevel: StructureChangeLevel;
  structureChangeMessage?: string;
  channelCode?: string;
}

export interface ImportItem {
  id: number;
  sheetId: number;
  channelCode: string;
  country: string;
  zone?: string;
  weightFrom: number;
  weightTo: number;
  price: number;
  currency: string;
  eta?: string;
}

export interface RateDiff {
  id: number;
  oldSheetId: number;
  newSheetId: number;
  channelId: number;
  country: string;
  zone?: string;
  weightFrom: number;
  weightTo: number;
  oldPrice: number;
  newPrice: number;
  delta: number;
  deltaPct: number;
}

export type DetectionVerdict = 'rate' | 'uncertain' | 'skipped';

export interface DetectionLog {
  headerSignal?: { found: boolean; channelCode?: string; effectiveDate?: string; points: number };
  columnSignal?: { matchedHeaders: string[]; points: number };
  weightSignal?: { found: boolean; samples: string[]; points: number };
  totalScore: number;
  verdict: DetectionVerdict;
  reason: string;
}

export interface RateCardDetail {
  // Normalized fields
  country?: string;
  countryRaw?: string;
  zone?: string;
  zoneRaw?: string;
  eta?: string;
  etaRaw?: string;
  etaMinDays?: number;
  weightFrom?: number;
  weightTo?: number;
  weightRaw?: string;
  minChargeableWeight?: number;
  price?: number;
  registerFee?: number;
  currency?: string;
}

// Rate Browse & Compare types
export interface RateBrowseItem {
  id: number;
  sheetId: number;
  channelId: number;
  channelName: string;
  vendorId: number;
  vendorName: string;
  versionCode: string;
  country: string;
  zone?: string;
  eta?: string;
  weightFrom: number;
  weightTo: number;
  minChargeableWeight?: number;
  price: number;
  currency: string;
  registerFee?: number;
  // Raw values for tooltips
  countryRaw?: string;
  zoneRaw?: string;
  etaRaw?: string;
  weightRaw?: string;
}

export interface RateBrowseParams {
  vendorId?: number;
  channelId?: number;
  country?: string;
  zone?: string;
  versionId?: number;
  weightFrom?: number;
  weightTo?: number;
  page?: number;
  size?: number;
}

export interface RateCompareParams {
  vendorIds?: number[];
  channelIds?: number[];
  country: string;
  versionId?: number;
  targetWeight?: number;
  weightBracket?: { from: number; to: number };
  sortBy?: 'PRICE' | 'ETA';
}

export interface RateCompareResult {
  channelId: number;
  channelName: string;
  channelCode: string;
  vendorId: number;
  vendorName: string;
  country: string;
  matchedBracket: string;
  minChargeableWeight?: number;
  price: number;
  registerFee?: number;
  totalPrice: number;
  eta?: string;
  etaMin?: number;
  isBest: boolean;
  currency: string;
}

export interface ParsedSheetData {
  sheetName: string;
  sheetType: string;
  rows: any[];
  channelCode?: string;
  effectiveDate?: string;
  structureChangeLevel?: StructureChangeLevel;
  structureChangeMessage?: string;
  isFirstVersion?: boolean;
  hasHistoricalVersion?: boolean;
  detectionScore?: number;
  detectionVerdict?: DetectionVerdict;
  detectionLog?: DetectionLog;
  action?: string; // 'import' | 'skip'
  notes?: string; // Remarks/notes extracted from non-data rows
  headerNotes?: string; // Notes from header area (first 3 rows)
  confidence?: number; // Confidence score 0-100
  needsMapping?: boolean; // True if confidence < threshold
  manualMapping?: {
    [key: string]: number; // field name -> column index
  };
  manualAnnotation?: {
    productName?: string;
    channelCode?: string;
    effectiveDate?: string;
  };
  rateCardDetails?: RateCardDetail[]; // Parsed rate card data
  currency?: string; // Sheet-level currency
  vendorTemplate?: string; // Which vendor template was used
}
