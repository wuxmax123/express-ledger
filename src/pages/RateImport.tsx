import { Steps, Card, Button, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { UploadStep } from '@/components/import/UploadStep';
import { ParsePreviewStep } from '@/components/import/ParsePreviewStep';
import { ImportProgressStep } from '@/components/import/ImportProgressStep';
import { useImportStore } from '@/store/useImportStore';

const RateImport = () => {
  const { t } = useTranslation();
  const { currentStep, reset } = useImportStore();

  const handleClearHistory = () => {
    // Clear all channel structure data from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('channelStructure:')) {
        localStorage.removeItem(key);
      }
    });
    // Reset import state
    reset();
    toast.success('历史数据已清空 / History data cleared');
  };

  const steps = [
    { title: t('import.step1'), content: <UploadStep /> },
    { title: t('import.step2'), content: <ParsePreviewStep /> },
    { title: t('import.step3'), content: <ImportProgressStep /> },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('import.title')}</h1>
        <Popconfirm
          title="清空历史数据 / Clear History"
          description="确定要清空所有渠道的历史结构数据吗？/ Are you sure to clear all channel structure history?"
          onConfirm={handleClearHistory}
          okText="确定 / Yes"
          cancelText="取消 / No"
        >
          <Button 
            danger 
            icon={<DeleteOutlined />}
          >
            清空历史 / Clear History
          </Button>
        </Popconfirm>
      </div>
      <Card>
        <Steps current={currentStep} items={steps} className="mb-8" />
        <div className="mt-8">
          {steps[currentStep].content}
        </div>
      </Card>
    </div>
  );
};

export default RateImport;
