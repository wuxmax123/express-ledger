import { Card, Table, Select, DatePicker, Button, Space, Tag, Modal, Tabs, message } from 'antd';
import { DownloadOutlined, FileTextOutlined, CopyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { exportToCsv } from '@/services/excelParser';
import { RateDiff, ChannelNoticeSummary } from '@/types';
import dayjs from 'dayjs';
import { useState } from 'react';
import jsPDF from 'jspdf';

const { RangePicker } = DatePicker;

const RateDiffPage = () => {
  const { t } = useTranslation();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);
  const [noticeSummaries, setNoticeSummaries] = useState<ChannelNoticeSummary[]>([]);
  const [chineseNotice, setChineseNotice] = useState('');
  const [englishNotice, setEnglishNotice] = useState('');
  
  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: api.getVendors
  });

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.getChannels()
  });

  const { data: diffs } = useQuery({
    queryKey: ['rate-diffs'],
    queryFn: () => api.getRateDiffs({})
  });

  const generateNoticeMutation = useMutation({
    mutationFn: (channelIds: number[]) => api.generateNotice(channelIds),
    onSuccess: (data: ChannelNoticeSummary[]) => {
      setNoticeSummaries(data);
      setChineseNotice(generateChineseNotice(data));
      setEnglishNotice(generateEnglishNotice(data));
      setNoticeModalVisible(true);
    }
  });

  const columns = [
    {
      title: t('diff.country'),
      dataIndex: 'country',
      key: 'country',
      width: 100
    },
    {
      title: t('diff.zone'),
      dataIndex: 'zone',
      key: 'zone',
      width: 100
    },
    {
      title: t('diff.weightRange'),
      key: 'weightRange',
      width: 150,
      render: (_: any, record: RateDiff) => 
        `${record.weightFrom} - ${record.weightTo} kg`
    },
    {
      title: t('diff.oldPrice'),
      dataIndex: 'oldPrice',
      key: 'oldPrice',
      width: 120,
      render: (price: number) => `¥${price.toFixed(2)}`
    },
    {
      title: t('diff.newPrice'),
      dataIndex: 'newPrice',
      key: 'newPrice',
      width: 120,
      render: (price: number) => `¥${price.toFixed(2)}`
    },
    {
      title: t('diff.delta'),
      dataIndex: 'delta',
      key: 'delta',
      width: 100,
      render: (delta: number) => (
        <span className={delta > 0 ? 'text-red-600' : 'text-green-600'}>
          {delta > 0 ? '+' : ''}{delta.toFixed(2)}
        </span>
      )
    },
    {
      title: t('diff.deltaPct'),
      dataIndex: 'deltaPct',
      key: 'deltaPct',
      width: 100,
      render: (pct: number) => (
        <Tag color={pct > 0 ? 'red' : 'green'}>
          {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
        </Tag>
      )
    },
    {
      title: t('diff.effectiveDate'),
      key: 'effectiveDate',
      width: 120,
      render: () => dayjs().format('YYYY-MM-DD')
    }
  ];

  const generateChineseNotice = (summaries: ChannelNoticeSummary[]) => {
    const today = dayjs().format('YYYY年MM月DD日');
    const effectiveDate = summaries[0]?.effectiveDate ? dayjs(summaries[0].effectiveDate).format('YYYY年MM月DD日') : '';
    
    let tableRows = summaries.map(s => 
      `| ${s.channelName} | ${s.avgChangePct.toFixed(2)}% | ${s.increaseCount} | ${s.decreaseCount} | ${s.maxIncreasePct.toFixed(2)}% | ${s.maxDecreasePct.toFixed(2)}% |`
    ).join('\n');

    let summaryText = summaries.map(s => 
      `**${s.channelName}**:\n${s.summaryLines.join('\n')}`
    ).join('\n\n');

    return `【价格调整公告】

尊敬的客户您好：

由于物流商渠道价格调整，我司将于 **${effectiveDate}** 起对以下渠道进行价格更新：

| 渠道 | 平均涨幅 | 涨价区间数 | 降价区间数 | 最大涨幅 | 最大降幅 |
|------|-----------|-------------|-------------|------------|------------|
${tableRows}

**主要变化摘要：**

${summaryText}

如有疑问，请联系我们的客服团队。

Airlyle Fulfillment  
${today}`;
  };

  const generateEnglishNotice = (summaries: ChannelNoticeSummary[]) => {
    const today = dayjs().format('MMMM DD, YYYY');
    const effectiveDate = summaries[0]?.effectiveDate ? dayjs(summaries[0].effectiveDate).format('MMMM DD, YYYY') : '';
    
    let tableRows = summaries.map(s => 
      `| ${s.channelName} | ${s.avgChangePct.toFixed(2)}% | ${s.increaseCount} | ${s.decreaseCount} | ${s.maxIncreasePct.toFixed(2)}% | ${s.maxDecreasePct.toFixed(2)}% |`
    ).join('\n');

    let summaryText = summaries.map(s => 
      `**${s.channelName}**:\nMajor increases: European zones 1-5kg\nMajor decreases: US zones 5-10kg`
    ).join('\n\n');

    return `[Rate Adjustment Notice]

Dear Valued Customer,

Due to carrier rate adjustments, we will be updating pricing for the following channels effective **${effectiveDate}**:

| Channel | Avg Change | Increases | Decreases | Max Increase | Max Decrease |
|---------|------------|-----------|-----------|--------------|--------------|
${tableRows}

**Summary of Changes:**

${summaryText}

If you have any questions, please contact our customer service team.

Airlyle Fulfillment  
${today}`;
  };

  const handleGenerateNotice = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select at least one channel');
      return;
    }
    
    const selectedChannelIds = Array.from(new Set(
      selectedRowKeys
        .map(key => diffs?.[Number(key)]?.channelId)
        .filter(Boolean)
    )) as number[];
    
    generateNoticeMutation.mutate(selectedChannelIds);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Copied to clipboard!');
    });
  };

  const handleDownloadPDF = (text: string, filename: string) => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 15, 15);
    doc.save(filename);
    message.success('PDF downloaded!');
  };

  const handleExport = () => {
    if (diffs) {
      const exportData = diffs.map(d => ({
        Country: d.country,
        Zone: d.zone,
        'Weight From': d.weightFrom,
        'Weight To': d.weightTo,
        'Old Price': d.oldPrice,
        'New Price': d.newPrice,
        'Delta': d.delta,
        'Delta %': d.deltaPct
      }));
      exportToCsv(exportData, 'rate-differences.csv');
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('diff.title')}</h1>
        <Space>
          <Button 
            type="default"
            icon={<FileTextOutlined />}
            onClick={handleGenerateNotice}
            disabled={selectedRowKeys.length === 0}
          >
            Generate Notice
          </Button>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            {t('diff.export')}
          </Button>
        </Space>
      </div>

      <Card className="mb-6">
        <div className="mb-4 font-medium text-foreground">{t('diff.filters')}</div>
        <Space wrap className="w-full">
          <Select
            placeholder={t('diff.vendor')}
            className="w-48"
            options={vendors?.map(v => ({ label: v.name, value: v.id }))}
          />
          <Select
            placeholder={t('diff.channel')}
            className="w-48"
            options={channels?.map(c => ({ label: c.name, value: c.id }))}
          />
          <RangePicker className="w-64" />
          <Button type="primary">{t('common.search')}</Button>
          <Button>{t('common.reset')}</Button>
        </Space>
      </Card>

      <Card>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={diffs?.map((d, i) => ({ ...d, key: i }))}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title="Generate Rate Adjustment Notice"
        open={noticeModalVisible}
        onCancel={() => setNoticeModalVisible(false)}
        width={800}
        footer={null}
      >
        <Tabs
          items={[
            {
              key: 'chinese',
              label: '中文版本',
              children: (
                <div>
                  <textarea
                    value={chineseNotice}
                    onChange={(e) => setChineseNotice(e.target.value)}
                    className="w-full h-96 p-4 border rounded-md font-mono text-sm"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                  <Space className="mt-4">
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyToClipboard(chineseNotice)}
                    >
                      Copy to Clipboard
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadPDF(chineseNotice, 'notice-chinese.pdf')}
                    >
                      Download PDF
                    </Button>
                  </Space>
                </div>
              ),
            },
            {
              key: 'english',
              label: 'English Version',
              children: (
                <div>
                  <textarea
                    value={englishNotice}
                    onChange={(e) => setEnglishNotice(e.target.value)}
                    className="w-full h-96 p-4 border rounded-md font-mono text-sm"
                    style={{ whiteSpace: 'pre-wrap' }}
                  />
                  <Space className="mt-4">
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyToClipboard(englishNotice)}
                    >
                      Copy to Clipboard
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadPDF(englishNotice, 'notice-english.pdf')}
                    >
                      Download PDF
                    </Button>
                  </Space>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default RateDiffPage;
