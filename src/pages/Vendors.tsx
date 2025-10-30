import { Card, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Vendor } from '@/types';

const Vendors = () => {
  const { t } = useTranslation();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: api.getVendors
  });

  const columns = [
    {
      title: 'Vendor Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Vendor) => (
        <div>
          <div className="font-medium text-foreground">{name}</div>
          <div className="text-sm text-muted-foreground">{record.code}</div>
        </div>
      )
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue">{code}</Tag>
    },
    {
      title: 'Contact',
      dataIndex: 'contactInfo',
      key: 'contactInfo'
    },
    {
      title: 'Channels',
      key: 'channels',
      render: () => <Tag color="green">2 Active</Tag>
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">{t('nav.vendors')}</h1>
      <Card>
        <Table
          columns={columns}
          dataSource={vendors?.map((v, i) => ({ ...v, key: i }))}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default Vendors;
