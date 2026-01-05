import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  Textarea,
  Button,
  Group,
  Box,
  Badge,
  Progress,
  Alert,
  ThemeIcon,
  Paper,
  Divider,
  Modal,
  TextInput,
  Tabs,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconEye,
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
  IconArrowLeft,
  IconAlertTriangle,
  IconRefresh,
  IconLink,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useProgressStore } from "../store/progressStore";
import { apiService, getErrorMessage } from "../services/api";
import { toast } from "../utils/toast";
import classes from "./StartThreadPage.module.css";

const MAX_CHARS = 280;

export function StartThreadPage() {
  const navigate = useNavigate();
  const { hasActiveThread, currentDay, setProgress, resetProgress } =
    useProgressStore();

  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);
  const [tweetUrl, setTweetUrl] = useState<string | null>(null);
  const [
    confirmModalOpened,
    { open: openConfirmModal, close: closeConfirmModal },
  ] = useDisclosure(false);
  const [continueLoading, setContinueLoading] = useState(false);

  const form = useForm({
    initialValues: {
      intro_text: "",
    },
    validate: {
      intro_text: (value) => {
        if (!value.trim()) return "Introduction text is required";
        if (value.length > MAX_CHARS)
          return `Text must be ${MAX_CHARS} characters or less`;
        return null;
      },
    },
  });

  const continueForm = useForm({
    initialValues: {
      thread_id: "",
    },
    validate: {
      thread_id: (value) => {
        if (!value.trim()) return "Thread ID or URL is required";
        return null;
      },
    },
  });

  const handleContinueThread = async (values: { thread_id: string }) => {
    setContinueLoading(true);

    try {
      const response = await apiService.continueThread(values.thread_id);

      if (response.success && response.data) {
        // Update progress store
        const progressResponse = await apiService.getProgress();
        if (progressResponse.success && progressResponse.data) {
          setProgress(progressResponse.data);
        }

        toast.success({
          title: "Thread Resumed! 🎉",
          message: response.message || "You can now continue posting to your thread.",
        });

        continueForm.reset();

        // Navigate to post solution page
        navigate("/post");
      } else {
        toast.error({
          title: "Failed to Continue Thread",
          message:
            response.message ||
            "Unable to continue the thread. Please check the thread ID.",
        });
      }
    } catch (error) {
      toast.error({
        title: "Failed to Continue Thread",
        message: getErrorMessage(error),
      });
    } finally {
      setContinueLoading(false);
    }
  };

  const charCount = form.values.intro_text.length;
  const isValidLength = charCount <= MAX_CHARS && charCount > 0;

  const handleSubmit = async (values: { intro_text: string }) => {
    // If there's an active thread, show confirmation modal
    if (hasActiveThread) {
      openConfirmModal();
      return;
    }

    await createThread(values.intro_text);
  };

  const createThread = async (introText: string) => {
    setLoading(true);
    closeConfirmModal();

    try {
      // Reset progress first if there's an existing thread
      if (hasActiveThread) {
        await apiService.resetProgress();
        resetProgress();
      }

      const response = await apiService.startThread(introText);

      if (response.success && response.data) {
        setPosted(true);
        setTweetUrl(response.data.tweet_url);

        // Update progress store
        const progressResponse = await apiService.getProgress();
        if (progressResponse.success && progressResponse.data) {
          setProgress(progressResponse.data);
        }

        toast.success({
          title: "Thread Started! 🚀",
          message:
            "Your thread has been created. Start posting Day 1!",
        });

        form.reset();
      } else {
        toast.error({
          title: "Failed to Start Thread",
          message:
            response.message ||
            "Unable to create your thread. Please try again.",
        });
      }
    } catch (error) {
      toast.error({
        title: "Failed to Start Thread",
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  if (posted && tweetUrl) {
    return (
      <Container size="md" py="xl">
        <Card withBorder p="xl" radius="lg" className={classes.successCard}>
          <Stack align="center" gap="lg">
            <ThemeIcon
              size={80}
              radius="xl"
              variant="gradient"
              gradient={{ from: "grape", to: "pink" }}
            >
              <IconCheck size={40} />
            </ThemeIcon>
            <Title order={2}>Thread Created! 🚀</Title>
            <Text c="dimmed" ta="center">
              Your thread has been started. Now you can begin posting
              your daily solutions!
            </Text>
            <Group>
              <Button
                variant="light"
                leftSection={<IconExternalLink size={16} />}
                component="a"
                href={tweetUrl}
                target="_blank"
              >
                View Thread
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
                onClick={() => navigate("/post")}
              >
                Post Day 1
              </Button>
            </Group>
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
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate("/")}
            mb="md"
            p={0}
          >
            Back to Dashboard
          </Button>
          <Group gap="sm" mb="xs">
            <ThemeIcon
              size="lg"
              variant="gradient"
              gradient={{ from: "grape", to: "pink" }}
              radius="md"
            >
              <IconPlus size={20} />
            </ThemeIcon>
            <Title order={1}>
              {hasActiveThread ? "Start New Thread" : "Start Thread"}
            </Title>
          </Group>
          <Text c="dimmed">
            {hasActiveThread
              ? "Reset your progress and begin a fresh LeetCode journey"
              : "Create the introduction tweet for your thread"}
          </Text>
        </Box>

        {/* Warning for existing thread */}
        {hasActiveThread && (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="You have an active thread"
            color="yellow"
            variant="light"
          >
            <Text size="sm">
              You already have an active thread with {currentDay} days of
              progress. Starting a new thread will reset your local progress
              counter. Your existing tweets will remain on X/Twitter.
            </Text>
          </Alert>
        )}

        {!hasActiveThread && (
          <Group align="flex-start" grow preventGrowOverflow={false}>
            <Card withBorder p="xl" radius="lg" style={{ flex: 1 }}>
              <Tabs defaultValue="new">
              <Tabs.List>
                <Tabs.Tab value="new" leftSection={<IconPlus size={16} />}>
                  Start New Thread
                </Tabs.Tab>
                <Tabs.Tab
                  value="continue"
                  leftSection={<IconRefresh size={16} />}
                >
                  Continue Existing Thread
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="new" pt="lg">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <Stack gap="lg">
                    <Textarea
                      label="Introduction Tweet"
                      description="This will be the first tweet in your thread"
                      placeholder="e.g., A thread of my daily LeetCode submissions 🧵👇"
                      minRows={4}
                      maxRows={6}
                      size="md"
                      {...form.getInputProps("intro_text")}
                    />

                <Box>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" c="dimmed">
                      Character count
                    </Text>
                    <Badge
                      color={
                        isValidLength
                          ? "green"
                          : charCount === 0
                          ? "gray"
                          : "red"
                      }
                      variant="light"
                    >
                      {charCount} / {MAX_CHARS}
                    </Badge>
                  </Group>
                  <Progress
                    value={(charCount / MAX_CHARS) * 100}
                    color={
                      isValidLength ? "blue" : charCount === 0 ? "gray" : "red"
                    }
                    size="sm"
                    radius="xl"
                  />
                </Box>

                {charCount > MAX_CHARS && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    variant="light"
                  >
                    Tweet exceeds 280 characters. Please shorten your
                    introduction.
                  </Alert>
                )}

                <Divider my="sm" />

                <Button
                  type="submit"
                  loading={loading}
                  disabled={!isValidLength}
                  variant="gradient"
                  gradient={{ from: "grape", to: "pink" }}
                  size="lg"
                  fullWidth
                  leftSection={<IconPlus size={20} />}
                >
                  {hasActiveThread
                    ? "Reset & Start New Thread"
                    : "Start Thread"}
                </Button>
              </Stack>
            </form>
              </Tabs.Panel>

              <Tabs.Panel value="continue" pt="lg">
                <form
                  onSubmit={continueForm.onSubmit(handleContinueThread)}
                >
                  <Stack gap="lg">
                    <Alert
                      icon={<IconInfoCircle size={16} />}
                      title="Continue Your Existing Thread"
                      color="blue"
                      variant="light"
                    >
                      <Text size="sm">
                        Enter your thread ID or URL to resume posting to an
                        existing thread. The system will automatically detect
                        how many days you've already posted.
                      </Text>
                    </Alert>

                    <TextInput
                      label="Thread ID or URL"
                      description="Paste the thread ID (e.g., 1234567890) or full URL (e.g., https://x.com/username/status/1234567890)"
                      placeholder="https://x.com/username/status/1234567890"
                      leftSection={<IconLink size={16} />}
                      {...continueForm.getInputProps("thread_id")}
                    />

                    <Button
                      type="submit"
                      loading={continueLoading}
                      variant="gradient"
                      gradient={{ from: "grape", to: "pink" }}
                      size="lg"
                      fullWidth
                      leftSection={<IconRefresh size={16} />}
                    >
                      Continue Thread
                    </Button>
                  </Stack>
                </form>
              </Tabs.Panel>
            </Tabs>
            </Card>

            {/* Preview */}
            <Card withBorder p="xl" radius="lg" style={{ flex: 1 }}>
              <Stack gap="md">
                <Group gap="sm">
                  <IconEye size={20} />
                  <Text fw={600}>Tweet Preview</Text>
                </Group>

                <Divider />

                {form.values.intro_text ? (
                  <Paper
                    withBorder
                    p="md"
                    radius="md"
                    className={classes.previewBox}
                  >
                    <Text
                      style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {form.values.intro_text}
                    </Text>
                  </Paper>
                ) : (
                  <Box ta="center" py="xl">
                    <Text c="dimmed">
                      Enter your introduction text to see a preview
                    </Text>
                  </Box>
                )}

                <Alert
                  icon={<IconAlertCircle size={16} />}
                  variant="light"
                  color="blue"
                  title="What happens next?"
                >
                  <Text size="sm">
                    After posting this introduction tweet, you'll be ready to post
                    Day 1 of your LeetCode journey. Each subsequent post will
                    automatically reply to this thread.
                  </Text>
                </Alert>
              </Stack>
            </Card>
          </Group>
        )}

        {hasActiveThread && (
          <Group align="flex-start" grow preventGrowOverflow={false}>
            {/* Form */}
            <Card withBorder p="xl" radius="lg" style={{ flex: 1 }}>
              <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="lg">
                  <Textarea
                    label="Introduction Tweet"
                    description="This will be the first tweet in your new thread"
                    placeholder="e.g., A thread of my daily LeetCode submissions 🧵👇"
                    minRows={4}
                    maxRows={6}
                    size="md"
                    {...form.getInputProps("intro_text")}
                  />

                  <Box>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" c="dimmed">
                        Character count
                      </Text>
                      <Badge
                        color={
                          isValidLength
                            ? "green"
                            : charCount === 0
                            ? "gray"
                            : "red"
                        }
                        variant="light"
                      >
                        {charCount} / {MAX_CHARS}
                      </Badge>
                    </Group>
                    <Progress
                      value={(charCount / MAX_CHARS) * 100}
                      color={
                        isValidLength ? "blue" : charCount === 0 ? "gray" : "red"
                      }
                      size="sm"
                      radius="xl"
                    />
                  </Box>

                  {charCount > MAX_CHARS && (
                    <Alert
                      icon={<IconAlertCircle size={16} />}
                      color="red"
                      variant="light"
                    >
                      Tweet exceeds 280 characters. Please shorten your
                      introduction.
                    </Alert>
                  )}

                  <Divider my="sm" />

                  <Button
                    type="submit"
                    loading={loading}
                    disabled={!isValidLength}
                    variant="gradient"
                    gradient={{ from: "grape", to: "pink" }}
                    size="lg"
                    fullWidth
                    leftSection={<IconPlus size={20} />}
                  >
                    Reset & Start New Thread
                  </Button>
                </Stack>
              </form>
            </Card>

            {/* Preview */}
            <Card withBorder p="xl" radius="lg" style={{ flex: 1 }}>
              <Stack gap="md">
              <Group gap="sm">
                <IconEye size={20} />
                <Text fw={600}>Tweet Preview</Text>
              </Group>

              <Divider />

              {form.values.intro_text ? (
                <Paper
                  withBorder
                  p="md"
                  radius="md"
                  className={classes.previewBox}
                >
                  <Text
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {form.values.intro_text}
                  </Text>
                </Paper>
              ) : (
                <Box ta="center" py="xl">
                  <Text c="dimmed">
                    Enter your introduction text to see a preview
                  </Text>
                </Box>
              )}

              <Alert
                icon={<IconAlertCircle size={16} />}
                variant="light"
                color="blue"
                title="What happens next?"
              >
                <Text size="sm">
                  After posting this introduction tweet, you'll be ready to post
                  Day 1 of your LeetCode journey. Each subsequent post will
                  automatically reply to this thread.
                </Text>
              </Alert>
              </Stack>
            </Card>
          </Group>
        )}

        {/* Example tweets */}
        <Card withBorder p="lg" radius="lg">
          <Text fw={600} mb="md">
            Example introductions
          </Text>
          <Group gap="sm" wrap="wrap">
            {[
              "A thread of my daily LeetCode submissions 🧵👇",
              "Starting my #100DaysOfCode with LeetCode! 💻",
              "Documenting my DSA journey, one problem at a time 🚀",
              "Daily LeetCode grind thread 🎯 #coding #leetcode",
            ].map((example) => (
              <Badge
                key={example}
                variant="light"
                size="lg"
                style={{ cursor: "pointer" }}
                onClick={() => form.setFieldValue("intro_text", example)}
              >
                {example}
              </Badge>
            ))}
          </Group>
        </Card>
      </Stack>

      {/* Confirmation Modal */}
      <Modal
        opened={confirmModalOpened}
        onClose={closeConfirmModal}
        title="Start a New Thread?"
        centered
      >
        <Stack gap="md">
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="yellow"
            variant="light"
          >
            You have an active thread with {currentDay} days of progress.
          </Alert>
          <Text size="sm">
            Starting a new thread will reset your local progress counter. Your
            existing tweets on X/Twitter will remain unchanged.
          </Text>
          <Text size="sm" fw={500}>
            Are you sure you want to start a new thread?
          </Text>
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeConfirmModal}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={loading}
              onClick={() => createThread(form.values.intro_text)}
            >
              Yes, Start New Thread
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
