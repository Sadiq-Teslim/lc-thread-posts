import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Badge,
  Button,
  SimpleGrid,
  ThemeIcon,
  Box,
  Skeleton,
  Alert,
} from '@mantine/core';
import {
  IconSend,
  IconPlus,
  IconCalendar,
  IconTrendingUp,
  IconSettings,
  IconBrandTwitter,
  IconAlertCircle,
  IconRefresh,
} from '@tabler/icons-react';
import { useSessionStore } from '../store/sessionStore';
import { useProgressStore } from '../store/progressStore';
import { apiService, getErrorMessage } from '../services/api';
import { toast } from '../utils/toast';
import classes from './HomePage.module.css';

export function HomePage() {
  const navigate = useNavigate();
  const { hasValidSession } = useSessionStore();
  const { currentDay, hasActiveThread, nextDay, setProgress, resetProgress } = useProgressStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    if (!hasValidSession()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getProgress();
      if (response.success && response.data) {
        setProgress(response.data);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResetProgress = async () => {
    try {
      const response = await apiService.resetProgress();
      if (response.success) {
        resetProgress();
        toast.success({
          title: 'Progress Reset',
          message: 'You can now start a fresh thread!',
        });
      }
    } catch (err) {
      toast.error({
        title: 'Reset Failed',
        message: getErrorMessage(err),
      });
    }
  };

  if (!hasValidSession()) {
    return (
      <Container size="md" py="xl">
        <Card withBorder p="xl" radius="lg" className={classes.welcomeCard}>
          <Stack align="center" gap="lg">
            <ThemeIcon size={80} radius="xl" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              <IconBrandTwitter size={40} />
            </ThemeIcon>
            <Title order={2} ta="center">
              Welcome to LC Thread Poster
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              Post your daily LeetCode solutions to X/Twitter automatically. 
              Configure your API keys to get started.
            </Text>
            <Button
              size="lg"
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
              leftSection={<IconSettings size={20} />}
              onClick={() => navigate('/settings')}
            >
              Configure API Keys
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="xs">
            Dashboard
          </Title>
          <Text c="dimmed">
            Manage your LeetCode posting journey
          </Text>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Unable to load progress"
            color="red"
            variant="light"
          >
            {error}
            <Button
              variant="subtle"
              color="red"
              size="xs"
              mt="sm"
              leftSection={<IconRefresh size={14} />}
              onClick={fetchProgress}
            >
              Try Again
            </Button>
          </Alert>
        )}

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          <Card withBorder p="lg" radius="lg" className={classes.statCard}>
            {loading ? (
              <Skeleton height={100} />
            ) : (
              <>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed" fw={500}>
                    Current Day
                  </Text>
                  <ThemeIcon variant="light" color="blue" size="lg" radius="md">
                    <IconCalendar size={18} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" fw={700} className={classes.statValue}>
                  {hasActiveThread ? currentDay : '—'}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  {hasActiveThread ? 'Days of consistent posting' : 'Start a thread to begin'}
                </Text>
              </>
            )}
          </Card>

          <Card withBorder p="lg" radius="lg" className={classes.statCard}>
            {loading ? (
              <Skeleton height={100} />
            ) : (
              <>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed" fw={500}>
                    Next Day
                  </Text>
                  <ThemeIcon variant="light" color="cyan" size="lg" radius="md">
                    <IconTrendingUp size={18} />
                  </ThemeIcon>
                </Group>
                <Text size="xl" fw={700} className={classes.statValue}>
                  Day {nextDay}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Ready to post your next solution
                </Text>
              </>
            )}
          </Card>

          <Card withBorder p="lg" radius="lg" className={classes.statCard}>
            {loading ? (
              <Skeleton height={100} />
            ) : (
              <>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" c="dimmed" fw={500}>
                    Thread Status
                  </Text>
                </Group>
                <Badge
                  size="lg"
                  variant="gradient"
                  gradient={
                    hasActiveThread
                      ? { from: 'green', to: 'teal' }
                      : { from: 'gray', to: 'gray' }
                  }
                >
                  {hasActiveThread ? 'Active' : 'No Thread'}
                </Badge>
                <Text size="xs" c="dimmed" mt="xs">
                  {hasActiveThread
                    ? 'Your thread is ready for updates'
                    : 'Create a thread to start posting'}
                </Text>
              </>
            )}
          </Card>
        </SimpleGrid>

        {/* Quick Actions */}
        <Box>
          <Title order={3} mb="md">
            Quick Actions
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Card
              withBorder
              p="xl"
              radius="lg"
              className={classes.actionCard}
              onClick={() => {
                if (hasActiveThread) {
                  navigate('/post');
                } else {
                  toast.info({
                    title: 'No Active Thread',
                    message: 'Please start a thread first before posting solutions.',
                  });
                }
              }}
              style={{ 
                cursor: hasActiveThread ? 'pointer' : 'not-allowed',
                opacity: hasActiveThread ? 1 : 0.7,
              }}
            >
              <Group>
                <ThemeIcon
                  size={50}
                  radius="md"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                >
                  <IconSend size={26} />
                </ThemeIcon>
                <Box>
                  <Text fw={600} size="lg">
                    Post Solution
                  </Text>
                  <Text size="sm" c="dimmed">
                    Share your latest LeetCode solution
                  </Text>
                </Box>
              </Group>
              {!hasActiveThread && (
                <Badge mt="md" variant="light" color="gray">
                  Requires active thread
                </Badge>
              )}
            </Card>

            <Card
              withBorder
              p="xl"
              radius="lg"
              className={classes.actionCard}
              onClick={() => navigate('/start-thread')}
              style={{ cursor: 'pointer' }}
            >
              <Group>
                <ThemeIcon
                  size={50}
                  radius="md"
                  variant="gradient"
                  gradient={{ from: 'grape', to: 'pink' }}
                >
                  <IconPlus size={26} />
                </ThemeIcon>
                <Box>
                  <Text fw={600} size="lg">
                    {hasActiveThread ? 'Start New Thread' : 'Start Thread'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {hasActiveThread
                      ? 'Reset and begin a fresh journey'
                      : 'Begin your LeetCode posting journey'}
                  </Text>
                </Box>
              </Group>
            </Card>
          </SimpleGrid>
        </Box>

        {/* Reset Progress */}
        {hasActiveThread && (
          <Card withBorder p="lg" radius="lg">
            <Group justify="space-between" align="center">
              <Box>
                <Text fw={500}>Reset Progress</Text>
                <Text size="sm" c="dimmed">
                  Start fresh with a new thread (this won't delete your tweets)
                </Text>
              </Box>
              <Button
                variant="subtle"
                color="red"
                onClick={handleResetProgress}
              >
                Reset
              </Button>
            </Group>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
