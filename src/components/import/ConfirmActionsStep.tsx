import { Button, Table, Select, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { useImportStore } from '@/store/useImportStore';

export const ConfirmActionsStep = () => {
  const { t } = useTranslation();
  const { parsedSheets, setCurrentStep, updateSheetAction } = useImportStore();

  const majorChangeSheets = parsedSheets.filter(s => s.structureChangeLevel === 'MAJOR');

  const columns = [
    {
      title: 'Sheet Name',
      dataIndex: 'sheetName',
      key: 'sheetName',
    },
    {
      title: 'Channel Code',
      dataIndex: 'channelCode',
      key: 'channelCode',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Select
          defaultValue="override"
          className="w-48"
          onChange={(value) => updateSheetAction(record.sheetName, value)}
          options={[
            { label: t('import.confirm.override'), value: 'override' },
            { label: t('import.confirm.skip'), value: 'skip' }
          ]}
        />
      )
    }
  ];

  const handleConfirm = () => {
    setCurrentStep(4);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground">{t('import.confirm.title')}</h3>
      
      {majorChangeSheets.length === 0 ? (
        <Alert
          message="No Major Changes"
          description="All channels passed structure validation. Ready to import."
          type="success"
          showIcon
        />
      ) : (
        <>
          <Alert
            message="Action Required"
            description="Please select an action for each channel with major structure changes."
            type="info"
            showIcon
          />
          <Table
            dataSource={majorChangeSheets.map((s, i) => ({ ...s, key: i }))}
            columns={columns}
            pagination={false}
          />
        </>
      )}

      <div className="flex justify-between mt-6">
        <Button onClick={() => setCurrentStep(2)}>
          {t('common.previous')}
        </Button>
        <Button type="primary" onClick={handleConfirm}>
          {t('common.confirm')}
        </Button>
      </div>
    </div>
  );
};
