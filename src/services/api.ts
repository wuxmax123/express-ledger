import { Vendor, ShippingChannel, RateDiff, ChannelRateSheet, ImportJob, VendorBatch } from '@/types';

// Mock API base URL - replace with your Java Spring Boot backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// Mock data for development
const mockVendors: Vendor[] = [
  { id: 1, name: '云途物流', code: 'YUNEXPRESS', contactInfo: 'contact@yunexpress.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 2, name: '递四方', code: '4PX', contactInfo: 'contact@4px.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 3, name: '万邦速达', code: 'WANBEXPRESS', contactInfo: 'contact@wanb.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 4, name: '顺友物流', code: 'SUNYOU', contactInfo: 'contact@sunyou.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 5, name: '燕文物流', code: 'YANWEN', contactInfo: 'contact@yanwen.com', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
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

  checkChannelHistory: async (channelCode: string): Promise<boolean> => {
    // TODO: Replace with actual API call
    // return client.get(`/channels/check-history?channelCode=${channelCode}`);
    
    // Mock: simulate channels have history based on vendor patterns
    // YunExpress (YE), 4PX, WanbExpress, Sunyou channels have history
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Simulate that YE (云途) channels and some others have historical versions
    const channelsWithHistory = ['YE001', 'YE002', 'YE003', '4PX001', 'WE001'];
    const hasHistory = channelsWithHistory.includes(channelCode) || 
                       channelCode.startsWith('YE') || 
                       channelCode.startsWith('4PX');
    
    return hasHistory;
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

  // Vendor Batches
  getVendorBatches: async (vendorId: number): Promise<VendorBatch[]> => {
    // Mock data
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      {
        id: 1,
        vendorId,
        fileName: '云途报价20251020.xlsx',
        uploadedBy: 'admin',
        uploadedAt: '2025-10-20T10:30:00',
        effectiveDate: '2025-10-21',
        totalChannels: 22,
        notes: '调整欧洲区价格，新增俄罗斯专线'
      },
      {
        id: 2,
        vendorId,
        fileName: '云途报价20250915.xlsx',
        uploadedBy: 'admin',
        uploadedAt: '2025-09-15T14:20:00',
        effectiveDate: '2025-09-16',
        totalChannels: 20,
        notes: '新增美国专线，优化亚洲区时效'
      },
      {
        id: 3,
        vendorId,
        fileName: '云途报价20250801.xlsx',
        uploadedBy: 'system',
        uploadedAt: '2025-08-01T09:00:00',
        effectiveDate: '2025-08-02',
        totalChannels: 18,
      },
    ];
  },

  getBatchChannels: async (batchId: number): Promise<ChannelRateSheet[]> => {
    // Mock data for channels in a batch
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      {
        id: 1,
        channelId: 1,
        batchId,
        versionCode: 'v20251020',
        effectiveDate: '2025-10-21',
        fileName: '云途报价20251020.xlsx',
        uploadedBy: 'admin',
        status: 'active',
        createdAt: '2025-10-20T10:30:00',
        updatedAt: '2025-10-20T10:30:00'
      },
      {
        id: 2,
        channelId: 2,
        batchId,
        versionCode: 'v20251020',
        effectiveDate: '2025-10-21',
        fileName: '云途报价20251020.xlsx',
        uploadedBy: 'admin',
        status: 'active',
        createdAt: '2025-10-20T10:30:00',
        updatedAt: '2025-10-20T10:30:00'
      },
    ];
  },

  // Version history
  getChannelVersions: async (channelId: number): Promise<ChannelRateSheet[]> => {
    // Mock data
    await new Promise(resolve => setTimeout(resolve, 300));
    return [
      {
        id: 1,
        channelId,
        batchId: 1,
        versionCode: 'v20251020',
        effectiveDate: '2025-10-21',
        fileName: '云途报价20251020.xlsx',
        uploadedBy: 'admin',
        status: 'active',
        createdAt: '2025-10-20T10:30:00',
        updatedAt: '2025-10-20T10:30:00'
      },
      {
        id: 2,
        channelId,
        batchId: 2,
        versionCode: 'v20250915',
        effectiveDate: '2025-09-16',
        fileName: '云途报价20250915.xlsx',
        uploadedBy: 'admin',
        status: 'inactive',
        createdAt: '2025-09-15T14:20:00',
        updatedAt: '2025-09-15T14:20:00'
      },
      {
        id: 3,
        channelId,
        batchId: 3,
        versionCode: 'v20250801',
        effectiveDate: '2025-08-02',
        fileName: '云途报价20250801.xlsx',
        uploadedBy: 'system',
        status: 'inactive',
        createdAt: '2025-08-01T09:00:00',
        updatedAt: '2025-08-01T09:00:00'
      },
    ];
  },

  // Rate Browse
  getRateBrowse: async (params: any) => {
    // TODO: Replace with actual API call
    // return client.get('/rates/browse?' + new URLSearchParams(params));
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data
    const mockData = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      sheetId: 1,
      channelId: 1,
      channelName: '云途美国专线',
      vendorId: 1,
      vendorName: '云途物流',
      versionCode: 'v1.0.0',
      country: ['US', 'UK', 'CA', 'AU', 'DE'][i % 5],
      zone: `Zone ${(i % 3) + 1}`,
      eta: `${5 + (i % 5)}-${10 + (i % 5)}工作日`,
      weightFrom: (i % 10) * 0.5,
      weightTo: ((i % 10) + 1) * 0.5,
      minChargeableWeight: 0.05,
      price: 45.50 + (i % 20),
      currency: 'RMB',
      registerFee: 8.0,
    }));

    const page = params.page || 1;
    const size = params.size || 20;
    const start = (page - 1) * size;
    const end = start + size;

    return {
      content: mockData.slice(start, end),
      totalElements: mockData.length,
      totalPages: Math.ceil(mockData.length / size),
      size,
      number: page - 1,
    };
  },

  // Rate Compare
  getRateCompare: async (params: any) => {
    // TODO: Replace with actual API call
    // return client.get('/rates/compare?' + new URLSearchParams(params));
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock comparison data
    const channels = [
      { id: 1, name: '云途美国专线', code: 'YE001', vendorId: 1, vendorName: '云途物流' },
      { id: 2, name: '递四方美国专线', code: '4PX001', vendorId: 2, vendorName: '递四方' },
      { id: 3, name: '万邦美国专线', code: 'WE001', vendorId: 3, vendorName: '万邦速达' },
    ];

    const results = channels.map((ch, i) => {
      const price = 45.50 + i * 2.5;
      const registerFee = 8.0;
      const etaMin = 5 + i;
      return {
        channelId: ch.id,
        channelName: ch.name,
        channelCode: ch.code,
        vendorId: ch.vendorId,
        vendorName: ch.vendorName,
        country: params.country || 'US',
        matchedBracket: '[0.5, 1.0) kg',
        minChargeableWeight: 0.05,
        price,
        registerFee,
        totalPrice: price + registerFee,
        eta: `${etaMin}-${etaMin + 5}工作日`,
        etaMin,
        isBest: false,
        currency: 'RMB',
      };
    });

    // Mark best based on sortBy
    if (results.length > 0) {
      if (params.sortBy === 'ETA') {
        results.sort((a, b) => (a.etaMin || 999) - (b.etaMin || 999));
      } else {
        results.sort((a, b) => a.totalPrice - b.totalPrice);
      }
      results[0].isBest = true;
    }

    return results;
  }
};
