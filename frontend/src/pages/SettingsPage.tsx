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
  Textarea,
  Modal,
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
  IconFileImport,
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
  const [envModalOpened, setEnvModalOpened] = useState(false);
  const [envContent, setEnvContent] = useState("");

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

  const handlePasteEnv = () => {
    if (!envContent.trim()) {
      toast.error({
        title: "Empty Content",
        message: "Please paste your .env file content.",
      });
      return;
    }

    // Parse .env file content
    const lines = envContent.split("\n");
    const envVars: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        envVars[key] = value;
      }
    }

    // Map environment variables to form fields
    // Support various naming conventions
    const mapping: Record<string, keyof CredentialsPayload> = {
      // Standard Twitter API naming
      TWITTER_API_KEY: "api_key",
      TWITTER_API_SECRET: "api_secret",
      TWITTER_ACCESS_TOKEN: "access_token",
      TWITTER_ACCESS_TOKEN_SECRET: "access_token_secret",
      TWITTER_BEARER_TOKEN: "bearer_token",
      // Alternative naming
      API_KEY: "api_key",
      API_SECRET: "api_secret",
      ACCESS_TOKEN: "access_token",
      ACCESS_TOKEN_SECRET: "access_token_secret",
      BEARER_TOKEN: "bearer_token",
      // With CONSUMER prefix
      TWITTER_CONSUMER_KEY: "api_key",
      TWITTER_CONSUMER_SECRET: "api_secret",
      CONSUMER_KEY: "api_key",
      CONSUMER_SECRET: "api_secret",
    };

    let foundCount = 0;
    const updates: Partial<CredentialsPayload> = {};

    for (const [envKey, formKey] of Object.entries(mapping)) {
      // Try exact match first
      if (envVars[envKey]) {
        updates[formKey] = envVars[envKey];
        foundCount++;
        continue;
      }

      // Try case-insensitive match
      const envKeyUpper = envKey.toUpperCase();
      for (const [key, value] of Object.entries(envVars)) {
        if (key.toUpperCase() === envKeyUpper) {
          updates[formKey] = value;
          foundCount++;
          break;
        }
      }
    }

    if (foundCount === 0) {
      toast.error({
        title: "No Keys Found",
        message:
          "Could not find any matching API keys. Make sure your .env file contains keys like TWITTER_API_KEY, TWITTER_API_SECRET, etc.",
      });
      return;
    }

    // Update form with found values
    form.setValues({
      ...form.values,
      ...updates,
    });

    setEnvModalOpened(false);
    setEnvContent("");

    toast.success({
      title: "Keys Imported",
      message: `Successfully imported ${foundCount} API key(s). Please review and connect.`,
    });
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

                <Group justify="space-between" align="center">
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
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconFileImport size={14} />}
                    onClick={() => setEnvModalOpened(true)}
                  >
                    Import from .env
                  </Button>
                </Group>

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

        {/* Env Import Modal */}
        <Modal
          opened={envModalOpened}
          onClose={() => {
            setEnvModalOpened(false);
            setEnvContent("");
          }}
          title="Import from .env File"
          size="lg"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Paste the contents of your .env file below. The system will
              automatically extract and map the API keys to the correct fields.
            </Text>

            <Textarea
              placeholder={`TWITTER_API_KEY=your_key_here
TWITTER_API_SECRET=your_secret_here
TWITTER_ACCESS_TOKEN=your_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_token_secret_here
TWITTER_BEARER_TOKEN=your_bearer_token_here`}
              minRows={8}
              value={envContent}
              onChange={(e) => setEnvContent(e.target.value)}
              autosize
            />

            <Group justify="flex-end">
              <Button
                variant="subtle"
                onClick={() => {
                  setEnvModalOpened(false);
                  setEnvContent("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handlePasteEnv} leftSection={<IconFileImport size={16} />}>
                Import Keys
              </Button>
            </Group>
          </Stack>
        </Modal>

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
