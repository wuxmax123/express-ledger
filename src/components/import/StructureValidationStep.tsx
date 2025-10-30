import { Button, Table, Tag, Alert } from 'antd';
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useImportStore } from '@/store/useImportStore';
import { StructureChangeLevel } from '@/types';

export const StructureValidationStep = () => {
  const { t } = useTranslation();
  const { parsedSheets, setCurrentStep } = useImportStore();

  // Filter out first versions - they don't need validation
  const sheetsToValidate = parsedSheets.filter(s => !s.isFirstVersion);

  const getChangeIcon = (level: StructureChangeLevel) => {
    switch (level) {
      case 'NONE':
        return <CheckCircleOutlined className="text-green-600" />;
      case 'MINOR':
        return <WarningOutlined className="text-yellow-600" />;
      case 'MAJOR':
        return <CloseCircleOutlined className="text-red-600" />;
    }
  };

  const getChangeTag = (level: StructureChangeLevel) => {
    const colors = {
      NONE: 'success',
      MINOR: 'warning',
      MAJOR: 'error'
    };
    return (
      <Tag color={colors[level]} icon={getChangeIcon(level)}>
        {t(`import.validation.${level.toLowerCase()}`)}
      </Tag>
    );
  };

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
      title: 'Structure Change',
      dataIndex: 'structureChangeLevel',
      key: 'structureChangeLevel',
      render: (level: StructureChangeLevel) => getChangeTag(level)
    },
    {
      title: 'Message',
      dataIndex: 'structureChangeMessage',
      key: 'structureChangeMessage',
      ellipsis: true
    }
  ];

  const hasMajorChanges = sheetsToValidate.some(s => s.structureChangeLevel === 'MAJOR');

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-foreground">{t('import.validation.title')}</h3>
      
      {hasMajorChanges && (
        <Alert
          message="Major Structure Changes Detected"
          description="Some channels have major weight structure changes. Please review and confirm actions in the next step."
          type="warning"
          showIcon
        />
      )}

      <Table
        dataSource={sheetsToValidate.map((s, i) => ({ ...s, key: i }))}
        columns={columns}
        pagination={false}
      />

      <div className="flex justify-between mt-6">
        <Button onClick={() => setCurrentStep(1)}>
          {t('common.previous')}
        </Button>
        <Button type="primary" onClick={() => setCurrentStep(3)}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
};
