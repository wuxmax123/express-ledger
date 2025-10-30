import { useState } from 'react';
import { Steps, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { UploadStep } from '@/components/import/UploadStep';
import { ParsePreviewStep } from '@/components/import/ParsePreviewStep';
import { StructureValidationStep } from '@/components/import/StructureValidationStep';
import { ConfirmActionsStep } from '@/components/import/ConfirmActionsStep';
import { ImportProgressStep } from '@/components/import/ImportProgressStep';
import { useImportStore } from '@/store/useImportStore';

const RateImport = () => {
  const { t } = useTranslation();
  const { currentStep } = useImportStore();

  const steps = [
    { title: t('import.step1'), content: <UploadStep /> },
    { title: t('import.step2'), content: <ParsePreviewStep /> },
    { title: t('import.step3'), content: <StructureValidationStep /> },
    { title: t('import.step4'), content: <ConfirmActionsStep /> },
    { title: t('import.step5'), content: <ImportProgressStep /> },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">{t('import.title')}</h1>
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
