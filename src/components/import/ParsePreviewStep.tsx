import { Button, Table, Tag, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { useImportStore } from '@/store/useImportStore';

export const ParsePreviewStep = () => {
  const { t } = useTranslation();
  const { parsedSheets, setCurrentStep } = useImportStore();

  const columns = [
    {
      title: 'Sheet Name',
      dataIndex: 'sheetName',
      key: 'sheetName',
    },
    {
      title: 'Type',
      dataIndex: 'sheetType',
      key: 'sheetType',
      render: (type: string) => (
        <Tag color={type === 'RATE_CARD' ? 'blue' : 'default'}>{type}</Tag>
      )
    },
    {
      title: 'Channel Code',
      dataIndex: 'channelCode',
      key: 'channelCode',
    },
    {
      title: 'Version Status',
      dataIndex: 'isFirstVersion',
      key: 'isFirstVersion',
      render: (isFirstVersion: boolean) => (
        <Tag color={isFirstVersion ? 'green' : 'blue'}>
          {isFirstVersion ? '初版 / First Version' : '更新版本 / Update'}
        </Tag>
      )
    },
    {
      title: 'Rows',
      dataIndex: 'rows',
      key: 'rows',
      render: (rows: any[]) => `${rows.length} ${t('import.preview.rows')}`
    }
  ];

  const handleNext = () => {
    // Check if all sheets are first versions
    const allFirstVersions = parsedSheets.every(s => s.isFirstVersion);
    
    if (allFirstVersions) {
      // Skip validation and confirmation steps, go directly to import
      setCurrentStep(4);
    } else {
      // Go to validation step
      setCurrentStep(2);
    }
  };

  const allFirstVersions = parsedSheets.every(s => s.isFirstVersion);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground">{t('import.preview.title')}</h3>
      
      {allFirstVersions && (
        <Alert
          message={t('import.preview.allFirstVersions')}
          description="This is the first import for all channels. Structure validation will be skipped."
          type="info"
          showIcon
        />
      )}

      <Table
        dataSource={parsedSheets.map((s, i) => ({ ...s, key: i }))}
        columns={columns}
        pagination={false}
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
