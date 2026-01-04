import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  TextInput,
  Button,
  Group,
  Box,
  Badge,
  Progress,
  Alert,
  ThemeIcon,
  Paper,
  Divider,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconSend,
  IconLink,
  IconCode,
  IconEye,
  IconAlertCircle,
  IconCheck,
  IconExternalLink,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useProgressStore } from "../store/progressStore";
import { apiService, getErrorMessage } from "../services/api";
import { toast } from "../utils/toast";
import classes from "./PostSolutionPage.module.css";

const MAX_CHARS = 280;

export function PostSolutionPage() {
  const navigate = useNavigate();
  const { currentDay, hasActiveThread, nextDay, setProgress } =
    useProgressStore();

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    text: string;
    charCount: number;
    isValid: boolean;
  } | null>(null);
  const [posted, setPosted] = useState(false);
  const [tweetUrl, setTweetUrl] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      gist_url: "",
      problem_name: "",
    },
    validate: {
      gist_url: (value) => {
        if (!value.trim()) return "Gist URL is required";
        if (!value.includes("gist.github.com") && !value.startsWith("http")) {
          return "Please enter a valid URL";
        }
        return null;
      },
      problem_name: (value) =>
        !value.trim() ? "Problem name is required" : null,
    },
  });

  // Update preview when form values change
  useEffect(() => {
    const { gist_url, problem_name } = form.values;
    if (gist_url && problem_name) {
      const text = `Day ${nextDay}\n\n${problem_name}\n\n${gist_url}`;
      setPreview({
        text,
        charCount: text.length,
        isValid: text.length <= MAX_CHARS,
      });
    } else {
      setPreview(null);
    }
  }, [form.values, nextDay]);

  const handleSubmit = async (values: {
    gist_url: string;
    problem_name: string;
  }) => {
    if (!hasActiveThread) {
      toast.error({
        title: "No Active Thread",
        message: "Please start a thread first before posting solutions.",
      });
      navigate("/start-thread");
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.postSolution(
        values.gist_url,
        values.problem_name
      );

      if (response.success && response.data) {
        setPosted(true);
        setTweetUrl(response.data.tweet_url);

        // Update progress store
        const progressResponse = await apiService.getProgress();
        if (progressResponse.success && progressResponse.data) {
          setProgress(progressResponse.data);
        }

        toast.success({
          title: `Day ${response.data.day} Posted! 🎉`,
          message: "Your solution has been posted to your thread.",
        });

        form.reset();
      } else {
        toast.error({
          title: "Post Failed",
          message:
            response.message ||
            "Unable to post your solution. Please try again.",
        });
      }
    } catch (error) {
      toast.error({
        title: "Post Failed",
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnother = () => {
    setPosted(false);
    setTweetUrl(null);
    setPreview(null);
  };

  if (!hasActiveThread) {
    return (
      <Container size="md" py="xl">
        <Card withBorder p="xl" radius="lg" ta="center">
          <Stack align="center" gap="lg">
            <ThemeIcon size={60} radius="xl" variant="light" color="yellow">
              <IconAlertCircle size={30} />
            </ThemeIcon>
            <Title order={3}>No Active Thread</Title>
            <Text c="dimmed" maw={400}>
              You need to start a thread before you can post solutions. Create
              your first thread to begin your LeetCode posting journey!
            </Text>
            <Button
              variant="gradient"
              gradient={{ from: "grape", to: "pink" }}
              onClick={() => navigate("/start-thread")}
            >
              Start a Thread
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  if (posted && tweetUrl) {
    return (
      <Container size="md" py="xl">
        <Card withBorder p="xl" radius="lg" className={classes.successCard}>
          <Stack align="center" gap="lg">
            <ThemeIcon
              size={80}
              radius="xl"
              variant="gradient"
              gradient={{ from: "green", to: "teal" }}
            >
              <IconCheck size={40} />
            </ThemeIcon>
            <Title order={2}>Day {currentDay} Posted! 🎉</Title>
            <Text c="dimmed" ta="center">
              Your LeetCode solution has been successfully posted to your
              thread.
            </Text>
            <Badge
              size="xl"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
            >
              {currentDay} Day Streak
            </Badge>
            <Group>
              <Button
                variant="light"
                leftSection={<IconExternalLink size={16} />}
                component="a"
                href={tweetUrl}
                target="_blank"
              >
                View Tweet
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
                onClick={handlePostAnother}
              >
                Post Another Solution
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
              gradient={{ from: "blue", to: "cyan" }}
              radius="md"
            >
              <IconSend size={20} />
            </ThemeIcon>
            <Title order={1}>Post Solution</Title>
          </Group>
          <Text c="dimmed">
            Share your Day {nextDay} LeetCode solution to your thread
          </Text>
        </Box>

        <Group align="flex-start" grow preventGrowOverflow={false}>
          {/* Form */}
          <Card withBorder p="xl" radius="lg" style={{ flex: 1 }}>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="lg">
                <TextInput
                  label="Problem Name"
                  description="The name of the LeetCode problem you solved"
                  placeholder="e.g., Two Sum, Valid Parentheses"
                  leftSection={<IconCode size={16} />}
                  size="md"
                  {...form.getInputProps("problem_name")}
                />

                <TextInput
                  label="Gist URL"
                  description="Link to your solution code on GitHub Gist"
                  placeholder="https://gist.github.com/username/..."
                  leftSection={<IconLink size={16} />}
                  size="md"
                  {...form.getInputProps("gist_url")}
                />

                <Divider my="sm" />

                <Button
                  type="submit"
                  loading={loading}
                  disabled={!preview?.isValid}
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan" }}
                  size="lg"
                  fullWidth
                  leftSection={<IconSend size={20} />}
                >
                  Post Day {nextDay}
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

              {preview ? (
                <>
                  <Paper
                    withBorder
                    p="md"
                    radius="md"
                    className={classes.previewBox}
                  >
                    <Text
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {preview.text}
                    </Text>
                  </Paper>

                  <Box>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" c="dimmed">
                        Character count
                      </Text>
                      <Badge
                        color={preview.isValid ? "green" : "red"}
                        variant="light"
                      >
                        {preview.charCount} / {MAX_CHARS}
                      </Badge>
                    </Group>
                    <Progress
                      value={(preview.charCount / MAX_CHARS) * 100}
                      color={preview.isValid ? "blue" : "red"}
                      size="sm"
                      radius="xl"
                    />
                  </Box>

                  {!preview.isValid && (
                    <Alert
                      icon={<IconAlertCircle size={16} />}
                      color="red"
                      variant="light"
                    >
                      Tweet exceeds 280 characters. Please shorten the problem
                      name.
                    </Alert>
                  )}
                </>
              ) : (
                <Box ta="center" py="xl">
                  <Text c="dimmed">
                    Fill in the form to see a preview of your tweet
                  </Text>
                </Box>
              )}
            </Stack>
          </Card>
        </Group>

        {/* Tips */}
        <Alert
          icon={<IconCode size={16} />}
          title="Pro Tip"
          variant="light"
          color="blue"
        >
          Create a GitHub Gist with your solution code and paste the URL here.
          This keeps your tweets clean and lets followers see your full
          solution!
        </Alert>
      </Stack>
    </Container>
  );
}
