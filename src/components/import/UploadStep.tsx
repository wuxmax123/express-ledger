import { Upload, Select, Button, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useImportStore } from '@/store/useImportStore';
import { parseExcelFile } from '@/services/excelParser';
import type { UploadProps } from 'antd';

const { Dragger } = Upload;

export const UploadStep = () => {
  const { t } = useTranslation();
  const { selectedVendorId, setSelectedVendorId, setParsedSheets, setCurrentStep } = useImportStore();
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: api.getVendors
  });

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.xlsx,.xls',
    beforeUpload: async (file) => {
      if (!selectedVendorId) {
        message.error(t('import.selectVendor'));
        return false;
      }

      try {
        message.loading({ content: t('import.parsing'), key: 'parsing' });
        const sheets = await parseExcelFile(file);
        setParsedSheets(sheets);
        message.success({ content: 'File parsed successfully', key: 'parsing' });
        setCurrentStep(1);
      } catch (error) {
        message.error({ content: 'Failed to parse file', key: 'parsing' });
      }
      
      return false; // Prevent auto upload
    },
    showUploadList: false
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block mb-2 font-medium text-foreground">
          {t('import.selectVendor')}
        </label>
        <Select
          size="large"
          className="w-full max-w-md"
          placeholder={t('import.selectVendor')}
          value={selectedVendorId}
          onChange={setSelectedVendorId}
          options={vendors?.map(v => ({ label: v.name, value: v.id }))}
        />
      </div>

      <div className="mt-6">
        <Dragger {...uploadProps} className="bg-muted/30">
          <p className="ant-upload-drag-icon">
            <InboxOutlined className="text-primary text-5xl" />
          </p>
          <p className="ant-upload-text text-foreground font-medium">
            {t('import.upload.hint')}
          </p>
          <p className="ant-upload-hint text-muted-foreground">
            {t('import.upload.desc')}
          </p>
        </Dragger>
      </div>
    </div>
  );
};
