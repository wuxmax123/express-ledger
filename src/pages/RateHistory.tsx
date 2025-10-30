import { Card, Select, Descriptions, Table, Tag, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

const RateHistory = () => {
  const { t } = useTranslation();
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>(
    channelId ? [Number(channelId)] : []
  );

  // Update selected channels when URL param changes
  useEffect(() => {
    if (channelId) {
      setSelectedChannelIds([Number(channelId)]);
    }
  }, [channelId]);

  const { data: channels } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.getChannels()
  });

  // Fetch versions for all selected channels in a single query
  const { data: allVersionsData } = useQuery({
    queryKey: ['multi-channel-versions', selectedChannelIds],
    queryFn: async () => {
      if (selectedChannelIds.length === 0) return {};
      
      const results = await Promise.all(
        selectedChannelIds.map(async (id) => {
          try {
            const versions = await api.getChannelVersions(id);
            return { id, versions };
          } catch (error) {
            console.error(`Failed to fetch versions for channel ${id}:`, error);
            return { id, versions: [] };
          }
        })
      );
      
      return results.reduce((acc, { id, versions }) => {
        acc[id] = versions;
        return acc;
      }, {} as Record<number, any[]>);
    },
    enabled: selectedChannelIds.length > 0
  });

  const handleChannelChange = (ids: number[]) => {
    setSelectedChannelIds(ids);
    if (ids.length === 1) {
      navigate(`/rates/history/${ids[0]}`);
    } else if (ids.length > 1) {
      navigate(`/rates/history/${ids[0]}`);
    }
  };

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
            {t('nav.channels')} (支持多选)
          </label>
          <Select
            mode="multiple"
            className="w-full"
            placeholder="Select Channels"
            value={selectedChannelIds}
            onChange={handleChannelChange}
            options={channels?.map(c => ({ label: c.name, value: c.id }))}
            maxTagCount="responsive"
          />
        </div>
      </Card>

      {selectedChannelIds.length > 0 && allVersionsData && (
        <Tabs
          items={selectedChannelIds.map((id) => {
            const channel = channels?.find(c => c.id === id);
            const versions = allVersionsData[id] || [];
            const currentVersion = versions.find(v => v.status === 'active');

            return {
              key: String(id),
              label: channel?.name || `Channel ${id}`,
              children: (
                <div>
                  {currentVersion && (
                    <Card className="mb-6">
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
                    </Card>
                  )}

                  <Card>
                    <div className="mb-4 font-medium text-lg text-foreground">
                      All Versions
                    </div>
                    <Table
                      columns={columns}
                      dataSource={versions.map((v, i) => ({ ...v, key: i }))}
                      pagination={{ pageSize: 10 }}
                    />
                  </Card>
                </div>
              )
            };
          })}
        />
      )}

      {selectedChannelIds.length === 0 && (
        <Card>
          <div className="text-center py-8 text-muted-foreground">
            请选择至少一个渠道以查看版本历史
          </div>
        </Card>
      )}
    </div>
  );
};

export default RateHistory;
