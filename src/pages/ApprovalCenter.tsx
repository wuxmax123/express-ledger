import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table } from 'antd';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface VendorBatch {
  id: number;
  vendor_id: number;
  file_name: string;
  uploaded_at: string;
  effective_date: string;
  total_channels: number;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  vendors: {
    name: string;
    code: string;
  };
}

const ApprovalCenter = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<VendorBatch | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: batches, isLoading } = useQuery({
    queryKey: ['pending-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_batches')
        .select('*, vendors(name, code)')
        .eq('approval_status', 'pending')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as VendorBatch[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ batchId, action, rejectionReason }: { 
      batchId: number; 
      action: 'approve' | 'reject';
      rejectionReason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('approve-batch', {
        body: { batchId, action, rejectionReason },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-batches'] });
      toast.success(
        variables.action === 'approve' ? '批次已批准' : '批次已拒绝'
      );
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedBatch(null);
    },
    onError: (error: any) => {
      toast.error('操作失败', { description: error.message });
    },
  });

  const handleApprove = (batch: VendorBatch) => {
    approveMutation.mutate({ batchId: batch.id, action: 'approve' });
  };

  const handleRejectClick = (batch: VendorBatch) => {
    setSelectedBatch(batch);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedBatch) {
      approveMutation.mutate({
        batchId: selectedBatch.id,
        action: 'reject',
        rejectionReason,
      });
    }
  };

  const columns = [
    {
      title: '物流商',
      dataIndex: ['vendors', 'name'],
      key: 'vendor',
      render: (name: string, record: VendorBatch) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-muted-foreground">{record.vendors.code}</div>
        </div>
      ),
    },
    {
      title: '文件名',
      dataIndex: 'file_name',
      key: 'file_name',
    },
    {
      title: '上传时间',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '生效日期',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (date: string) => date || '-',
    },
    {
      title: '渠道数量',
      dataIndex: 'total_channels',
      key: 'total_channels',
    },
    {
      title: '状态',
      dataIndex: 'approval_status',
      key: 'status',
      render: (status: string) => {
        const colorMap = {
          pending: 'yellow',
          approved: 'green',
          rejected: 'red',
        };
        const textMap = {
          pending: '待审核',
          approved: '已批准',
          rejected: '已拒绝',
        };
        return (
          <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'outline'}>
            {textMap[status as keyof typeof textMap]}
          </Badge>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: VendorBatch) => (
        <div className="space-x-2">
          <Button
            size="sm"
            onClick={() => handleApprove(record)}
            disabled={approveMutation.isPending}
          >
            批准
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleRejectClick(record)}
            disabled={approveMutation.isPending}
          >
            拒绝
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">审核中心</h1>
      <Card className="p-6">
        <Table
          columns={columns}
          dataSource={batches?.map((b) => ({ ...b, key: b.id }))}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝批次</DialogTitle>
            <DialogDescription>
              请输入拒绝原因，此信息将反馈给上传者
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">拒绝原因</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || approveMutation.isPending}
            >
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalCenter;
