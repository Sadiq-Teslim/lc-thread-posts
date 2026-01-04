import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Group,
  Alert,
  Accordion,
  Anchor,
  Box,
  Badge,
  Divider,
  ThemeIcon,
  List,
  CopyButton,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconSettings,
  IconKey,
  IconShieldCheck,
  IconInfoCircle,
  IconExternalLink,
  IconCheck,
  IconCopy,
  IconAlertTriangle,
  IconBrandTwitter,
  IconLock,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { useSessionStore } from "../store/sessionStore";
import {
  apiService,
  getErrorMessage,
  CredentialsPayload,
} from "../services/api";
import { toast } from "../utils/toast";
import classes from "./SettingsPage.module.css";

export function SettingsPage() {
  const { hasValidSession, setSession, clearSession, expiresAt } =
    useSessionStore();
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  const form = useForm<CredentialsPayload>({
    initialValues: {
      api_key: "",
      api_secret: "",
      access_token: "",
      access_token_secret: "",
      bearer_token: "",
    },
    validate: {
      api_key: (value) =>
        value.trim().length === 0 ? "API Key is required" : null,
      api_secret: (value) =>
        value.trim().length === 0 ? "API Secret is required" : null,
      access_token: (value) =>
        value.trim().length === 0 ? "Access Token is required" : null,
      access_token_secret: (value) =>
        value.trim().length === 0 ? "Access Token Secret is required" : null,
      bearer_token: (value) =>
        value.trim().length === 0 ? "Bearer Token is required" : null,
    },
  });

  const handleSubmit = async (values: CredentialsPayload) => {
    setLoading(true);

    try {
      const response = await apiService.createSession(values);

      if (response.success && response.session_id) {
        const expiresAt = new Date(
          Date.now() + (response.expires_in || 86400) * 1000
        ).toISOString();
        setSession(response.session_id, expiresAt);

        toast.success({
          title: "Connected Successfully",
          message:
            response.message || "Your X/Twitter account is now connected.",
        });

        form.reset();
      } else {
        toast.error({
          title: "Connection Failed",
          message:
            response.message ||
            "Unable to connect. Please check your credentials.",
        });
      }
    } catch (error) {
      toast.error({
        title: "Connection Failed",
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiService.destroySession();
      clearSession();
      toast.success({
        title: "Disconnected",
        message: "Your credentials have been securely removed.",
      });
    } catch (error) {
      toast.error({
        title: "Error",
        message: getErrorMessage(error),
      });
    }
  };

  const isConnected = hasValidSession();

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Group gap="sm" mb="xs">
            <ThemeIcon
              size="lg"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              radius="md"
            >
              <IconSettings size={20} />
            </ThemeIcon>
            <Title order={1}>Settings</Title>
          </Group>
          <Text c="dimmed">
            Configure your X/Twitter API credentials to start posting
          </Text>
        </Box>

        {/* Connection Status */}
        <Card withBorder p="lg" radius="lg">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Group gap="sm" mb="xs">
                <IconBrandTwitter size={20} />
                <Text fw={600}>Connection Status</Text>
              </Group>
              <Badge
                size="lg"
                variant="gradient"
                gradient={
                  isConnected
                    ? { from: "green", to: "teal" }
                    : { from: "gray", to: "gray" }
                }
              >
                {isConnected ? "Connected" : "Not Connected"}
              </Badge>
              {isConnected && expiresAt && (
                <Text size="xs" c="dimmed" mt="xs">
                  Session expires: {new Date(expiresAt).toLocaleString()}
                </Text>
              )}
            </Box>
            {isConnected && (
              <Button variant="subtle" color="red" onClick={handleDisconnect}>
                Disconnect
              </Button>
            )}
          </Group>
        </Card>

        {/* Security Info */}
        <Alert
          icon={<IconShieldCheck size={16} />}
          title="Your credentials are secure"
          color="green"
          variant="light"
        >
          <Text size="sm">
            Your API keys are encrypted and stored only in your browser's local
            session. They are never sent to any third-party servers. The
            connection is validated directly with X/Twitter's API.
          </Text>
        </Alert>

        {/* Credentials Form */}
        {!isConnected && (
          <Card withBorder p="xl" radius="lg">
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="lg">
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <IconKey size={20} />
                    <Text fw={600}>API Credentials</Text>
                  </Group>
                  <Tooltip label={showKeys ? "Hide all keys" : "Show all keys"}>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => setShowKeys(!showKeys)}
                    >
                      {showKeys ? (
                        <IconEyeOff size={18} />
                      ) : (
                        <IconEye size={18} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <Divider />

                <Text size="sm" c="dimmed">
                  Enter your X/Twitter Developer API credentials. You can find
                  these in your{" "}
                  <Anchor
                    href="https://developer.twitter.com/en/portal/dashboard"
                    target="_blank"
                  >
                    Twitter Developer Portal <IconExternalLink size={12} />
                  </Anchor>
                </Text>

                {showKeys ? (
                  <>
                    <TextInput
                      label="API Key (Consumer Key)"
                      placeholder="Enter your API Key"
                      leftSection={<IconKey size={16} />}
                      {...form.getInputProps("api_key")}
                    />

                    <TextInput
                      label="API Secret (Consumer Secret)"
                      placeholder="Enter your API Secret"
                      leftSection={<IconLock size={16} />}
                      {...form.getInputProps("api_secret")}
                    />

                    <TextInput
                      label="Access Token"
                      placeholder="Enter your Access Token"
                      leftSection={<IconKey size={16} />}
                      {...form.getInputProps("access_token")}
                    />

                    <TextInput
                      label="Access Token Secret"
                      placeholder="Enter your Access Token Secret"
                      leftSection={<IconLock size={16} />}
                      {...form.getInputProps("access_token_secret")}
                    />

                    <TextInput
                      label="Bearer Token"
                      placeholder="Enter your Bearer Token"
                      leftSection={<IconKey size={16} />}
                      {...form.getInputProps("bearer_token")}
                    />
                  </>
                ) : (
                  <>
                    <PasswordInput
                      label="API Key (Consumer Key)"
                      placeholder="Enter your API Key"
                      leftSection={<IconKey size={16} />}
                      {...form.getInputProps("api_key")}
                    />

                    <PasswordInput
                      label="API Secret (Consumer Secret)"
                      placeholder="Enter your API Secret"
                      leftSection={<IconLock size={16} />}
                      {...form.getInputProps("api_secret")}
                    />

                    <PasswordInput
                      label="Access Token"
                      placeholder="Enter your Access Token"
                      leftSection={<IconKey size={16} />}
                      {...form.getInputProps("access_token")}
                    />

                    <PasswordInput
                      label="Access Token Secret"
                      placeholder="Enter your Access Token Secret"
                      leftSection={<IconLock size={16} />}
                      {...form.getInputProps("access_token_secret")}
                    />

                    <PasswordInput
                      label="Bearer Token"
                      placeholder="Enter your Bearer Token"
                      leftSection={<IconKey size={16} />}
                      {...form.getInputProps("bearer_token")}
                    />
                  </>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan" }}
                  size="md"
                  fullWidth
                  mt="md"
                >
                  Connect to X/Twitter
                </Button>
              </Stack>
            </form>
          </Card>
        )}

        {/* Help Section */}
        <Card withBorder p="lg" radius="lg">
          <Accordion variant="separated">
            <Accordion.Item value="how-to-get-keys">
              <Accordion.Control icon={<IconInfoCircle size={20} />}>
                How to get your API keys
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <List spacing="sm" size="sm">
                    <List.Item>
                      Go to the{" "}
                      <Anchor
                        href="https://developer.twitter.com/en/portal/dashboard"
                        target="_blank"
                      >
                        Twitter Developer Portal
                      </Anchor>
                    </List.Item>
                    <List.Item>
                      Create a new project and app if you haven't already
                    </List.Item>
                    <List.Item>
                      Navigate to your app's "Keys and tokens" section
                    </List.Item>
                    <List.Item>
                      Generate and copy your API Key, API Secret, Access Token,
                      and Access Token Secret
                    </List.Item>
                    <List.Item>
                      Make sure your app has <strong>Read and Write</strong>{" "}
                      permissions
                    </List.Item>
                  </List>

                  <Alert
                    icon={<IconAlertTriangle size={16} />}
                    title="Important"
                    color="yellow"
                    variant="light"
                  >
                    Make sure your Twitter Developer account has{" "}
                    <strong>Elevated access</strong> or higher to post tweets
                    via the API.
                  </Alert>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="security">
              <Accordion.Control icon={<IconShieldCheck size={20} />}>
                Security & Privacy
              </Accordion.Control>
              <Accordion.Panel>
                <List spacing="sm" size="sm">
                  <List.Item>
                    Your API keys are encrypted using industry-standard
                    encryption
                  </List.Item>
                  <List.Item>
                    Keys are stored only in your browser's session, not on any
                    server
                  </List.Item>
                  <List.Item>
                    Sessions automatically expire after 24 hours for security
                  </List.Item>
                  <List.Item>
                    You can disconnect at any time to remove all stored
                    credentials
                  </List.Item>
                  <List.Item>
                    The app communicates directly with X/Twitter's official API
                  </List.Item>
                </List>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="environment">
              <Accordion.Control icon={<IconKey size={20} />}>
                Using environment variables (Advanced)
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text size="sm">
                    If you prefer, you can also set your credentials using
                    environment variables in the backend:
                  </Text>

                  <Card
                    withBorder
                    p="sm"
                    bg="dark.8"
                    className={classes.codeBlock}
                  >
                    <Group justify="space-between" mb="xs">
                      <Text size="xs" c="dimmed">
                        .env file
                      </Text>
                      <CopyButton
                        value={`TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
TWITTER_BEARER_TOKEN=your_bearer_token`}
                      >
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? "Copied!" : "Copy"}>
                            <ActionIcon
                              variant="subtle"
                              color={copied ? "green" : "gray"}
                              onClick={copy}
                              size="sm"
                            >
                              {copied ? (
                                <IconCheck size={14} />
                              ) : (
                                <IconCopy size={14} />
                              )}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <Text
                      size="xs"
                      style={{
                        fontFamily: "monospace",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      TWITTER_API_KEY=your_api_key{"\n"}
                      TWITTER_API_SECRET=your_api_secret{"\n"}
                      TWITTER_ACCESS_TOKEN=your_access_token{"\n"}
                      TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret{"\n"}
                      TWITTER_BEARER_TOKEN=your_bearer_token
                    </Text>
                  </Card>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Card>
      </Stack>
    </Container>
  );
}
