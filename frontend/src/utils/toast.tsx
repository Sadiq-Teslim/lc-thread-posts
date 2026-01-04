import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconInfoCircle,
  IconAlertTriangle,
} from "@tabler/icons-react";

interface ToastOptions {
  title?: string;
  message: string;
  autoClose?: number | false;
}

export const toast = {
  success: ({ title = "Success", message, autoClose = 5000 }: ToastOptions) => {
    notifications.show({
      title,
      message,
      color: "green",
      icon: <IconCheck size={18} />,
      autoClose,
      withBorder: true,
      styles: {
        root: {
          backgroundColor: "var(--mantine-color-green-0)",
        },
      },
    });
  },

  error: ({ title = "Error", message, autoClose = 7000 }: ToastOptions) => {
    notifications.show({
      title,
      message,
      color: "red",
      icon: <IconX size={18} />,
      autoClose,
      withBorder: true,
      styles: {
        root: {
          backgroundColor: "var(--mantine-color-red-0)",
        },
      },
    });
  },

  warning: ({ title = "Warning", message, autoClose = 6000 }: ToastOptions) => {
    notifications.show({
      title,
      message,
      color: "yellow",
      icon: <IconAlertTriangle size={18} />,
      autoClose,
      withBorder: true,
      styles: {
        root: {
          backgroundColor: "var(--mantine-color-yellow-0)",
        },
      },
    });
  },

  info: ({ title = "Info", message, autoClose = 5000 }: ToastOptions) => {
    notifications.show({
      title,
      message,
      color: "blue",
      icon: <IconInfoCircle size={18} />,
      autoClose,
      withBorder: true,
      styles: {
        root: {
          backgroundColor: "var(--mantine-color-blue-0)",
        },
      },
    });
  },

  loading: (message: string) => {
    return notifications.show({
      message,
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });
  },

  update: (
    id: string,
    options: ToastOptions & { type: "success" | "error" }
  ) => {
    notifications.update({
      id,
      title: options.title,
      message: options.message,
      color: options.type === "success" ? "green" : "red",
      icon:
        options.type === "success" ? (
          <IconCheck size={18} />
        ) : (
          <IconX size={18} />
        ),
      loading: false,
      autoClose: 5000,
    });
  },

  dismiss: (id: string) => {
    notifications.hide(id);
  },

  dismissAll: () => {
    notifications.cleanQueue();
  },
};
