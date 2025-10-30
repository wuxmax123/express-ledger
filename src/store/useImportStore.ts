import { create } from 'zustand';
import { ImportJob, ParsedSheetData, StructureChangeLevel } from '@/types';

interface ImportState {
  currentJob: ImportJob | null;
  parsedSheets: ParsedSheetData[];
  selectedVendorId: number | null;
  currentStep: number;
  uploadFileName: string | null;
  uploadedBy: string;
  setCurrentJob: (job: ImportJob | null) => void;
  setParsedSheets: (sheets: ParsedSheetData[] | ((prev: ParsedSheetData[]) => ParsedSheetData[])) => void;
  setSelectedVendorId: (id: number | null) => void;
  setCurrentStep: (step: number) => void;
  setUploadFileName: (fileName: string | null) => void;
  setUploadedBy: (user: string) => void;
  updateSheetAction: (sheetName: string, action: string) => void;
  reset: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  currentJob: null,
  parsedSheets: [],
  selectedVendorId: null,
  currentStep: 0,
  uploadFileName: null,
  uploadedBy: 'admin',
  setCurrentJob: (job) => set({ currentJob: job }),
  setParsedSheets: (sheets) => set((state) => ({
    parsedSheets: typeof sheets === 'function' ? sheets(state.parsedSheets) : sheets
  })),
  setSelectedVendorId: (id) => set({ selectedVendorId: id }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setUploadFileName: (fileName) => set({ uploadFileName: fileName }),
  setUploadedBy: (user) => set({ uploadedBy: user }),
  updateSheetAction: (sheetName, action) => set((state) => ({
    parsedSheets: state.parsedSheets.map(sheet => 
      sheet.sheetName === sheetName ? { ...sheet, action } : sheet
    )
  })),
  reset: () => set({
    currentJob: null,
    parsedSheets: [],
    selectedVendorId: null,
    currentStep: 0,
    uploadFileName: null,
    uploadedBy: 'admin'
  })
}));
