import { Card, Table, Select, DatePicker, Button, Space, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { exportToCsv } from '@/services/excelParser';
import { RateDiff } from '@/types';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const RateDiffPage = () => {
  const { t } = useTranslation();
  
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">{t('diff.title')}</h1>
        <Button 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          {t('diff.export')}
        </Button>
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
          columns={columns}
          dataSource={diffs?.map((d, i) => ({ ...d, key: i }))}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default RateDiffPage;
