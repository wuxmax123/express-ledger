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

export interface ParsedSheetData {
  sheetName: string;
  sheetType: string;
  rows: any[];
  channelCode?: string;
  effectiveDate?: string;
  structureChangeLevel?: StructureChangeLevel;
  structureChangeMessage?: string;
}
