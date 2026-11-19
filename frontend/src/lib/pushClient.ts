/**
 * Push Notification & FCM Client Service
 * Coordinates browser Web Push permissions, service worker registration,
 * and device token synchronization with the AutoPatch API.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export interface PushRegistrationResult {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  token?: string;
  error?: string;
}

export class PushClient {
  /**
   * Checks whether Web Push and Service Workers are supported in the client browser.
   */
  static isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "Notification" in window
    );
  }

  /**
   * Gets current browser notification permission state.
   */
  static getPermission(): NotificationPermission | "unsupported" {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission;
  }

  /**
   * Registers the background service worker and requests permission to receive push alerts.
   */
  static async requestAndRegister(): Promise<PushRegistrationResult> {
    if (!this.isSupported()) {
      return { supported: false, permission: "unsupported" };
    }

    try {
      // 1. Register service worker
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");

      // 2. Request user permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { supported: true, permission };
      }

      // 3. Generate or retrieve synthetic web device token for simulated or FCM push
      let deviceToken = localStorage.getItem("autopatch_device_token");
      if (!deviceToken) {
        deviceToken = `web-token-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
        localStorage.setItem("autopatch_device_token", deviceToken);
      }

      // 4. Send token to backend /devices endpoint
      await fetch(`${API_BASE}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: deviceToken,
          platform: "web",
          user_id: "demo-user-001",
        }),
      }).catch((e) => {
        console.warn("AutoPatch API device registration error (falling back to local):", e);
      });

      return {
        supported: true,
        permission: "granted",
        token: deviceToken,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        supported: true,
        permission: Notification.permission,
        error: message,
      };
    }
  }

  /**
   * Dispatches a test alert via backend or browser Notification API.
   */
  static async sendTestAlert(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/notifications/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "AutoPatch Verification Alert",
          body: "Patch Candidate #1 verified V4 Proven in isolated sandbox.",
        }),
      });
      return res.ok;
    } catch {
      // Direct browser fallback if API is not running
      if (this.getPermission() === "granted") {
        new Notification("AutoPatch Verification Alert", {
          body: "Patch Candidate #1 verified V4 Proven in isolated sandbox.",
          icon: "/icons/icon-192x192.png",
        });
        return true;
      }
      return false;
    }
  }
}
