"use client";

import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#121722",
          color: "#f4f6fb",
          border: "1px solid #232b3d",
          borderRadius: "0.75rem",
          padding: "16px",
        },
        success: {
          iconTheme: {
            primary: "#ffc700",
            secondary: "#0a0d14",
          },
        },
        error: {
          iconTheme: {
            primary: "#f87171",
            secondary: "#0a0d14",
          },
        },
      }}
    />
  );
}
