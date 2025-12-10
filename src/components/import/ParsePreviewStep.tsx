import { Button, Table, Tag, Alert, Popover, Form, Input, DatePicker, Checkbox, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useImportStore } from '@/store/useImportStore';
import { ParsedSheetData } from '@/types';
import { useState } from 'react';
import dayjs from 'dayjs';
import { ColumnMappingDialog } from './ColumnMappingDialog';

export const ParsePreviewStep = () => {
  const { t } = useTranslation();
  const { parsedSheets, setParsedSheets, setCurrentStep } = useImportStore();
  const [editingSheet, setEditingSheet] = useState<string | null>(null);
  const [mappingSheet, setMappingSheet] = useState<ParsedSheetData | null>(null);
  
  const handleManualAnnotation = (sheetName: string, values: any) => {
    setParsedSheets(parsedSheets.map(sheet => {
      if (sheet.sheetName === sheetName) {
        return {
          ...sheet,
          manualAnnotation: {
            productName: values.productName,
            channelCode: values.channelCode,
            effectiveDate: values.effectiveDate ? values.effectiveDate.format('YYYY-MM-DD HH:mm') : undefined
          },
          channelCode: values.channelCode || sheet.channelCode,
          effectiveDate: values.effectiveDate ? values.effectiveDate.format('YYYY-MM-DD HH:mm') : sheet.effectiveDate,
          detectionVerdict: 'rate',
          needsMapping: false,
          confidence: 100
        };
      }
      return sheet;
    }));
    setEditingSheet(null);
  };
  
  const handleColumnMapping = (sheetName: string, mapping: { [key: string]: number }) => {
    setParsedSheets(parsedSheets.map(sheet => {
      if (sheet.sheetName === sheetName) {
        return {
          ...sheet,
          manualMapping: mapping,
          needsMapping: false,
          confidence: 100,
          detectionVerdict: 'rate'
        };
      }
      return sheet;
    }));
    setMappingSheet(null);
  };
  
  
  const handleSkipMapping = (sheetName: string) => {
    setParsedSheets(parsedSheets.map(sheet => {
      if (sheet.sheetName === sheetName) {
        return {
          ...sheet,
          needsMapping: false,
          detectionVerdict: 'rate', // Mark as rate card to allow processing
          confidence: 50 // Lower confidence since we skipped mapping
        };
      }
      return sheet;
    }));
    setMappingSheet(null);
  };
  
  const handleSkipSheet = (sheetName: string) => {
    setParsedSheets(parsedSheets.map(sheet => {
      if (sheet.sheetName === sheetName) {
        return {
          ...sheet,
          detectionVerdict: 'skipped',
          action: 'skip'
        };
      }
      return sheet;
    }));
    setEditingSheet(null);
  };
  
  const renderManualAnnotationForm = (record: ParsedSheetData) => {
    return (
      <Form
        layout="vertical"
        initialValues={{
          productName: record.rows[0]?.[0] || '',
          channelCode: record.channelCode || '',
          effectiveDate: record.effectiveDate ? dayjs(record.effectiveDate) : null
        }}
        onFinish={(values) => handleManualAnnotation(record.sheetName, values)}
        size="small"
      >
        <Form.Item label="Product Name" name="productName">
          <Input placeholder="e.g., YunExpress Standard" />
        </Form.Item>
        <Form.Item label="Channel Code" name="channelCode" rules={[{ required: true, message: 'Required' }]}>
          <Input placeholder="e.g., YE123" />
        </Form.Item>
        <Form.Item label="Effective Date" name="effectiveDate">
          <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="saveTemplate" valuePropName="checked">
          <Checkbox>Save to template (auto-recognize next time)</Checkbox>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" size="small">Save</Button>
            <Button size="small" onClick={() => handleSkipSheet(record.sheetName)}>Skip</Button>
            <Button size="small" onClick={() => setEditingSheet(null)}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };
  
  const renderRateCardDetails = (record: ParsedSheetData) => {
    if (!record.rateCardDetails || record.rateCardDetails.length === 0) {
      return <div className="text-muted-foreground p-4">No rate card details available</div>;
    }
    
    const detailColumns = [
      { title: '国家/地区', dataIndex: 'country', key: 'country', width: 100 },
      { title: '分区', dataIndex: 'zone', key: 'zone', width: 80 },
      { title: '时效', dataIndex: 'eta', key: 'eta', width: 100 },
      { 
        title: '重量区间', 
        key: 'weightRange', 
        width: 120,
        render: (_: any, row: any) => row.weightRaw || `${row.weightFrom || '-'} - ${row.weightTo || '-'}`
      },
      { 
        title: '最低计费重', 
        dataIndex: 'minChargeableWeight', 
        key: 'minChargeableWeight', 
        width: 120,
        render: (text: number) => text !== undefined ? `${text} kg` : '-'
      },
      { 
        title: '运费', 
        dataIndex: 'price', 
        key: 'price', 
        width: 100,
        render: (text: number, row: any) => text !== undefined ? `${text} ${row.currency || 'RMB'}` : '-'
      },
      { 
        title: '挂号费', 
        dataIndex: 'registerFee', 
        key: 'registerFee', 
        width: 100,
        render: (text: number, row: any) => text !== undefined ? `${text} ${row.currency || 'RMB'}` : '-'
      }
    ];
    
    return (
      <div className="p-4">
        <div className="mb-2 text-sm font-medium">Price Card Details ({record.rateCardDetails.length} rows)</div>
        <Table
          dataSource={record.rateCardDetails.map((d, i) => ({ ...d, key: i }))}
          columns={detailColumns}
          pagination={{ pageSize: 10, size: 'small' }}
          size="small"
          scroll={{ x: 800 }}
        />
        
        {record.notes && (
          <div className="mt-4 border-t pt-4">
            <div className="text-sm font-medium mb-2">备注:</div>
            <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap text-muted-foreground">
              {record.notes}
            </div>
          </div>
        )}
      </div>
    );
  };

  const columns = [
    {
      title: 'Sheet Name',
      dataIndex: 'sheetName',
      key: 'sheetName',
      render: (name: string) => name
    },
    {
      title: 'Type',
      dataIndex: 'sheetType',
      key: 'sheetType',
      render: (type: string) => (
        <Tag color={type === 'RATE_CARD' ? 'blue' : type === 'UNCERTAIN' ? 'orange' : 'default'}>{type}</Tag>
      )
    },
    {
      title: 'Channel Code',
      dataIndex: 'channelCode',
      key: 'channelCode',
      render: (code: string) => code || '-'
    },
    {
      title: 'Version',
      dataIndex: 'isFirstVersion',
      key: 'isFirstVersion',
      render: (isFirstVersion: boolean) => (
        <Tag color={isFirstVersion ? 'green' : 'blue'}>
          {isFirstVersion ? '初版' : '更新'}
        </Tag>
      )
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: any, record: ParsedSheetData) => {
        const rateCount = record.rateCardDetails?.length || 0;
        const rowCount = record.rows?.length || 0;
        return (
          <Popover
            content={
              <div className="space-y-2 text-sm">
                <div>Raw Rows: {rowCount}</div>
                <div>Rate Items: {rateCount}</div>
                {record.effectiveDate && <div>Effective Date: {record.effectiveDate}</div>}
                {record.notes && <div>Notes: {record.notes.substring(0, 100)}...</div>}
              </div>
            }
            title="Sheet Details"
            trigger="click"
          >
            <Button size="small" type="link">
              View Details
            </Button>
          </Popover>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: ParsedSheetData) => {
        if (record.needsMapping && editingSheet !== record.sheetName) {
          return (
            <Button size="small" type="link" onClick={() => setMappingSheet(record)}>
              Map Columns
            </Button>
          );
        }
        if (record.detectionVerdict === 'uncertain' && !record.needsMapping && editingSheet !== record.sheetName) {
          return (
            <Button size="small" type="link" onClick={() => setEditingSheet(record.sheetName)}>
              Annotate
            </Button>
          );
        }
        return '-';
      }
    }
  ];

  const handleNext = () => {
    // Check if there are any uncertain sheets that haven't been annotated or mapped
    const uncertainSheets = parsedSheets.filter(s => 
      (s.detectionVerdict === 'uncertain' || s.needsMapping) && 
      !s.manualAnnotation && 
      !s.manualMapping
    );
    if (uncertainSheets.length > 0) {
      alert(`Please annotate or map ${uncertainSheets.length} uncertain sheet(s) before proceeding.`);
      return;
    }
    
    // Go directly to import step (step 2 now, since we removed validation and confirm steps)
    setCurrentStep(2);
  };

  const skippedCount = parsedSheets.filter(s => s.detectionVerdict === 'skipped').length;
  const needsMappingCount = parsedSheets.filter(s => s.needsMapping).length;
  
  // Get available columns for mapping dialog
  const getAvailableColumns = (sheet: ParsedSheetData): string[] => {
    if (!sheet.rows || sheet.rows.length === 0) return [];
    
    // Find the header row (first non-empty row with strings)
    for (let i = 0; i < Math.min(8, sheet.rows.length); i++) {
      const row = sheet.rows[i];
      if (row && row.some((cell: any) => typeof cell === 'string' && cell.trim())) {
        return row.map((cell: any, idx: number) => 
          typeof cell === 'string' ? cell.trim() : `Column ${idx + 1}`
        );
      }
    }
    return [];
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground">{t('import.preview.title')}</h3>
      
      {needsMappingCount > 0 && (
        <Alert
          message="Low Confidence Detection"
          description={`${needsMappingCount} sheet(s) need column mapping confirmation. Click "Map Columns" to proceed.`}
          type="warning"
          showIcon
        />
      )}
      
      
      {skippedCount > 0 && (
        <Alert
          message={`${skippedCount} sheet(s) skipped`}
          description="Some sheets were skipped based on blacklist patterns (目录, 偏远, 附加费, etc.)"
          type="warning"
          showIcon
        />
      )}

      <Table
        dataSource={parsedSheets.map((s, i) => ({ ...s, key: i }))}
        columns={columns}
        pagination={false}
        expandable={{
          expandedRowRender: (record) => {
            if (editingSheet === record.sheetName) {
              return renderManualAnnotationForm(record);
            }
            if (record.rateCardDetails && record.rateCardDetails.length > 0) {
              return renderRateCardDetails(record);
            }
            return null;
          },
          expandedRowKeys: editingSheet ? [parsedSheets.findIndex(s => s.sheetName === editingSheet)] : [],
          expandRowByClick: true,
          rowExpandable: (record) => 
            editingSheet === record.sheetName || 
            (record.rateCardDetails && record.rateCardDetails.length > 0) ||
            false
        }}
      />
      
      {mappingSheet && (
        <ColumnMappingDialog
          open={!!mappingSheet}
          sheet={mappingSheet}
          availableColumns={getAvailableColumns(mappingSheet)}
          onConfirm={(mapping) => handleColumnMapping(mappingSheet.sheetName, mapping)}
          onCancel={() => setMappingSheet(null)}
          onSkip={() => handleSkipMapping(mappingSheet.sheetName)}
        />
      )}
      
      <div className="flex justify-between mt-6">
        <Button onClick={() => setCurrentStep(0)}>
          {t('common.previous')}
        </Button>
        <Button type="primary" onClick={handleNext}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
};
