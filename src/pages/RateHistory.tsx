import { Card, Select, Descriptions, Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import dayjs from 'dayjs';

const RateHistory = () => {
  const { t } = useTranslation();
  const { channelId } = useParams();

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.getChannels()
  });

  const { data: versions } = useQuery({
    queryKey: ['channel-versions', channelId],
    queryFn: () => api.getChannelVersions(Number(channelId)),
    enabled: !!channelId
  });

  const currentVersion = versions?.find(v => v.status === 'active');

  const columns = [
    {
      title: 'Version',
      dataIndex: 'versionCode',
      key: 'versionCode'
    },
    {
      title: 'File Name',
      dataIndex: 'fileName',
      key: 'fileName'
    },
    {
      title: 'Effective Date',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: 'Uploaded By',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status}
        </Tag>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">{t('history.title')}</h1>

      <Card className="mb-6">
        <div className="mb-4">
          <label className="block mb-2 font-medium text-foreground">
            {t('nav.channels')}
          </label>
          <Select
            className="w-full max-w-md"
            placeholder="Select Channel"
            value={Number(channelId)}
            options={channels?.map(c => ({ label: c.name, value: c.id }))}
          />
        </div>

        {currentVersion && (
          <>
            <div className="mb-4 font-medium text-lg text-foreground">
              {t('history.currentVersion')}
            </div>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Version">
                {currentVersion.versionCode}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color="green">{currentVersion.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Effective Date">
                {dayjs(currentVersion.effectiveDate).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="Uploaded By">
                {currentVersion.uploadedBy}
              </Descriptions.Item>
              <Descriptions.Item label="File Name" span={2}>
                {currentVersion.fileName}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      <Card>
        <div className="mb-4 font-medium text-lg text-foreground">
          All Versions
        </div>
        <Table
          columns={columns}
          dataSource={versions?.map((v, i) => ({ ...v, key: i }))}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default RateHistory;
