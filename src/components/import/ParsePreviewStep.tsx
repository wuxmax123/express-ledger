import { Button, Table, Tag, Alert, Popover, Form, Input, DatePicker, Checkbox, Space } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useImportStore } from '@/store/useImportStore';
import { ParsedSheetData } from '@/types';
import { useState } from 'react';
import dayjs from 'dayjs';

export const ParsePreviewStep = () => {
  const { t } = useTranslation();
  const { parsedSheets, setParsedSheets, setCurrentStep } = useImportStore();
  const [editingSheet, setEditingSheet] = useState<string | null>(null);
  
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
          detectionVerdict: 'rate'
        };
      }
      return sheet;
    }));
    setEditingSheet(null);
  };
  
  const renderDetectionDetails = (record: ParsedSheetData) => {
    const log = record.detectionLog;
    if (!log) return null;
    
    return (
      <div className="space-y-2 text-sm">
        <div className="font-semibold">Detection Score: {log.totalScore}</div>
        <div>Verdict: <Tag color={log.verdict === 'rate' ? 'green' : log.verdict === 'uncertain' ? 'orange' : 'default'}>{log.verdict}</Tag></div>
        <div className="text-muted-foreground">{log.reason}</div>
        
        {log.headerSignal && (
          <div className="border-t pt-2 mt-2">
            <div className="font-medium">Header Signal: {log.headerSignal.points} pts</div>
            {log.headerSignal.found && (
              <div className="text-xs space-y-1 mt-1">
                <div>✓ Channel Code: {log.headerSignal.channelCode}</div>
                {log.headerSignal.effectiveDate && <div>✓ Effective Date: {log.headerSignal.effectiveDate}</div>}
              </div>
            )}
          </div>
        )}
        
        {log.columnSignal && (
          <div className="border-t pt-2 mt-2">
            <div className="font-medium">Column Mapping: {log.columnSignal.points} pts</div>
            {log.columnSignal.matchedHeaders.length > 0 && (
              <div className="text-xs mt-1">
                Matched: {log.columnSignal.matchedHeaders.join(', ')}
              </div>
            )}
          </div>
        )}
        
        {log.weightSignal && (
          <div className="border-t pt-2 mt-2">
            <div className="font-medium">Weight Range: {log.weightSignal.found ? '20' : '0'} pts</div>
            {log.weightSignal.samples.length > 0 && (
              <div className="text-xs mt-1">
                Samples: {log.weightSignal.samples.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    );
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
            <Button size="small" onClick={() => setEditingSheet(null)}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    );
  };

  const columns = [
    {
      title: 'Sheet Name',
      dataIndex: 'sheetName',
      key: 'sheetName',
      render: (name: string, record: ParsedSheetData) => (
        <Space>
          {name}
          {record.detectionLog && (
            <Popover
              content={renderDetectionDetails(record)}
              title="Detection Details"
              trigger="click"
            >
              <InfoCircleOutlined className="cursor-pointer text-primary" />
            </Popover>
          )}
        </Space>
      )
    },
    {
      title: 'Verdict',
      dataIndex: 'detectionVerdict',
      key: 'detectionVerdict',
      render: (verdict: string, record: ParsedSheetData) => {
        const colorMap = { rate: 'green', uncertain: 'orange', skipped: 'default' };
        return (
          <Space>
            <Tag color={colorMap[verdict as keyof typeof colorMap] || 'default'}>
              {verdict || 'N/A'}
            </Tag>
            {verdict === 'uncertain' && editingSheet !== record.sheetName && (
              <Button size="small" type="link" onClick={() => setEditingSheet(record.sheetName)}>
                Annotate
              </Button>
            )}
          </Space>
        );
      }
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
      title: 'Score',
      dataIndex: 'detectionScore',
      key: 'detectionScore',
      render: (score: number) => score !== undefined ? score : '-'
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
      title: 'Rows',
      dataIndex: 'rows',
      key: 'rows',
      render: (rows: any[]) => rows.length
    }
  ];

  const handleNext = () => {
    // Check if there are any uncertain sheets that haven't been annotated
    const uncertainSheets = parsedSheets.filter(s => s.detectionVerdict === 'uncertain' && !s.manualAnnotation);
    if (uncertainSheets.length > 0) {
      alert(`Please annotate ${uncertainSheets.length} uncertain sheet(s) before proceeding.`);
      return;
    }
    
    // Check if all sheets are first versions
    const rateSheets = parsedSheets.filter(s => s.detectionVerdict !== 'skipped');
    const allFirstVersions = rateSheets.every(s => s.isFirstVersion);
    
    if (allFirstVersions) {
      // Skip validation and confirmation steps, go directly to import
      setCurrentStep(4);
    } else {
      // Go to validation step
      setCurrentStep(2);
    }
  };

  const rateSheets = parsedSheets.filter(s => s.detectionVerdict !== 'skipped');
  const allFirstVersions = rateSheets.every(s => s.isFirstVersion);
  const skippedCount = parsedSheets.filter(s => s.detectionVerdict === 'skipped').length;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground">{t('import.preview.title')}</h3>
      
      {allFirstVersions && rateSheets.length > 0 && (
        <Alert
          message={t('import.preview.allFirstVersions')}
          description="This is the first import for all rate card channels. Structure validation will be skipped."
          type="info"
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
            return null;
          },
          expandedRowKeys: editingSheet ? [parsedSheets.findIndex(s => s.sheetName === editingSheet)] : [],
          expandRowByClick: false
        }}
      />
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
