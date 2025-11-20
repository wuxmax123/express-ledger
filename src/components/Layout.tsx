import { Layout as AntLayout, Menu, Button, Dropdown, Avatar } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  UploadOutlined, 
  DiffOutlined, 
  HistoryOutlined,
  ShopOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Content, Sider } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();

  const menuItems: MenuProps['items'] = [
    {
      key: '/rates/import',
      icon: <UploadOutlined />,
      label: t('nav.import'),
      onClick: () => navigate('/rates/import')
    },
    {
      key: '/rates/diff',
      icon: <DiffOutlined />,
      label: t('nav.diff'),
      onClick: () => navigate('/rates/diff')
    },
    {
      key: '/rates/history',
      icon: <HistoryOutlined />,
      label: t('nav.history'),
      onClick: () => navigate('/rates/history/1')
    },
    {
      key: '/rates/browse',
      icon: <DatabaseOutlined />,
      label: t('nav.browse'),
      onClick: () => navigate('/rates/browse')
    },
    {
      key: '/rates/compare',
      icon: <SwapOutlined />,
      label: t('nav.compare'),
      onClick: () => navigate('/rates/compare')
    },
    {
      key: '/vendors',
      icon: <ShopOutlined />,
      label: t('nav.vendors'),
      onClick: () => navigate('/vendors')
    },
    {
      key: '/channels',
      icon: <SettingOutlined />,
      label: t('nav.channels'),
      onClick: () => navigate('/channels')
    },
    {
      key: '/approval',
      icon: <CheckCircleOutlined />,
      label: t('nav.approval'),
      onClick: () => navigate('/approval')
    }
  ];

  const languageItems: MenuProps['items'] = [
    {
      key: 'zh',
      label: '中文',
      onClick: () => i18n.changeLanguage('zh')
    },
    {
      key: 'en',
      label: 'English',
      onClick: () => i18n.changeLanguage('en')
    }
  ];

  const userMenuItems: MenuProps['items'] = user ? [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      onClick: () => signOut().then(() => navigate('/login'))
    }
  ] : [
    {
      key: 'login',
      icon: <LoginOutlined />,
      label: t('auth.login'),
      onClick: () => navigate('/login')
    }
  ];

  return (
    <AntLayout className="min-h-screen">
      <Header className="flex items-center justify-between px-6 bg-primary">
        <div className="flex items-center gap-4">
          <div className="text-white text-xl font-bold">
            Logistics Rate Management
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Dropdown menu={{ items: languageItems }} placement="bottomRight">
            <Button type="text" icon={<GlobalOutlined />} className="text-white">
              {i18n.language === 'zh' ? '中文' : 'English'}
            </Button>
          </Dropdown>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />} className="text-white">
              {user ? user.email : t('auth.login')}
            </Button>
          </Dropdown>
        </div>
      </Header>
      <AntLayout>
        <Sider width={220} className="bg-card">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            className="h-full border-r-0"
          />
        </Sider>
        <Content className="p-6 bg-background">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
