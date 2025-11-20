import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { parseExcelFile } from '@/services/excelParser';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ChannelBulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedChannel {
  channel_code: string;
  volume_weight_divisor?: number;
  max_length?: number;
  max_width?: number;
  max_height?: number;
  max_weight?: number;
  max_single_side?: number;
  dimension_limit_notes?: string;
  // Conditional rules
  use_conditional?: string;
  cond_weight_max?: number;
  cond_base_divisor?: number;
  cond_ratio_threshold?: number;
  cond_exceeds_divisor?: number;
}

export function ChannelBulkImportDialog({
  open,
  onOpenChange,
}: ChannelBulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        toast.error('请上传 Excel 文件 (.xlsx 或 .xls)');
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        '渠道代码': 'SAMPLE-001',
        '泡比': 5000,
        '最大长度': 100,
        '最大宽度': 80,
        '最大高度': 60,
        '最大重量': 30,
        '单边最大': 150,
        '备注': '示例数据',
        '启用条件规则': '是',
        '条件-重量阈值': 2,
        '条件-基准泡比': 6000,
        '条件-比率阈值': 2,
        '条件-超出时泡比': 8000,
      },
      {
        '渠道代码': 'SAMPLE-002',
        '泡比': 6000,
        '最大长度': 120,
        '最大宽度': 100,
        '最大高度': 80,
        '最大重量': 50,
        '单边最大': 180,
        '备注': '',
        '启用条件规则': '否',
        '条件-重量阈值': '',
        '条件-基准泡比': '',
        '条件-比率阈值': '',
        '条件-超出时泡比': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '渠道规则模板');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, 
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ];

    XLSX.writeFile(wb, '渠道规则导入模板.xlsx');
    toast.success('模板已下载');
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('请选择要导入的文件');
      return;
    }

    setImporting(true);
    setProgress(0);
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      // Parse Excel file
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

      if (jsonData.length === 0) {
        toast.error('Excel 文件中没有数据');
        setImporting(false);
        return;
      }

      console.log('Parsed Excel data:', jsonData);

      // Map Excel columns to database fields
      const parsedChannels: ParsedChannel[] = jsonData.map((row) => {
        const useConditional = row['启用条件规则'] === '是' || row['启用条件规则'] === 'yes' || row['启用条件规则'] === 'Y';
        
        return {
          channel_code: String(row['渠道代码'] || '').trim(),
          volume_weight_divisor: row['泡比'] ? Number(row['泡比']) : undefined,
          max_length: row['最大长度'] ? Number(row['最大长度']) : undefined,
          max_width: row['最大宽度'] ? Number(row['最大宽度']) : undefined,
          max_height: row['最大高度'] ? Number(row['最大高度']) : undefined,
          max_weight: row['最大重量'] ? Number(row['最大重量']) : undefined,
          max_single_side: row['单边最大'] ? Number(row['单边最大']) : undefined,
          dimension_limit_notes: row['备注'] ? String(row['备注']) : undefined,
          use_conditional: useConditional ? 'yes' : 'no',
          cond_weight_max: row['条件-重量阈值'] ? Number(row['条件-重量阈值']) : undefined,
          cond_base_divisor: row['条件-基准泡比'] ? Number(row['条件-基准泡比']) : undefined,
          cond_ratio_threshold: row['条件-比率阈值'] ? Number(row['条件-比率阈值']) : undefined,
          cond_exceeds_divisor: row['条件-超出时泡比'] ? Number(row['条件-超出时泡比']) : undefined,
        };
      });

      console.log('Parsed channels:', parsedChannels);

      // Fetch existing channels to match by channel_code
      const { data: existingChannels, error: fetchError } = await supabase
        .from('shipping_channels')
        .select('id, channel_code');

      if (fetchError) throw fetchError;

      const channelMap = new Map(
        existingChannels?.map((ch) => [ch.channel_code, ch.id]) || []
      );

      // Update each channel
      const total = parsedChannels.length;
      for (let i = 0; i < total; i++) {
        const channel = parsedChannels[i];
        setProgress(((i + 1) / total) * 100);

        if (!channel.channel_code) {
          errors.push(`第 ${i + 2} 行: 缺少渠道代码`);
          failedCount++;
          continue;
        }

        const channelId = channelMap.get(channel.channel_code);
        if (!channelId) {
          errors.push(`第 ${i + 2} 行: 渠道代码 "${channel.channel_code}" 不存在`);
          failedCount++;
          continue;
        }

        try {
          const updateData: any = {
            volume_weight_divisor: channel.volume_weight_divisor || 5000,
            max_length: channel.max_length || null,
            max_width: channel.max_width || null,
            max_height: channel.max_height || null,
            max_weight: channel.max_weight || null,
            max_single_side: channel.max_single_side || null,
            dimension_limit_notes: channel.dimension_limit_notes || null,
          };

          // Add conditional rules if enabled
          if (channel.use_conditional === 'yes') {
            if (!channel.cond_weight_max || !channel.cond_base_divisor || 
                !channel.cond_ratio_threshold || !channel.cond_exceeds_divisor) {
              errors.push(`第 ${i + 2} 行: 启用了条件规则但缺少必填参数`);
              failedCount++;
              continue;
            }

            updateData.conditional_rules = {
              type: 'conditional_divisor',
              rules: [
                {
                  condition: {
                    weight_max: channel.cond_weight_max,
                    base_divisor: channel.cond_base_divisor,
                    volume_ratio_threshold: channel.cond_ratio_threshold,
                  },
                  actions: {
                    if_exceeds: {
                      divisor: channel.cond_exceeds_divisor,
                    },
                    if_not_exceeds: {
                      use: 'actual_weight',
                    },
                  },
                },
              ],
              default_behavior: 'compare_and_take_larger',
            };
          } else {
            updateData.conditional_rules = null;
          }

          const { error: updateError } = await supabase
            .from('shipping_channels')
            .update(updateData)
            .eq('id', channelId);

          if (updateError) throw updateError;
          successCount++;
        } catch (error: any) {
          console.error(`Error updating channel ${channel.channel_code}:`, error);
          errors.push(`第 ${i + 2} 行: ${error.message}`);
          failedCount++;
        }
      }

      setResults({ success: successCount, failed: failedCount, errors });
      
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['shipping-channels'] });
        toast.success(`成功导入 ${successCount} 个渠道规则`);
      }
      
      if (failedCount > 0) {
        toast.error(`${failedCount} 个渠道导入失败`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('导入失败: ' + error.message);
      setResults({ success: 0, failed: 0, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            批量导入渠道规则
          </DialogTitle>
          <DialogDescription>
            从 Excel 文件导入多个渠道的泡比和尺寸限制配置
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>第 1 步：下载模板</Label>
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="w-full mt-2"
              >
                <Download className="h-4 w-4 mr-2" />
                下载 Excel 模板
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                下载模板并填写渠道代码、泡比、尺寸限制和条件规则参数
              </p>
            </div>

            <div>
              <Label htmlFor="excel-upload">第 2 步：上传填写好的 Excel</Label>
              <div className="flex items-center gap-3 mt-2">
                <Input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={importing}
                />
                {file && (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
              </div>
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  已选择: {file.name}
                </p>
              )}
            </div>
          </div>

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>导入进度</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {results && (
            <Alert variant={results.failed > 0 ? 'destructive' : 'default'}>
              <div className="flex items-start gap-2">
                {results.failed > 0 ? (
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 mt-0.5 text-green-600" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    <div className="font-medium mb-2">
                      导入完成: 成功 {results.success} 个，失败 {results.failed} 个
                    </div>
                    {results.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">错误详情:</p>
                        <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                          {results.errors.slice(0, 10).map((error, idx) => (
                            <li key={idx} className="text-xs">
                              • {error}
                            </li>
                          ))}
                          {results.errors.length > 10 && (
                            <li className="text-xs italic">
                              ...还有 {results.errors.length - 10} 个错误
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={importing}>
              {results ? '关闭' : '取消'}
            </Button>
            {!results && (
              <Button onClick={handleImport} disabled={!file || importing}>
                <Upload className="h-4 w-4 mr-2" />
                {importing ? '导入中...' : '开始导入'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
