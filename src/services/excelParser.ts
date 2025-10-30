import * as XLSX from 'xlsx';
import { ParsedSheetData, StructureChangeLevel } from '@/types';

export const parseExcelFile = async (file: File): Promise<ParsedSheetData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const sheets: ParsedSheetData[] = workbook.SheetNames.map((sheetName, index) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Detect sheet type and simulate structure validation
          const sheetType = detectSheetType(sheetName);
          const structureChangeLevel = simulateStructureValidation(index);
          
          return {
            sheetName,
            sheetType,
            rows: jsonData,
            channelCode: extractChannelCode(sheetName),
            structureChangeLevel,
            structureChangeMessage: getStructureMessage(structureChangeLevel)
          };
        });
        
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

const extractChannelCode = (sheetName: string): string => {
  // Simple extraction - in real implementation, use regex from template
  const match = sheetName.match(/[A-Z]{2}\d{3}/);
  return match ? match[0] : `CH${Math.floor(Math.random() * 1000)}`;
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
