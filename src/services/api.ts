import { Vendor, ShippingChannel, RateDiff, ChannelRateSheet, ImportJob } from '@/types';

// Mock API base URL - replace with your Java Spring Boot backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Mock data for development
const mockVendors: Vendor[] = [
  { id: 1, name: '云途物流', code: 'YUNEXPRESS', contactInfo: 'contact@yunexpress.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 2, name: '递四方', code: '4PX', contactInfo: 'contact@4px.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 3, name: '万邦速达', code: 'WANBEXPRESS', contactInfo: 'contact@wanb.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 4, name: '顺友物流', code: 'SUNYOU', contactInfo: 'contact@sunyou.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

const mockChannels: ShippingChannel[] = [
  { id: 1, vendorId: 1, name: '云途美国专线', channelCode: 'YE001', currency: 'RMB', region: 'US', serviceType: 'STANDARD', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 2, vendorId: 1, name: '云途英国专线', channelCode: 'YE002', currency: 'RMB', region: 'UK', serviceType: 'EXPRESS', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

// API client wrapper
class ApiClient {
  async get<T>(endpoint: string): Promise<T> {
    // TODO: Replace with actual fetch call to Java backend
    // const response = await fetch(`${API_BASE_URL}${endpoint}`);
    // return response.json();
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return {} as T;
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    // TODO: Replace with actual fetch call to Java backend
    // const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
    // return response.json();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return {} as T;
  }
}

const client = new ApiClient();

// API functions
export const api = {
  // Vendors
  getVendors: async (): Promise<Vendor[]> => {
    return mockVendors;
  },

  // Channels
  getChannels: async (vendorId?: number): Promise<ShippingChannel[]> => {
    if (vendorId) {
      return mockChannels.filter(c => c.vendorId === vendorId);
    }
    return mockChannels;
  },

  // Rate imports
  createImportJob: async (file: File, vendorId: number): Promise<ImportJob> => {
    return client.post('/rate-imports', { file, vendorId });
  },

  getImportJobSheets: async (jobId: number) => {
    return client.get(`/rate-imports/${jobId}/sheets`);
  },

  getStructureDiff: async (jobId: number, channelId: number) => {
    return client.get(`/rate-imports/${jobId}/structure-diff?channelId=${channelId}`);
  },

  confirmStructure: async (jobId: number, confirmations: any) => {
    return client.post(`/rate-imports/${jobId}/confirm-structure`, confirmations);
  },

  publishImport: async (jobId: number) => {
    return client.post(`/rate-imports/${jobId}/publish`, {});
  },

  // Rate diffs
  getRateDiffs: async (params: {
    channelId?: number;
    sheetId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<RateDiff[]> => {
    // Mock data
    return [
      {
        id: 1,
        oldSheetId: 1,
        newSheetId: 2,
        channelId: 1,
        country: 'US',
        zone: 'Zone 1',
        weightFrom: 0,
        weightTo: 0.5,
        oldPrice: 45.50,
        newPrice: 48.00,
        delta: 2.50,
        deltaPct: 5.49
      },
      {
        id: 2,
        oldSheetId: 1,
        newSheetId: 2,
        channelId: 1,
        country: 'US',
        zone: 'Zone 1',
        weightFrom: 0.5,
        weightTo: 1.0,
        oldPrice: 52.00,
        newPrice: 50.00,
        delta: -2.00,
        deltaPct: -3.85
      },
    ];
  },

  // Version history
  getChannelVersions: async (channelId: number): Promise<ChannelRateSheet[]> => {
    // Mock data
    return [
      {
        id: 1,
        channelId,
        versionCode: 'v1.0.0',
        effectiveDate: '2024-01-01',
        fileName: 'yunexpress_rates_202401.xlsx',
        uploadedBy: 'admin',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      {
        id: 2,
        channelId,
        versionCode: 'v1.1.0',
        effectiveDate: '2024-02-01',
        fileName: 'yunexpress_rates_202402.xlsx',
        uploadedBy: 'admin',
        status: 'inactive',
        createdAt: '2024-02-01',
        updatedAt: '2024-02-01'
      },
    ];
  }
};
