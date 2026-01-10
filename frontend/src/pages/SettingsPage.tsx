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
  const { hasValidSession, setSession, clearSession } =
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
        setSession(response.session_id);

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
              {isConnected && (
                <Text size="xs" c="dimmed" mt="xs">
                  Your credentials are saved securely
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
                How to get your API keys - Detailed Guide
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="lg">
                  <Text size="sm" c="dimmed">
                    Follow these detailed steps to obtain your X/Twitter API
                    credentials. You'll need all five keys to use ThreadCraft.
                  </Text>

                  {/* Step 1 */}
                  <Box>
                    <Group gap="xs" mb="xs">
                      <Badge size="lg" variant="filled" color="blue">
                        Step 1
                      </Badge>
                      <Text fw={600} size="sm">
                        Create a Twitter Developer Account
                      </Text>
                    </Group>
                    <List spacing="xs" size="sm" ml="xl">
                      <List.Item>
                        Visit the{" "}
                        <Anchor
                          href="https://developer.twitter.com/en/portal/dashboard"
                          target="_blank"
                        >
                          Twitter Developer Portal{" "}
                          <IconExternalLink size={12} />
                        </Anchor>
                      </List.Item>
                      <List.Item>
                        Sign in with your X/Twitter account (or create one if
                        you don't have one)
                      </List.Item>
                      <List.Item>
                        Apply for a Developer Account if you haven't already
                        (usually approved within a few minutes)
                      </List.Item>
                      <List.Item>
                        Accept the Developer Terms and complete the application
                        form
                      </List.Item>
                    </List>
                  </Box>

                  {/* Step 2 */}
                  <Box>
                    <Group gap="xs" mb="xs">
                      <Badge size="lg" variant="filled" color="blue">
                        Step 2
                      </Badge>
                      <Text fw={600} size="sm">
                        Create a New Project and App
                      </Text>
                    </Group>
                    <List spacing="xs" size="sm" ml="xl">
                      <List.Item>
                        Click the{" "}
                        <strong>"Create Project"</strong> button (or use an
                        existing project)
                      </List.Item>
                      <List.Item>
                        Fill in your project details:
                        <List withPadding spacing="xs" size="sm" mt="xs">
                          <List.Item>
                            <strong>Project name:</strong> e.g., "ThreadCraft"
                            or "My Thread Poster"
                          </List.Item>
                          <List.Item>
                            <strong>Use case:</strong> Select "Making bots" or
                            "Exploring the API"
                          </List.Item>
                          <List.Item>
                            <strong>Description:</strong> Briefly describe your
                            project
                          </List.Item>
                        </List>
                      </List.Item>
                      <List.Item>
                        Create an App within your project:
                        <List withPadding spacing="xs" size="sm" mt="xs">
                          <List.Item>
                            Click <strong>"Create App"</strong> or{" "}
                            <strong>"Add App"</strong>
                          </List.Item>
                          <List.Item>
                            Give your app a name (can be the same as your
                            project)
                          </List.Item>
                          <List.Item>
                            Click <strong>"Create"</strong> to finish
                          </List.Item>
                        </List>
                      </List.Item>
                    </List>
                  </Box>

                  {/* Step 3 */}
                  <Box>
                    <Group gap="xs" mb="xs">
                      <Badge size="lg" variant="filled" color="blue">
                        Step 3
                      </Badge>
                      <Text fw={600} size="sm">
                        Configure App Permissions
                      </Text>
                    </Group>
                    <List spacing="xs" size="sm" ml="xl">
                      <List.Item>
                        Navigate to your app's <strong>"Settings"</strong> tab
                      </List.Item>
                      <List.Item>
                        Scroll to <strong>"User authentication settings"</strong>{" "}
                        section
                      </List.Item>
                      <List.Item>
                        Click <strong>"Set up"</strong> or{" "}
                        <strong>"Edit"</strong>
                      </List.Item>
                      <List.Item>
                        Configure the following settings:
                        <List withPadding spacing="xs" size="sm" mt="xs">
                          <List.Item>
                            <strong>App permissions:</strong> Select{" "}
                            <strong>"Read and write"</strong> (required for
                            posting tweets)
                          </List.Item>
                          <List.Item>
                            <strong>Type of App:</strong> Select "Web App, Automated App or Bot"
                          </List.Item>
                          <List.Item>
                            <strong>Callback URI / Redirect URL:</strong> You can
                            use{" "}
                            <code style={{ fontSize: "0.85em" }}>
                              http://localhost
                            </code>{" "}
                            or leave blank for this use case
                          </List.Item>
                          <List.Item>
                            <strong>Website URL:</strong> Enter any valid URL
                            (can be your GitHub repo or personal website)
                          </List.Item>
                        </List>
                      </List.Item>
                      <List.Item>
                        Click <strong>"Save"</strong> to apply changes
                      </List.Item>
                    </List>
                  </Box>

                  {/* Step 4 */}
                  <Box>
                    <Group gap="xs" mb="xs">
                      <Badge size="lg" variant="filled" color="blue">
                        Step 4
                      </Badge>
                      <Text fw={600} size="sm">
                        Get Your API Keys and Tokens
                      </Text>
                    </Group>
                    <List spacing="xs" size="sm" ml="xl">
                      <List.Item>
                        Navigate to the <strong>"Keys and tokens"</strong> tab
                        in your app dashboard
                      </List.Item>
                      <List.Item>
                        You'll find several keys. Here's what you need:
                      </List.Item>
                    </List>

                    <Card withBorder p="md" mt="md" ml="xl" bg="dark.9">
                      <Stack gap="xs">
                        <Group gap="xs">
                          <IconKey size={16} />
                          <Text size="sm" fw={600}>
                            API Key (Consumer Key)
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" ml="xl">
                          Already visible in the "Consumer Keys" section. Click
                          the copy icon or reveal it if hidden.
                        </Text>

                        <Divider my="xs" />

                        <Group gap="xs">
                          <IconLock size={16} />
                          <Text size="sm" fw={600}>
                            API Secret (Consumer Secret)
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" ml="xl">
                          Click <strong>"Regenerate"</strong> or{" "}
                          <strong>"Create"</strong> if not visible.{" "}
                          <strong>Important:</strong> Copy this immediately - you
                          won't be able to see it again!
                        </Text>

                        <Divider my="xs" />

                        <Group gap="xs">
                          <IconKey size={16} />
                          <Text size="sm" fw={600}>
                            Access Token & Access Token Secret
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" ml="xl">
                          Scroll to <strong>"Access Token and Secret"</strong>{" "}
                          section. Click <strong>"Generate"</strong> or{" "}
                          <strong>"Regenerate"</strong> if needed. Copy both the
                          Access Token and Access Token Secret. These are
                          generated as a pair.
                        </Text>

                        <Divider my="xs" />

                        <Group gap="xs">
                          <IconKey size={16} />
                          <Text size="sm" fw={600}>
                            Bearer Token
                          </Text>
                        </Group>
                        <Text size="xs" c="dimmed" ml="xl">
                          In the same "Keys and tokens" page, look for{" "}
                          <strong>"Bearer Token"</strong>. Click{" "}
                          <strong>"Regenerate"</strong> or copy the existing one
                          if available. This token starts with "AAAAA..."
                        </Text>
                      </Stack>
                    </Card>
                  </Box>

                  {/* Step 5 */}
                  <Box>
                    <Group gap="xs" mb="xs">
                      <Badge size="lg" variant="filled" color="blue">
                        Step 5
                      </Badge>
                      <Text fw={600} size="sm">
                        Verify Access Level
                      </Text>
                    </Group>
                    <List spacing="xs" size="sm" ml="xl">
                      <List.Item>
                        Check your account's access level in the Developer Portal
                        dashboard
                      </List.Item>
                      <List.Item>
                        For posting tweets, you need at least{" "}
                        <strong>"Elevated"</strong> access
                      </List.Item>
                      <List.Item>
                        If you have "Essential" access, you can upgrade by:
                        <List withPadding spacing="xs" size="sm" mt="xs">
                          <List.Item>
                            Going to the <strong>"Products"</strong> tab
                          </List.Item>
                          <List.Item>
                            Selecting <strong>"Twitter API v2"</strong>
                          </List.Item>
                          <List.Item>
                            Clicking <strong>"Upgrade"</strong> and following the
                            prompts
                          </List.Item>
                          <List.Item>
                            Elevated access is free but requires providing
                            additional use case information
                          </List.Item>
                        </List>
                      </List.Item>
                    </List>
                  </Box>

                  {/* Important Alerts */}
                  <Alert
                    icon={<IconAlertTriangle size={16} />}
                    title="Important Notes"
                    color="yellow"
                    variant="light"
                  >
                    <Stack gap="xs">
                      <Text size="sm">
                        <strong>Access Level:</strong> Make sure your Twitter
                        Developer account has <strong>Elevated access</strong>{" "}
                        or higher to post tweets via the API. Essential access
                        only allows read operations.
                      </Text>
                      <Text size="sm">
                        <strong>Rate Limits:</strong> Elevated access provides
                        10,000 tweets per month and higher rate limits for API
                        requests.
                      </Text>
                      <Text size="sm">
                        <strong>Security:</strong> Keep your keys secure! Never
                        share them publicly or commit them to version control.
                        If compromised, regenerate them immediately.
                      </Text>
                    </Stack>
                  </Alert>

                  <Alert
                    icon={<IconInfoCircle size={16} />}
                    title="Quick Copy Tips"
                    color="blue"
                    variant="light"
                  >
                    <List spacing="xs" size="sm">
                      <List.Item>
                        Use the copy buttons next to each key in the Developer
                        Portal for accurate copying
                      </List.Item>
                      <List.Item>
                        If you accidentally reveal a secret, regenerate it
                        immediately for security
                      </List.Item>
                      <List.Item>
                        You can paste all keys at once using the{" "}
                        <strong>"Import from .env"</strong> button above
                      </List.Item>
                    </List>
                  </Alert>

                  <Box>
                    <Text size="sm" fw={600} mb="xs">
                      Still having trouble?
                    </Text>
                    <Text size="sm" c="dimmed">
                      Check out the{" "}
                      <Anchor
                        href="https://developer.twitter.com/en/docs/tutorials/getting-started-with-the-twitter-api-v2-for-academic-research"
                        target="_blank"
                      >
                        official Twitter API documentation{" "}
                        <IconExternalLink size={12} />
                      </Anchor>{" "}
                      or{" "}
                      <Anchor
                        href="https://developer.twitter.com/en/support"
                        target="_blank"
                      >
                        contact Twitter Developer Support{" "}
                        <IconExternalLink size={12} />
                      </Anchor>
                      .
                    </Text>
                  </Box>
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
                    Credentials are encrypted and stored securely in the database
                  </List.Item>
                  <List.Item>
                    Your credentials persist until you click "Disconnect"
                  </List.Item>
                  <List.Item>
                    You can disconnect at any time to remove all stored
                    credentials and data
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
