import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  useMantineColorScheme,
  ActionIcon,
  Avatar,
  Menu,
  Divider,
  Badge,
  Box,
  Tooltip,
  Loader,
  UnstyledButton,
  Stack,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHome,
  IconSettings,
  IconSend,
  IconPlus,
  IconSun,
  IconMoon,
  IconLogout,
  IconBrandTwitter,
  IconCode,
  IconChevronRight,
} from '@tabler/icons-react';
import { useSessionStore } from '../../store/sessionStore';
import { useProgressStore } from '../../store/progressStore';
import { apiService, getErrorMessage } from '../../services/api';
import { toast } from '../../utils/toast';
import classes from './AppLayout.module.css';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Home', icon: IconHome, path: '/', requiresAuth: true },
  { label: 'Post Solution', icon: IconSend, path: '/post', requiresAuth: true },
  { label: 'Start Thread', icon: IconPlus, path: '/start-thread', requiresAuth: true },
  { label: 'Settings', icon: IconSettings, path: '/settings', requiresAuth: false },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { hasValidSession, clearSession, sessionId } = useSessionStore();
  const { currentDay, hasActiveThread, setProgress } = useProgressStore();
  
  const [userInfo, setUserInfo] = useState<{ username: string; name: string; profile_image_url: string | null } | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  const isAuthenticated = hasValidSession();

  // Fetch user info when session is valid
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!isAuthenticated) {
        setUserInfo(null);
        return;
      }

      setLoadingUser(true);
      try {
        const response = await apiService.getUserInfo();
        if (response.success && response.data) {
          setUserInfo(response.data);
        }
      } catch {
        // Silently fail - user info is not critical
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserInfo();
  }, [isAuthenticated, sessionId]);

  // Fetch progress when session is valid
  useEffect(() => {
    const fetchProgress = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await apiService.getProgress();
        if (response.success && response.data) {
          setProgress(response.data);
        }
      } catch {
        // Silently fail
      }
    };

    fetchProgress();
  }, [isAuthenticated, sessionId, setProgress]);

  const handleLogout = async () => {
    try {
      await apiService.destroySession();
      clearSession();
      setUserInfo(null);
      toast.success({
        title: 'Logged Out',
        message: 'Your credentials have been securely removed.',
      });
      navigate('/settings');
    } catch (error) {
      toast.error({
        title: 'Error',
        message: getErrorMessage(error),
      });
    }
  };

  const handleNavClick = (path: string, requiresAuth: boolean) => {
    if (requiresAuth && !isAuthenticated) {
      toast.warning({
        title: 'Configuration Required',
        message: 'Please configure your API keys first.',
      });
      navigate('/settings');
    } else {
      navigate(path);
    }
    close();
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header className={classes.header}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              <Group gap="xs">
                <Box className={classes.logoIcon}>
                  <IconCode size={24} stroke={2} color="white" />
                </Box>
                <Text
                  size="xl"
                  fw={700}
                  className={classes.logoText}
                  visibleFrom="xs"
                >
                  LC Thread Poster
                </Text>
              </Group>
            </Link>
          </Group>

          <Group gap="sm">
            {isAuthenticated && hasActiveThread && (
              <Tooltip label={`Currently on Day ${currentDay}`}>
                <Badge
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                  size="lg"
                  visibleFrom="sm"
                >
                  Day {currentDay}
                </Badge>
              </Tooltip>
            )}

            <Tooltip label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => toggleColorScheme()}
                aria-label="Toggle color scheme"
              >
                {colorScheme === 'dark' ? (
                  <IconSun size={20} stroke={1.5} />
                ) : (
                  <IconMoon size={20} stroke={1.5} />
                )}
              </ActionIcon>
            </Tooltip>

            {isAuthenticated && (
              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <UnstyledButton className={classes.userButton}>
                    {loadingUser ? (
                      <Loader size="sm" />
                    ) : (
                      <Group gap="xs">
                        <Avatar
                          src={userInfo?.profile_image_url}
                          alt={userInfo?.name}
                          radius="xl"
                          size="sm"
                          color="blue"
                        >
                          {userInfo?.name?.[0] || 'U'}
                        </Avatar>
                        <Text size="sm" fw={500} visibleFrom="sm">
                          {userInfo?.name || 'User'}
                        </Text>
                      </Group>
                    )}
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                  {userInfo && (
                    <>
                      <Menu.Label>
                        <Group gap="xs">
                          <IconBrandTwitter size={14} />
                          @{userInfo.username}
                        </Group>
                      </Menu.Label>
                      <Divider my="xs" />
                    </>
                  )}
                  <Menu.Item
                    leftSection={<IconSettings size={14} />}
                    onClick={() => navigate('/settings')}
                  >
                    Settings
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={14} />}
                    onClick={handleLogout}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" className={classes.navbar}>
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed" tt="uppercase" mb="xs">
            Navigation
          </Text>
          
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isDisabled = item.requiresAuth && !isAuthenticated;
            
            return (
              <NavLink
                key={item.path}
                label={item.label}
                leftSection={<item.icon size={20} stroke={1.5} />}
                rightSection={
                  isDisabled ? (
                    <Badge size="xs" variant="light" color="gray">
                      Locked
                    </Badge>
                  ) : (
                    <IconChevronRight
                      size={14}
                      stroke={1.5}
                      style={{
                        opacity: isActive ? 1 : 0,
                        transition: 'opacity 150ms',
                      }}
                    />
                  )
                }
                active={isActive}
                onClick={() => handleNavClick(item.path, item.requiresAuth)}
                className={classes.navLink}
                style={{
                  borderRadius: rem(8),
                  opacity: isDisabled ? 0.6 : 1,
                }}
              />
            );
          })}
        </Stack>

        {isAuthenticated && (
          <>
            <Divider my="md" />
            <Box className={classes.statsCard}>
              <Text size="xs" fw={500} c="dimmed" tt="uppercase" mb="sm">
                Thread Status
              </Text>
              {hasActiveThread ? (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Current Day</Text>
                    <Badge variant="light" color="blue">
                      {currentDay}
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Status</Text>
                    <Badge variant="light" color="green">
                      Active
                    </Badge>
                  </Group>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No active thread. Start one to begin posting!
                </Text>
              )}
            </Box>
          </>
        )}
      </AppShell.Navbar>

      <AppShell.Main className={classes.main}>
        <Box className={classes.content}>{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
