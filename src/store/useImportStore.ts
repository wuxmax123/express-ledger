import { create } from 'zustand';
import { ImportJob, ParsedSheetData, StructureChangeLevel } from '@/types';

interface ImportState {
  currentJob: ImportJob | null;
  parsedSheets: ParsedSheetData[];
  selectedVendorId: number | null;
  currentStep: number;
  setCurrentJob: (job: ImportJob | null) => void;
  setParsedSheets: (sheets: ParsedSheetData[]) => void;
  setSelectedVendorId: (id: number | null) => void;
  setCurrentStep: (step: number) => void;
  updateSheetAction: (sheetName: string, action: string) => void;
  reset: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  currentJob: null,
  parsedSheets: [],
  selectedVendorId: null,
  currentStep: 0,
  setCurrentJob: (job) => set({ currentJob: job }),
  setParsedSheets: (sheets) => set({ parsedSheets: sheets }),
  setSelectedVendorId: (id) => set({ selectedVendorId: id }),
  setCurrentStep: (step) => set({ currentStep: step }),
  updateSheetAction: (sheetName, action) => set((state) => ({
    parsedSheets: state.parsedSheets.map(sheet => 
      sheet.sheetName === sheetName ? { ...sheet, action } : sheet
    )
  })),
  reset: () => set({
    currentJob: null,
    parsedSheets: [],
    selectedVendorId: null,
    currentStep: 0
  })
}));
