import { Button, Table, Tag } from 'antd';
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
      title: 'Rows',
      dataIndex: 'rows',
      key: 'rows',
      render: (rows: any[]) => `${rows.length} ${t('import.preview.rows')}`
    }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground">{t('import.preview.title')}</h3>
      <Table
        dataSource={parsedSheets.map((s, i) => ({ ...s, key: i }))}
        columns={columns}
        pagination={false}
      />
      <div className="flex justify-between mt-6">
        <Button onClick={() => setCurrentStep(0)}>
          {t('common.previous')}
        </Button>
        <Button type="primary" onClick={() => setCurrentStep(2)}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
};
