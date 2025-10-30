import { useEffect, useState } from 'react';
import { Progress, Result, Button } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useImportStore } from '@/store/useImportStore';
import { useNavigate } from 'react-router-dom';

export const ImportProgressStep = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reset } = useImportStore();
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Simulate import progress
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsComplete(true);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    return () => clearInterval(timer);
  }, []);

  const handleViewDiff = () => {
    reset();
    navigate('/rates/diff');
  };

  const handleNewImport = () => {
    reset();
  };

  if (isComplete) {
    return (
      <Result
        status="success"
        icon={<CheckCircleOutlined className="text-green-600" />}
        title={t('import.progress.success')}
        subTitle="All rate cards have been imported and price differences calculated automatically."
        extra={[
          <Button type="primary" key="diff" onClick={handleViewDiff}>
            View Differences
          </Button>,
          <Button key="new" onClick={handleNewImport}>
            New Import
          </Button>
        ]}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-12">
      <h3 className="text-xl font-semibold text-center text-foreground">
        {t('import.progress.importing')}
      </h3>
      <Progress
        percent={progress}
        status="active"
        strokeColor={{
          '0%': '#1890ff',
          '100%': '#52c41a',
        }}
      />
      <p className="text-center text-muted-foreground">
        Processing sheets and calculating rate differences...
      </p>
    </div>
  );
};
