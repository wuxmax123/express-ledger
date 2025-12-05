import { useEffect, useState } from 'react';
import { Progress, Result, Button } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useImportStore } from '@/store/useImportStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import dayjs from 'dayjs';

// Generate batch code: YYYYMMDD-XXX format
const generateBatchCode = () => {
  const dateStr = dayjs().format('YYYYMMDD');
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${dateStr}-${randomSuffix}`;
};

export const ImportProgressStep = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    reset, 
    parsedSheets, 
    selectedVendorId, 
    uploadFileName,
    uploadedBy 
  } = useImportStore();
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchCode, setBatchCode] = useState<string | null>(null);

  useEffect(() => {
    const doImport = async () => {
      try {
        // 1. Generate batch code
        const newBatchCode = generateBatchCode();
        setBatchCode(newBatchCode);
        setProgress(10);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Filter sheets to import (not skipped)
        const sheetsToImport = parsedSheets.filter(s => s.action !== 'skip');
        
        if (sheetsToImport.length === 0) {
          setProgress(100);
          setIsComplete(true);
          return;
        }

        // 2. Create vendor batch record
        const { data: batchData, error: batchError } = await supabase
          .from('vendor_batches')
          .insert({
            vendor_id: selectedVendorId,
            file_name: uploadFileName || 'unknown.xlsx',
            batch_code: newBatchCode,
            uploaded_by: user?.id,
            total_channels: sheetsToImport.length,
            approval_status: 'pending',
            effective_date: parsedSheets[0]?.effectiveDate || null,
            notes: `Imported ${sheetsToImport.length} channels`
          })
          .select()
          .single();

        if (batchError) throw batchError;
        setProgress(30);

        // 3. For each sheet, create channel rate sheet and items
        const totalSheets = sheetsToImport.length;
        for (let i = 0; i < sheetsToImport.length; i++) {
          const sheet = sheetsToImport[i];
          
          // Find channel by code
          let channelId: number | null = null;
          
          if (sheet.channelCode) {
            // Try to find existing channel
            const { data: existingChannel } = await supabase
              .from('shipping_channels')
              .select('id')
              .eq('channel_code', sheet.channelCode)
              .single();
            
            if (existingChannel) {
              channelId = existingChannel.id;
            }
          }

          if (!channelId) {
            // Skip if no channel found
            console.warn(`No channel found for code: ${sheet.channelCode}`);
            continue;
          }

          // Generate version code
          const { data: versionCode } = await supabase.rpc('generate_version_code', {
            p_channel_id: channelId
          });

          // Create channel rate sheet
          const { data: sheetData, error: sheetError } = await supabase
            .from('channel_rate_sheets')
            .insert({
              channel_id: channelId,
              batch_id: batchData.id,
              version_code: versionCode || `V${Date.now()}`,
              effective_date: sheet.effectiveDate || dayjs().format('YYYY-MM-DD'),
              file_name: uploadFileName,
              uploaded_by: user?.id,
              approval_status: 'pending'
            })
            .select()
            .single();

          if (sheetError) {
            console.error('Error creating rate sheet:', sheetError);
            continue;
          }

          // Create rate items from rateCardDetails
          const rateCardDetails = sheet.rateCardDetails || [];
          if (rateCardDetails.length > 0) {
            const rateItems = rateCardDetails.map(item => ({
              sheet_id: sheetData.id,
              country: item.country || '',
              zone: item.zone || null,
              weight_from: item.weightFrom || 0,
              weight_to: item.weightTo || 0,
              price: item.price || 0,
              currency: item.currency || sheet.currency || 'USD',
              eta: item.eta || null
            }));

            const { error: itemsError } = await supabase
              .from('channel_rate_items')
              .insert(rateItems);

            if (itemsError) {
              console.error('Error creating rate items:', itemsError);
            }
          }

          // Update progress
          setProgress(30 + Math.round((i + 1) / totalSheets * 60));
        }

        setProgress(100);
        setIsComplete(true);
        toast.success(`导入成功！批次号: ${newBatchCode}`);
        
      } catch (err: any) {
        console.error('Import error:', err);
        setError(err.message || 'Import failed');
        toast.error('导入失败', { description: err.message });
      }
    };

    doImport();
  }, []);

  const handleViewApproval = () => {
    reset();
    navigate('/rates/approval');
  };

  const handleViewDiff = () => {
    reset();
    navigate('/rates/diff');
  };

  const handleNewImport = () => {
    reset();
  };

  if (error) {
    return (
      <Result
        status="error"
        title="导入失败"
        subTitle={error}
        extra={[
          <Button key="retry" onClick={handleNewImport}>
            重新导入
          </Button>
        ]}
      />
    );
  }

  if (isComplete) {
    return (
      <Result
        status="success"
        icon={<CheckCircleOutlined className="text-green-600" />}
        title={t('import.progress.success')}
        subTitle={
          <div className="space-y-2">
            <p>批次号: <span className="font-mono font-bold">{batchCode}</span></p>
            <p>已提交审核，请到审核中心进行审批</p>
          </div>
        }
        extra={[
          <Button type="primary" key="approval" onClick={handleViewApproval}>
            前往审核中心
          </Button>,
          <Button key="diff" onClick={handleViewDiff}>
            查看差异
          </Button>,
          <Button key="new" onClick={handleNewImport}>
            新建导入
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
      {batchCode && (
        <p className="text-center text-muted-foreground">
          批次号: <span className="font-mono font-bold">{batchCode}</span>
        </p>
      )}
      <Progress
        percent={progress}
        status="active"
        strokeColor={{
          '0%': '#1890ff',
          '100%': '#52c41a',
        }}
      />
      <p className="text-center text-muted-foreground">
        正在导入数据并创建价目表...
      </p>
    </div>
  );
};
